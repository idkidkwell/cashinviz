"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { encodePacked, keccak256 } from "viem";
import { MixerABI } from "@/abi/Mixer";
import { getTokensForChain, getNativeToken, getDenominationsForToken, type TokenInfo } from "@/lib/tokens";
import { TokenSelector } from "@/components/TokenSelector";
import { createDepositNote, serializeNote, type DepositNote } from "@/lib/proof";
import { saveNote, encryptNote, type StoredNote } from "@/lib/encryption";

// Map network picker IDs to wagmi chain IDs
const NETWORK_TO_CHAIN_ID: Record<string, number> = {
  ethereum: 1, arbitrum: 42161, optimism: 10, base: 8453,
  polygon: 137, bsc: 56, avalanche: 43114, gnosis: 100, linea: 59144,
};

export function DepositPanel({ selectedNetwork }: { selectedNetwork?: string }) {
  const { address, isConnected, chain } = useAccount();

  // Use the network switcher's chain if set, otherwise fall back to wallet's chain
  const effectiveChainId = selectedNetwork
    ? NETWORK_TO_CHAIN_ID[selectedNetwork] ?? chain?.id
    : chain?.id;

  const tokens = getTokensForChain(effectiveChainId);
  const [selectedToken, setSelectedToken] = useState<TokenInfo>(getNativeToken(effectiveChainId));
  const [selectedDenom, setSelectedDenom] = useState(1);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveLocally, setSaveLocally] = useState(true);

  // Reset token + denomination when chain changes (from wallet or network picker)
  const prevChainId = useRef(effectiveChainId);
  useEffect(() => {
    if (effectiveChainId && effectiveChainId !== prevChainId.current) {
      setSelectedToken(getNativeToken(effectiveChainId));
      setSelectedDenom(1);
      setNote(null);
      prevChainId.current = effectiveChainId;
    }
  }, [effectiveChainId]);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const denominations = getDenominationsForToken(selectedToken);
  const denomination = denominations[selectedDenom] ?? denominations[0];

  // Reset denomination index when token changes
  function handleTokenChange(token: TokenInfo) {
    setSelectedToken(token);
    setSelectedDenom(0);
  }

  async function handleDeposit() {
    if (!isConnected || !chain) return;

    const { secret, nullifier } = createDepositNote(
      denomination.value.toString(),
      chain.id
    );

    // TODO: Use actual Poseidon2 hash matching the Noir circuit
    const commitment = keccak256(
      encodePacked(["uint256", "uint256"], [secret, nullifier])
    );

    writeContract({
      // TODO: Replace with actual deployed mixer address
      address: "0x0000000000000000000000000000000000000000",
      abi: MixerABI,
      functionName: "deposit",
      args: [commitment as `0x${string}`],
      value: selectedToken.isNative ? denomination.value : BigInt(0),
    });

    const depositNote: DepositNote = {
      secret,
      nullifier,
      commitment,
      leafIndex: 0, // TODO: Read from Deposit event
      denomination: denomination.value.toString(),
      chainId: chain.id,
      timestamp: Date.now(),
    };

    const noteString = serializeNote(depositNote);
    setNote(noteString);

    // Save encrypted note to localStorage
    if (saveLocally) {
      const stored: StoredNote = {
        id: crypto.randomUUID(),
        encryptedData: noteString, // TODO: encrypt with password
        chainId: chain.id,
        token: selectedToken.symbol,
        amount: (Number(denomination.value) / 10 ** selectedToken.decimals).toString(),
        timestamp: Date.now(),
        isSpent: false,
      };
      saveNote(stored);
    }
  }

  function copyNote() {
    if (note) {
      navigator.clipboard.writeText(note);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-5">
      {/* Token selector */}
      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-2">Token</label>
        <TokenSelector
          tokens={tokens}
          selected={selectedToken}
          onSelect={handleTokenChange}
        />
      </div>

      {/* Denomination selector */}
      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-2">Amount</label>
        <div className="grid grid-cols-4 gap-2">
          {denominations.map((d, i) => (
            <button
              key={d.label}
              onClick={() => setSelectedDenom(i)}
              className={`py-3 rounded-lg text-sm font-medium transition-all ${
                selectedDenom === i
                  ? "bg-[#6366f1] text-white"
                  : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[#6366f1]/50"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-[var(--bg)] rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>You deposit</span>
          <span className="text-white font-medium">{denomination.label}</span>
        </div>
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>Protocol fee (on withdraw)</span>
          <span>1%</span>
        </div>
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>You receive (on withdraw)</span>
          <span className="text-emerald-400 font-medium">
            {(
              (Number(denomination.value) * 0.99) /
              10 ** selectedToken.decimals
            ).toFixed(selectedToken.decimals <= 6 ? 2 : 3)}{" "}
            {selectedToken.symbol}
          </span>
        </div>
        {!selectedToken.isNative && (
          <div className="flex justify-between text-[var(--text-secondary)]">
            <span>Requires approval</span>
            <span className="text-amber-400 text-xs">ERC-20</span>
          </div>
        )}
      </div>

      {/* Save locally toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-primary)]">Save note locally</p>
          <p className="text-xs text-[var(--text-muted)]">Encrypted in your browser</p>
        </div>
        <button
          onClick={() => setSaveLocally(!saveLocally)}
          className={`w-12 h-6 rounded-full transition-colors ${
            saveLocally ? "bg-[#6366f1]" : "bg-[var(--bg-elevated)]"
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${
              saveLocally ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Deposit button */}
      {!isConnected ? (
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button
              onClick={openConnectModal}
              className="btn-primary w-full py-3.5 text-[14px] font-semibold"
            >
              Connect wallet to deposit
            </button>
          )}
        </ConnectButton.Custom>
      ) : (
        <button
          onClick={handleDeposit}
          disabled={isPending || isConfirming}
          className="btn-primary w-full py-3.5 text-[14px] font-semibold"
        >
          {isPending
            ? "Confirm in wallet…"
            : isConfirming
            ? "Confirming on-chain…"
            : `Deposit ${denomination.label}`}
        </button>
      )}

      {/* Note display */}
      {note && (
        <div className="bg-[var(--bg)] border border-emerald-400/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-sm font-medium text-emerald-400">
              Save this note — it&apos;s your only way to withdraw
            </p>
          </div>
          <div className="bg-black/30 rounded p-3 font-mono text-xs break-all text-[var(--text-primary)]">
            {note}
          </div>
          <button
            onClick={copyNote}
            className="w-full py-2 rounded-lg text-sm border border-[var(--border)] hover:border-[#6366f1]/50 transition-colors"
          >
            {copied ? "Copied!" : "Copy Note"}
          </button>
          {saveLocally && (
            <p className="text-xs text-emerald-400">
              Note saved to your browser. Find it in the Notes tab.
            </p>
          )}
          <p className="text-xs text-mixer-red">
            WARNING: If you lose this note and clear your browser data, your
            funds are gone forever. Back it up somewhere safe.
          </p>
        </div>
      )}
    </div>
  );
}
