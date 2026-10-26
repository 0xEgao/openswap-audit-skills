# Module priorities and agent routing

Prioritize possible loss of funds, broken atomicity, or lost recovery, then privacy/availability and the size of the current change. “P0” names the invariant's impact, not a fixed claim that every listed line needs a separate agent. The [agent briefs](agent-briefs.md) define each worker's task. Follow the state across modules: the source directory where a bug starts may differ from the place where funds are stranded.

| Priority | Changed path or behavior | Primary specialist | Complementary specialist and critical boundary |
| --- | --- | --- | --- |
| P0 | `src/protocol/{contract,contract2,musig2,musig_interface,legacy_messages,taproot_messages}.rs`; maker/taker verification | B. Contract/signature | C or D for the party that consumes the message; E for actual spendability. Check amount, script, prevout, nonce, SIGHASH, role, locktime, and preimage before funds move. |
| P0 | `src/taker/{api,legacy_swap,taproot_swap,background_services}.rs` | C. Taker state/route | E for durable outgoing/incoming coins; F for recovery. Check hop ordering, irreversible actions, retry, timeout, and final-hop cleanup. |
| P0 | `src/maker/{api,server,handlers,legacy_handlers,taproot_handlers}.rs` | D. Maker admission/state | B for signed data; E for reservation/persistence. Check peer validation before sign/broadcast and concurrent-session isolation. |
| P0 | `src/wallet/{api,swapcoin,storage,funding,spend}.rs`, `src/atomic_file.rs` | E. Wallet/accounting | F for chain visibility; C/D for caller state. Check write-before-broadcast ordering, live outpoint retention, fee/balance accounting, and restore. |
| P0 | `src/watch_tower/`, `src/wallet/blockchain/`, taker background recovery | F. Chain/watchtower | E for durable watches and spendability; C/D for terminal state. Check reorg, backend lag, restart catch-up, and idempotent refund/claim. |
| P0 when touched | `src/{maker,taker,protocol}/funding_bump.rs`, replacement or fee policy in wallet | E and F together | C/D for both peers' negotiation. Check original/replacement ownership, budget, deadline, chain winner, and terminal cleanup across hops. |
| P0 when enabled | `src/lightning/`, `src/{maker,taker}/lightning_*`, `src/protocol/lightning_messages.rs` | H. Lightning atomicity | E and F for on-chain leg. Check invoice/payment binding and crash windows before/after irreversible payment. |
| P1, elevate if funds affected | `src/taker/offers.rs`, `src/maker/nostr.rs`, `src/wallet/fidelity.rs`, `src/wallet/deniability.rs`, network/relay paths | G. Offer/fidelity/privacy | C/D for selected route and maker admission. Check stale offer/bond state, identity/privacy, denial of service, and route safety. |
| P1, elevate if recovery affected | `src/wallet/{seed,backup,ffi}.rs`, `src/security.rs`, CLI/RPC access to wallet | E. Wallet/durable state | F if a live swap must be rediscovered. Check key access, backup completeness, secret logging, and restore. |
| Every change audit | Changed code and adjacent tests | I. Code-quality/reliability | Relevant money-safety specialist. Look for error-path, concurrency, resource, duplicated-branch, and assertion-quality defects. |
| Every change audit | Recent commits and `tests/integration/` | J. Scenario gap designer | K. Executor only for a chosen novel case. Compare CI's exact existing assertions with changed transitions. |

## Dispatch rules

1. Read `git diff --name-status <base>...HEAD`, unstaged/staged diff, and untracked paths. Read commits individually. Record exact SHAs and changed features. A tests-only diff may expose an unreviewed invariant; a docs-only diff does not automatically require regtest.
2. Build a boundary graph per change: source → validation → signed/broadcast/payment action → durable wallet/tracker state → chain observation → recovery/cleanup. Assign reviewers to the **weakest boundary** and its other side, not every file in the graph.
3. Shared protocol changes bring both Legacy and Taproot into scope unless the changed path is demonstrably version-specific. Chain-query changes bring Core and Electrum into scope. Funding replacement brings original and replacement versions, taker/maker, and wallet/recovery into scope. Explain any narrowed dimension.
4. Rank work: newly changed P0 money path first; untouched P0 assumptions it depends on second; affected P1 paths third; rotating baseline gaps after the diff. A changed P1 file may outrank an untouched P0 file, but still review any P0 invariant it can violate.
5. Give each worker a bounded question and required artifact from `agent-briefs.md`. Code quality and scenario design remain distinct even when they read the same source. The coordinator integrates cross-boundary claims; no one should infer whole-system coverage from a directory review.

## Cadence and completion

- **Every substantial PR/branch:** inspect recent commits, route affected specialists, do an independent code-quality pass, and produce 1–3 novel scenario briefs. Execute a new case when its expected information justifies the cost.
- **Periodic baseline rotation:** choose the highest-risk P0 invariant least recently examined, then rotate through remaining lanes and old unresolved hypotheses. Review changed assumptions even when source files are quiet.
- **Before a security-sensitive release:** cover B–F and every enabled money-moving feature including H when deployed; review G and wallet key/restore paths; close or explicitly carry every high-impact gap. Full coverage means documented invariants and failure boundaries, not “all files read.”
