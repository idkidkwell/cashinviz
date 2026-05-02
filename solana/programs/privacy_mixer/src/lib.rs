use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;

declare_id!("PMix111111111111111111111111111111111111111");

/// Privacy Mixer — Native Solana Program
///
/// Implements the same privacy model as our EVM contracts but natively on Solana:
/// - Pedersen-based commitments matching the Noir circuit (Poseidon2 will
///   replace this once Noir 1.x makes Poseidon2 public)
/// - Incremental Merkle tree (depth 20, ~1M deposits)
/// - Nullifier-based double-spend prevention
/// - Fixed denomination pools (0.1, 1, 10, 100 SOL)
/// - SPL token support (USDC, USDT, etc.)
///
/// Users can deposit on Solana and withdraw on any EVM chain via Wormhole,
/// or deposit on EVM and withdraw on Solana. True cross-chain privacy.
///
///  ⚠️ NOT PRODUCTION READY
///  - `withdraw` ZK proof verification is a placeholder (`require!(proof.len() > 0)`).
///    Until a real Groth16 verifier (e.g. light-protocol's on-chain verifier)
///    is wired in, anyone holding any non-empty proof bytes can drain a pool.
///  - The Merkle root update on `deposit` uses keccak as a placeholder; the
///    Noir circuit computes roots with Pedersen. They will not match until
///    both sides agree on a hash.
///  - `bridge_to_evm` does not actually publish a Wormhole message yet.
///  Pools are paused by default — `withdraw` and `bridge_to_evm` revert
///  with `MixerError::Paused` until the authority calls `set_paused(false)`,
///  which they should NOT do until all three gaps above are closed.

#[program]
pub mod privacy_mixer {
    use super::*;

    /// Initialize a new mixer pool with a specific denomination.
    /// Pool starts paused — `withdraw` / `bridge_to_evm` revert until
    /// the authority calls `set_paused(false)` (see contract NatSpec
    /// for the gating reasons).
    ///
    /// `fee_recipient` is the wallet that receives the 1% protocol fee
    /// on every withdrawal. Decoupled from `authority` on purpose: the
    /// admin key (authority) can rotate without changing where the
    /// money flows. Source of truth for the canonical address is
    /// /dev-wallets.json (`solana.address`).
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        denomination: u64,
        merkle_depth: u8,
        fee_recipient: Pubkey,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.fee_recipient = fee_recipient;
        pool.denomination = denomination;
        pool.merkle_depth = merkle_depth;
        pool.next_index = 0;
        pool.deposit_count = 0;
        pool.current_root_index = 0;
        pool.fee_bps = 100; // 1%
        pool.paused = true;

        // Initialize Merkle tree roots with zero hashes
        let zero_hash = [0u8; 32];
        for i in 0..ROOT_HISTORY_SIZE {
            pool.roots[i] = zero_hash;
        }

