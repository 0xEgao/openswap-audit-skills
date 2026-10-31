# Commit-driven scenario discovery

The scenario designer's job is to find **new edge cases**, not to rerun the integration suite that CI already executes. On this repository, `.github/workflows/test.yaml` partitions `cargo llvm-cov nextest --lib --bins --tests --features integration-test` across eight jobs; a separate lane runs the ignored Tor cases. The main integration command does **not** enable the optional `lightning` feature: `tests/integration/main.rs` gates that module on `lightning`. If Lightning is in audit scope, record this CI gap and plan feature-enabled focused coverage. Verify the workflow and actual CI result for the audited snapshot rather than assuming it is green. Read `tests/integration/README.md` for the harness and `tests/test_framework/` when a new injection point is needed. First verify that each referenced test path exists at the audited `HEAD`; this document may describe historical branch coverage. Use nextest for focused execution; `cargo test` makes shared-logger assertions unreliable.

## Phase 1 — Map recent commits to invariants

1. Record the exact base/`HEAD` and dirty changes. Inspect `git log <base>..HEAD` and each relevant `git show` as well as the aggregate diff. A large feature commit followed by fixes deserves separate hypotheses: the fixes often name prior failure windows.
2. For each commit, write its intended behavior in one sentence, then mark the changed **external action** (peer message, sign, broadcast, pay, chain read), **durable write**, and **cleanup**. Draw the before/after state transition, not merely a list of changed files.
3. State the invariant at risk. Examples: a live funded version remains discoverable and refundable; no hop spends more fee than authorized; no party reports settled before its output is safe; a rejected message cannot consume a reserve.
4. Identify who can trigger the edge: malicious peer, chain reorg, delayed Electrum indexer, dropped reply, crash, concurrent session, or an honest boundary value. Distinguish adversarial control from unlikely but possible timing.

Use this worksheet, one row per meaningful changed behavior:

| Commit and changed transition | Invariant / affected parties | Nearest test and exact assertions | Unasserted boundary | Candidate scenario | Decision |
| --- | --- | --- | --- | --- | --- |
| SHA + source path | What must remain true? | Test path/name; balance, state, tx, or only log assertion | Specific state/order/value not proved | Setup + injected event + expected result | pursue / duplicate / defer |

## Phase 2 — Inventory coverage before proposing a test

- Read the nearest test **body and helper functions**. Record its protocol, hop, backend, split count, concurrency, injected event, and exact checks. A name such as “reorg recovery” does not prove every version, restart point, or balance was asserted.
- Compare the test's final state with its claim. Prefer assertions about UTXO ownership, spendability or recoverable exits, durable swap state after restart, balances including fees, and terminal status. A log line or error string alone proves only that a branch was visited.
- Check whether the case runs in the main CI lane, is feature-gated, ignored, or only in Tor CI. If CI is failing or unavailable, report that separately; it does not automatically make a duplicate scenario novel.
- Search unit/property tests and tests added in the same commits. A proposed integration test should add a boundary, observable assertion, or cross-module interaction that those tests lack.
- Discard an idea if the nearest test already exercises the same event **and** asserts the same invariant. Record this in the discard list so it does not recur next week.

## Phase 3 — Generate and rank missing cases

For each changed transition, ask four concrete questions:

1. **Ordering:** What if the process stops immediately before or after signing, broadcast, durable save, chain observation, reply, or cleanup? Which side effect can happen without its corresponding state write?
2. **Conflicting observations:** What if original and replacement, maker and taker, or Core and Electrum see different transaction versions? What if a prior conclusion is reversed by reorg or restart?
3. **Boundary values:** What changes at fee/bump budget `0`, exactly the limit, one sat above; one versus multiple splits; first/middle/final hop; locktime or invoice expiry minus/plus one block; one versus two concurrent sessions? Use only dimensions relevant to the diff.
4. **Adversarial data:** Can a peer replay, omit, reorder, or alter the exact field changed by the commit? Does rejection leave reserves, wallet state, and recoverable outputs intact?

Rank candidate cases by possible fund loss/atomicity impact, likelihood of the failure window, novelty versus CI, ability to observe the invariant, and effort to inject. Select **one to three** strong new cases for a change audit; do not fill a quota with weak variants. For a release audit, expand to uncovered P0 invariants and useful protocol/backend combinations. Pairwise combinations are enough unless an interaction itself is the suspected bug.

Each proposed case must include: source commit and changed path; nearest test and what it proves; initial world state; exact fault injection and timing; protocol/hop/backend/split choices and why; expected transaction/UTXO, wallet/tracker, balance/fee, and final-status assertions as applicable; the minimal test framework hook; what faulty behavior would make it fail; cost/dependencies; and whether it is proposed, implemented, run, or blocked. Do not label an unimplemented idea “covered.”

## Phase 4 — Execute only high-value cases

The coordinator commissions a scenario executor only when a specific proposal will resolve a material uncertainty. Use an isolated checkout and disposable `World` or `Node` fixture. Start with the narrow nextest filter for the new or relevant test. Run an existing control only if needed to distinguish a harness failure or establish a baseline. Record exact command, `HEAD`, feature flags, dependency versions, injected timeline, result, and logs. For new cases, add balance/UTXO/state assertions rather than relying only on `assert_log!`. A failing timeout or missing electrs/bitcoind is **blocked**, not a product failure.

## Example: compare a proposed boundary with an existing test

Suppose a branch changes the order of funding broadcast and durable wallet save. First locate the nearest test in the **current checkout** with `rg --files tests/integration` and read its body and helpers. If that test already injects a second-send error and asserts one committed coin, one refund, cleared reservations, and fee-adjusted spendable balance, repeating the same event is not novel. A different interruption **after backend acceptance but before the corresponding save** may be novel only if the existing test does not cross that ordering boundary.

The proposed regression must specify the exact injection point, whether termination is graceful or abrupt, the backend visibility behavior, and the actual outpoint/transaction/balance oracle. If the required test or feature is absent at `HEAD`, record that fact and choose the nearest present evidence. Do not carry a test inventory from another branch forward as if it were current.
