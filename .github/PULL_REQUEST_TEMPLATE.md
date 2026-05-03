## What this changes

<!-- One paragraph. The "why," not just the "what." -->

## Related issue

<!-- Closes #N. If there's no issue, explain why this didn't need one. -->

## Risk surface

<!--
  For privacy / fund-flow contracts especially: what's the worst
  thing this change could enable? What states can the contract get
  into now that it couldn't before? If you're not sure, write the
  threat model anyway — getting it wrong on paper is cheap.
-->

## Testing

- [ ] `forge test` passes locally (66+ tests, all green)
- [ ] `nargo test` passes (if circuits changed)
- [ ] `npm run typecheck` passes in frontend / relayer (if touched)
- [ ] New behaviour has a regression test
- [ ] No new compiler warnings

## Documentation

- [ ] NatSpec updated for any changed external function signatures
- [ ] README / DEPLOYMENT / SECURITY updated if user-visible behaviour
      changed
- [ ] Comments added for any non-obvious decision

## Deployment impact

- [ ] No on-chain change (frontend / relayer / docs only)
- [ ] Storage layout preserved on upgradeable contracts (we don't
      have any yet, but flag if that changes)
- [ ] Deploy script (`contracts/script/Deploy.s.sol`) still works
      end-to-end on a local anvil fork