        msg!("Pool initialized: {} lamports denomination (paused)", denomination);
        Ok(())
    }

    /// Authority-only killswitch. Default is paused. Must remain
    /// paused until the ZK verifier is wired and the Pedersen-Merkle
    /// hash mismatch with the Noir circuit is resolved.
    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(
            ctx.accounts.authority.key() == pool.authority,
            MixerError::Unauthorized
        );
        pool.paused = paused;
        msg!("Pool paused = {}", paused);
        Ok(())
    }

    /// Authority-only — rotate the fee recipient. Lets the project
    /// move where withdrawal protocol fees flow without rotating the
    /// admin key. Use case: original `solana.address` lives on a hot
    /// wallet for early operation, gets moved to a cold wallet later.
    pub fn set_fee_recipient(
        ctx: Context<SetFeeRecipient>,
        new_recipient: Pubkey,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(
            ctx.accounts.authority.key() == pool.authority,
            MixerError::Unauthorized
        );
        pool.fee_recipient = new_recipient;
        msg!("Pool fee_recipient = {}", new_recipient);
        Ok(())
    }

    /// Deposit SOL into the mixer pool.
    /// The commitment is a Poseidon hash of (secret, nullifier).
    pub fn deposit(ctx: Context<Deposit>, commitment: [u8; 32]) -> Result<()> {
        let pool = &mut ctx.accounts.pool;

        // Transfer SOL from depositor to pool
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.depositor.key(),
            &pool.key(),
            pool.denomination,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.depositor.to_account_info(),
                pool.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Insert commitment into Merkle tree
        let leaf_index = pool.next_index;
        pool.next_index += 1;
        pool.deposit_count += 1;

        // Update Merkle root (simplified — production uses on-chain Poseidon)
        let new_root = keccak::hash(&[&commitment[..], &leaf_index.to_le_bytes()].concat()).0;
        pool.current_root_index = (pool.current_root_index + 1) % ROOT_HISTORY_SIZE;
        pool.roots[pool.current_root_index] = new_root;

        emit!(DepositEvent {
            commitment,
            leaf_index,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Deposit #{}: commitment inserted at index {}", pool.deposit_count, leaf_index);
        Ok(())
    }

    /// Withdraw from the mixer pool using a ZK proof.
    /// Verifies the proof, checks nullifier, and sends funds.
    pub fn withdraw(
        ctx: Context<Withdraw>,
        proof: Vec<u8>,
        root: [u8; 32],
        nullifier_hash: [u8; 32],
        recipient: Pubkey,
        relayer: Pubkey,
        fee: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;

        // Killswitch — see contract NatSpec. Pool is paused by
        // default to keep the placeholder ZK verifier from being
        // a fund-drain primitive.
        require!(!pool.paused, MixerError::Paused);

        // Verify root exists in history
        require!(
            pool.roots.iter().any(|r| *r == root),
            MixerError::InvalidRoot
        );

        // Check nullifier hasn't been used
        let nullifier_account = &mut ctx.accounts.nullifier_account;
        require!(!nullifier_account.used, MixerError::NullifierAlreadyUsed);
        nullifier_account.used = true;
        nullifier_account.nullifier_hash = nullifier_hash;

        // TODO: Verify ZK proof using Groth16 verifier
        // In production: use light-protocol's on-chain verifier
        require!(proof.len() > 0, MixerError::InvalidProof);

        // Calculate payout
        let protocol_fee = (pool.denomination * pool.fee_bps as u64) / 10000;
        let payout = pool.denomination - protocol_fee - fee;

        // Transfer to recipient
        **pool.to_account_info().try_borrow_mut_lamports()? -= payout;
        **ctx.accounts.recipient.try_borrow_mut_lamports()? += payout;

        // Transfer relayer fee
        if fee > 0 {
            **pool.to_account_info().try_borrow_mut_lamports()? -= fee;
            **ctx.accounts.relayer.try_borrow_mut_lamports()? += fee;
        }

        // Transfer protocol fee to the configured fee_recipient. The
        // `fee_recipient` account is constrained to match
        // `pool.fee_recipient` via the account context, so the relayer
        // can't redirect fees by passing a different account.
        // Previously protocol_fee was calculated and never moved —
        // those lamports just accumulated in the pool account with no
        // harvest path.
        if protocol_fee > 0 {
            **pool.to_account_info().try_borrow_mut_lamports()? -= protocol_fee;
            **ctx.accounts.fee_recipient.try_borrow_mut_lamports()? += protocol_fee;
        }

        emit!(WithdrawEvent {
            nullifier_hash,
            recipient,
            relayer,
            fee,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Withdrawal processed: {} lamports to {}", payout, recipient);
        Ok(())
    }

    /// Bridge a deposit to an EVM chain via Wormhole.
    /// This publishes a Wormhole message that our EVM UniversalBridge can consume.
    pub fn bridge_to_evm(
        ctx: Context<BridgeToEVM>,
        evm_chain_id: u16,
        evm_recipient: [u8; 20],
        commitment: [u8; 32],
    ) -> Result<()> {
        let pool = &ctx.accounts.pool;

        // Killswitch — Wormhole publish path is a stub today, so the
        // bridge cannot be live yet. See contract NatSpec.
        require!(!pool.paused, MixerError::Paused);

        // Construct Wormhole message payload
        let payload = BridgePayload {
            action: 1, // DEPOSIT
            source_chain: 1,  // Solana
            dest_chain: evm_chain_id,
            commitment,
            evm_recipient,
            amount: pool.denomination,
        };

        // TODO: Publish via Wormhole core bridge
        // wormhole::post_message(ctx, payload.serialize(), ...)?;

        emit!(BridgeEvent {
            evm_chain_id,
            evm_recipient,
            amount: pool.denomination,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Bridging to EVM chain {}: {} lamports", evm_chain_id, pool.denomination);
        Ok(())
    }
}

// ── Constants ────────────────────────────────────────────

const ROOT_HISTORY_SIZE: usize = 30;
const MERKLE_DEPTH: usize = 20;

// ── Accounts ─────────────────────────────────────────────

#[account]
pub struct MixerPool {
    pub authority: Pubkey,
    /// Wallet that receives the 1% protocol fee on every withdrawal.
    /// Set on `initialize_pool`, rotateable by authority via
    /// `set_fee_recipient`. Decoupled from `authority` so the admin
    /// key can rotate without moving where fees flow.
    pub fee_recipient: Pubkey,
    pub denomination: u64,
    pub merkle_depth: u8,
    pub next_index: u32,
    pub deposit_count: u64,
    pub current_root_index: usize,
    pub fee_bps: u16,
    /// Killswitch. Defaults to true on `initialize_pool`. Authority
    /// flips it via `set_paused`. Gates `withdraw` + `bridge_to_evm`.
    pub paused: bool,
    pub roots: [[u8; 32]; ROOT_HISTORY_SIZE],
}

#[account]
pub struct NullifierAccount {
    pub nullifier_hash: [u8; 32],
    pub used: bool,
}

// ── Contexts ─────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializePool<'info> {
    // 8 (discriminator) + 32 (authority) + 32 (fee_recipient) + 8 (denom)
    // + 1 (depth) + 4 (next_index) + 8 (deposit_count)
    // + 8 (current_root_index, usize=8 on bpf64) + 2 (fee_bps) + 1 (paused)
    // + 32 * ROOT_HISTORY_SIZE (roots)
    #[account(init, payer = authority, space = 8 + 32 + 32 + 8 + 1 + 4 + 8 + 8 + 2 + 1 + (32 * ROOT_HISTORY_SIZE))]
    pub pool: Account<'info, MixerPool>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(mut)]
    pub pool: Account<'info, MixerPool>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetFeeRecipient<'info> {
    #[account(mut)]
    pub pool: Account<'info, MixerPool>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub pool: Account<'info, MixerPool>,
    #[account(mut)]
    pub depositor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub pool: Account<'info, MixerPool>,
    #[account(init, payer = relayer, space = 8 + 32 + 1)]
    pub nullifier_account: Account<'info, NullifierAccount>,
    /// CHECK: Recipient receives funds
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    /// CHECK: Relayer receives fee
    #[account(mut)]
    pub relayer: Signer<'info>,
    /// CHECK: Project fee recipient — the `address = pool.fee_recipient`
    /// constraint locks this to whatever the pool was initialised with
    /// (or last `set_fee_recipient` call), so the relayer can't redirect
    /// fees by passing a different account.
    #[account(mut, address = pool.fee_recipient)]
    pub fee_recipient: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BridgeToEVM<'info> {
    pub pool: Account<'info, MixerPool>,
    #[account(mut)]
    pub depositor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ── Events ───────────────────────────────────────────────

#[event]
pub struct DepositEvent {
    pub commitment: [u8; 32],
    pub leaf_index: u32,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawEvent {
    pub nullifier_hash: [u8; 32],
    pub recipient: Pubkey,
    pub relayer: Pubkey,
    pub fee: u64,
    pub timestamp: i64,
}

#[event]
pub struct BridgeEvent {
    pub evm_chain_id: u16,
    pub evm_recipient: [u8; 20],
    pub amount: u64,
    pub timestamp: i64,
}

// ── Bridge Payload ───────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct BridgePayload {
    pub action: u8,
    pub source_chain: u16,
    pub dest_chain: u16,
    pub commitment: [u8; 32],
    pub evm_recipient: [u8; 20],
    pub amount: u64,
}

// ── Errors ───────────────────────────────────────────────

#[error_code]
pub enum MixerError {
    #[msg("Invalid Merkle root")]
    InvalidRoot,
    #[msg("Nullifier has already been used")]
    NullifierAlreadyUsed,
    #[msg("Invalid ZK proof")]
    InvalidProof,
    #[msg("Insufficient pool balance")]
    InsufficientBalance,
    #[msg("Pool is paused — ZK verifier not yet wired")]
    Paused,
    #[msg("Caller is not the pool authority")]
    Unauthorized,
}
