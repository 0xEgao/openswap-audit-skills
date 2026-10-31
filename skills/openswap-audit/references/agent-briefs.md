# Specialist agent briefs

These are reusable assignments, not a request to launch every agent on every change. Every assigned role must meet the [audit depth contract](audit-depth.md) or return an explicitly partial report. The coordinator selects roles from the [routing map](module-priorities.md), gives each worker an exact question, and requires the [report format](finding-format.md). Paths are starting points, not a limit on following a call chain. Verify that named source and test paths exist at the captured `HEAD`; use the nearest current test when an older example has moved or disappeared. Each worker is read-only during an audit unless assigned a separate implementation task.

## Common assignment envelope

Send every worker: Git root and `HEAD`; base and merge-base SHA; committed and dirty diff; enabled protocol/chain/Lightning features; relevant recent commit messages; chosen invariant and threat actor or failure event; primary paths; related tests; depth limit; and requested artifact. Ask it to distinguish **read**, **tested**, **inferred**, and **not examined**. It must inspect the nearest tests and their assertions, cite current source lines, and report the strongest actionable claims plus explicit gaps. A passing test or quick scan does not make a module safe.

For a candidate bug, require starting state, who controls the input or timing, ordered state/message/transaction trace, exact point of invariant violation, fund or privacy impact, an alternative path that might prevent it, and a minimal reproduction or precise proposed test. Report hypotheses as hypotheses.

## A. Audit coordinator and evidence integrator

**Purpose:** Define the review boundary, allocate effort, join cross-module evidence, and own the final confidence labels. Keep this role in one process even when specialists run concurrently.

**Read:** recent commits, aggregate and dirty diff, CI workflow/status, protocol specification, relevant feature/configuration, specialist reports, and the coverage ledger. No exclusive source directory.

**Tasks:** Convert changed code into invariant questions before dispatch. Assign one primary specialist per question and a complementary reviewer where a boundary crosses modules. Integrate the scenario designer's comparison against existing tests and commission execution only for novel, high-value cases. Reopen source at the captured SHA to validate citations. Challenge serious candidates and ask whether a caller check or recovery path defeats them. Carry unresolved hypotheses and unreviewed cells into the next audit.

**Return:** audit snapshot, assignment/coverage table, verified findings, rejected claims with reason, scenario outcomes, and next priorities.

**Depth gate:** Check that every in-scope P0 lane has an entry-to-funded-output-to-exit trace, inspect representative hostile or failed transitions, and refuse a blanket security conclusion when a branch remains untraced. Reconcile worker reports against the [exit gate](audit-depth.md#6-exit-gate-for-the-coordinator).

## B. Contract, signature, and protocol auditor

**Primary paths:** `src/protocol/{contract,contract2,musig2,musig_interface,legacy_messages,taproot_messages,common_messages,features}.rs`; `src/{maker,taker}/{legacy,taproot}_verification.rs`. Follow signing calls into wallet, maker, and taker code.

**Purpose:** Establish that each funded output has intended cooperative and unilateral spend paths, and that peers cannot change the transaction, amount, script, role, nonce, or locktime after funds are committed.

**Questions:** Are prevouts and amounts bound to signatures? Are aggregate keys/nonces and SIGHASH modes constrained on every path? Is a contract accepted only after all counterparties and hop roles are checked? Do Legacy and Taproot enforce equivalent safety properties where relevant? Can a malformed or replayed message advance state before validation? Are refund and hashlock paths valid near timelock boundaries? Can bad signatures trigger unsafe cleanup?

**Evidence and output:** Read `tests/integration/rejection/{contract_response,funding_proof,replay}.rs`, `recovery/`, and `swap/{standard,taproot,mixed_protocol}.rs`; inspect exact assertions, especially whether rejection proves funds remain controlled. Return a map from funded outputs to exits, validation checkpoints before broadcast, protocol differences, candidate violations, and missing adversarial assertions.

**Depth gate:** Trace the exact validated bytes through signing, persistence, and eventual witness construction for both cooperative and unilateral exits. List the funded outputs whose spend paths were actually checked, and explicitly separate Legacy from Taproot and untested nonce/session lifecycles.

## C. Taker swap state and route auditor

**Primary paths:** `src/taker/{api,legacy_swap,taproot_swap,background_services,offers,payment,funding_bump}.rs` and related verification. Taker swap state is held in `src/taker/api.rs` and wallet coins; follow it into maker messages and wallet persistence.

**Purpose:** Check route selection, funding of each hop, state advancement, retry, abort, and recovery when a maker or chain observation deviates.

**Questions:** Can the taker pay or reveal a secret before it has a recoverable incoming position? Do hop index and direction checks survive replacement or a spare maker? Does restart resume correctly instead of replaying payment or releasing a reservation? What happens if a maker drops after signatures, after funding, or after broadcast acceptance with no reply? Are fee budgets and deadlines enforced across retries and splits? Does final-hop handling preserve every still-spendable version?

**Evidence and output:** Read `tests/integration/swap/{multi_maker,spare_maker,concurrent_takers,funding_bump,mixed_protocol}.rs`, `restart/`, `recovery/`, and `rejection/`. Return an affected-state transition table (entry condition, persisted write, external action, retry/recovery exit), route-specific findings, and untested transitions.

**Depth gate:** Follow at least one first/middle/final-hop or split-specific irreversible transition from route choice through funding and terminal state, plus one malicious-maker or crash/retry path. Record omitted hop and backend combinations.

## D. Maker admission, message, and state auditor

**Primary paths:** `src/maker/{server,api,handlers,legacy_handlers,taproot_handlers,funding_bump}.rs`, maker verification, and relevant protocol message types. Maker swap state is held in `src/maker/api.rs`; follow its wallet and persisted tracker calls.

**Purpose:** Check whether a hostile or buggy taker can acquire maker liquidity, make the maker sign unsafe data, confuse concurrent swaps, or leave funded maker coins without recovery.

**Questions:** Which data are trusted at each message boundary? Are amount, fee, confirmation, contract, and signature conditions checked before reservation, signing, or broadcast? Are timeout and cleanup safe at every disconnect point? Can sessions reserve the same UTXO, reuse swap IDs, or replay old messages? Are replacement versions recognized after restart? Does a refusal or bad signature pass through safe cleanup?

**Evidence and output:** Read `tests/integration/rejection/{admission,fees,funding_proof,contract_response,replay}.rs`, `swap/` tests for multi-taker and concurrency when present; discover funding-replacement tests in the current checkout, and `restart/`. Return a trust-boundary and reservation/state table, concrete adversarial traces, and missing rejection assertions.

**Depth gate:** Build an admission-to-reservation-to-sign/broadcast-to-cleanup trace for hostile input and for two overlapping sessions. Verify where swap identity and coin reservation are checked before each external effect; list protocol and disconnect windows not traced.

## E. Wallet, accounting, and durable-state auditor

**Primary paths:** `src/wallet/{api,swapcoin,storage,funding,spend,backup,seed,report}.rs`, `src/atomic_file.rs`, and wallet-facing maker/taker tracker calls. Include `src/wallet/ffi.rs` or CLI/RPC when changed.

**Purpose:** Check that live funds remain discoverable and spendable after interrupted writes, restarts, replacements, and settlement, and that balances and fees match real transactions.

**Questions:** What is the durable write order relative to signing and broadcast? Can a crash leave a funded output absent from wallet or tracker? Are old/replacement outpoints retained until no longer recoverable, then retired exactly once? Can rescans and backup restore detect all live swaps? Are confirmed, unconfirmed, reserved, contract, and regular balances classified without double counting? Can fee deductions exceed budget or charge the wrong party/split? Are keys and wallet secrets protected in logs and errors?

**Evidence and output:** Read `tests/integration/wallet/{backup,broadcast_idempotency,utxo_behavior,list_transactions}.rs`, any current funding-replacement tests found with `rg --files tests/integration`, plus `restart/` and `recovery/`. Return a ledger of money/state transitions, crash windows around external effects, accounting assertions present/missing, and candidate defects.

**Depth gate:** Pair each external effect with its durable write and rollback behavior. Identify every live outpoint and key/transaction material needed after restart, then trace at least one post-save failure or reorg through the actual accounting and spendability checks.

## F. Chain observation, watchtower, and recovery auditor

**Primary paths:** `src/wallet/blockchain/{mod,corerpc,electrum}.rs`, `src/watch_tower/{watcher,service,registry_storage,utils}.rs`, maker/taker recovery and background services. Include `src/watch_tower/nostr.rs` if relay transport matters.

**Purpose:** Check that changing chain views and missed notifications do not cause false finality, missed contract spends, stale watches, or lost unilateral exits.

**Questions:** What is treated as mempool, confirmed, replaced, conflicted, or reorged? Can Core and Electrum visibility differences cause an unsafe transition? Does watch registration survive crash before/after broadcast? Can a watcher catch up from chain history after downtime? Are refunds/claims rebroadcast safely and idempotently? How do locktime and fee bump decisions change near deadlines? Can cleanup delete a still-live watch or transaction version?

**Evidence and output:** Read `tests/integration/restart/{watchtower_liveness,reboot,taker_restart}.rs`, `recovery/{electrum,refund_fee_bump,contract_breach}.rs`, `wallet/electrum_transport.rs`, and any current funding-replacement tests found with `rg --files tests/integration`. Return a chain-event timeline (including restart/reorg), recoverable exits for each version, backend distinctions, and uncovered observation windows.

**Depth gate:** Compare Core and Electrum behavior for at least one relevant event, and trace restart plus one missed-notification, transient-query, replacement, or reorg path to a concrete recoverable exit. State which backend and timeline cells remain unreviewed.

## G. Offer, fidelity, network, and privacy auditor

**Primary paths:** `src/taker/offers.rs`, `src/maker/nostr.rs`, `src/wallet/{fidelity,deniability}.rs`, `src/watch_tower/nostr.rs`, and affected maker/taker network handling.

**Purpose:** Assess whether adversarial offers, stale chain data, and transport failures can misroute funds, misprice swaps, degrade availability, or reveal route/identity information.

**Questions:** Are offers and bond evidence tied to the right chain state and maker identity? Can stale/replayed offers bypass expiry or limits? Can relay disagreement cause unsafe route choice? What information appears in logs or repeated retries? Do bans and resource bounds stop one peer exhausting maker capacity? Does Tor transport alter a fund-safety assumption?

**Evidence and output:** Read `tests/integration/{offerbook,fidelity,rejection}/` and Tor cases in `tests/integration/README.md`. Return validated/unvalidated offer fields, attack preconditions, privacy/availability impact, and test gaps. Escalate fund movement or stranding to a P0 reviewer.

**Depth gate:** Identify the observer and data that can be linked, and trace a stale/forged offer or denial-of-service path into route/admission decisions. If the path can strand funds, hand the exact boundary to C/D/E instead of containing it as a privacy-only observation.

## H. Lightning atomicity auditor (when enabled or changed)

**Primary paths:** `src/lightning/`, `src/maker/lightning_handlers.rs`, `src/taker/lightning_swap.rs`, `src/protocol/lightning_messages.rs`, and on-chain wallet/recovery calls.

**Purpose:** Check that payment and chain legs cannot settle inconsistently and that timeouts, invoice rules, and restarts preserve recovery.

**Questions:** Are invoice amount, expiry, and payment hash bound to the expected swap? What if payment succeeds but the chain leg or acknowledgement fails? Can restart duplicate payment or lose a preimage/claim path? Are liquidity and route limits enforced before irreversible actions? Are deadlines ordered so neither party is trapped?

**Evidence and output:** Read `tests/integration/lightning/` and applicable swap/recovery tests. Return a payment/chain state diagram for touched paths, irreversible action order, failure windows, and missing assertions.

**Depth gate:** Draw the invoice/payment/on-chain state table through success, timeout, restart, and missing acknowledgement. Identify the first irreversible action on each side and the persisted evidence that permits recovery; mark feature-gated or unrun tests explicitly.

## I. Code-quality and reliability auditor

**Primary paths:** all changed implementation, CLI/RPC/FFI, and tests; choose a bounded set around highest-risk changes. Remain independent from module security reviewers.

**Purpose:** Find concrete defects made likely by code structure and test design, including defects that hide security issues. Avoid style-only comments.

**Questions:** Do untrusted parse errors or chain failures become panics, silent defaults, or ignored results? Do changed dependencies, build scripts, `unsafe`/FFI calls, or local RPC authentication change an attack surface? Are locks held across blocking I/O or acquired in inconsistent order? Do duplicated Legacy/Taproot branches diverge unexpectedly? Are state names/comments inconsistent with real transitions? Are retries bounded and idempotent? Are secrets or route details logged? Does a test assert only a log line when funds/state are its claimed property? Does a mock omit the failure boundary it claims to test?

**Return:** path/line, failure mode, plausible trigger, and smallest remediation for each actionable issue; separate correctness bugs from maintainability risks and avoid duplicates of specialist fund-safety findings.

**Depth gate:** Search for consequential error, concurrency, panic, and test-oracle failures in the chosen paths. For each claim, give a real trigger and the caller-visible consequence; style-only observations and speculative `unwrap` lists do not satisfy the assignment.

## J. Scenario gap designer

**Inputs:** recent commits and diff, CI configuration/results, `tests/integration/` and test framework, relevant source paths. Follow [scenario selection](scenario-selection.md).

**Purpose:** Find valuable *missing* end-to-end edge cases caused by recent changes. Existing ITs run in CI; invest in test inventory and new hypotheses instead of routine reruns.

**Questions:** Which new transition can fail between persisted/external actions? What nearby test exists and what does it actually assert? Which dimension, ordering, or boundary remains untested? Would the proposed test meaningfully distinguish the current behavior from a faulty implementation? What fault-injection hook and fund/state assertion are needed?

**Return:** ranked commit → invariant → nearest test/assertion → uncovered boundary → proposed scenario table; 1–3 executable briefs; duplicate/low-value discard list; injection limitations. A proposal is not a passing test.

**Depth gate:** For each ranked case, cite the nearest present test and exact assertions, name the unproved matrix cell, and specify an oracle that would fail on the suspected defect. Give A a decision-ready brief and a discard list; never call an unrun proposal covered.

## K. Scenario executor and reproducer

**Activate only after:** the coordinator chooses a specific novel scenario or serious candidate. Use an isolated checkout and disposable regtest world; never share a running node between agents.

**Purpose:** Turn one scenario brief into evidence. Reuse the harness; add a narrow fault-injection hook or regression test only when needed and within the audit's authorized scope. Follow `tests/integration/README.md` and nextest filters.

**Return:** exact commit, command, dependencies, injected event, timeline, expected and actual transaction/state/balance assertions, reproducible pass/fail/blocked result, artifacts, and protocol/backend limits. Distinguish harness/timeout failure from product behavior. Run the nearest existing test only if it is a useful control; do not run the whole CI suite as the task.

**Depth gate:** Preserve a self-contained patch, exact test command, source SHA, actual transaction/state/balance evidence, and limitations. If compilation or harness setup fails, report blocked; if a race makes the injection ambiguous, fix synchronization before drawing a product conclusion.

## L. Independent finding challenger

**Activate for:** critical/high claims, conflicting specialist reports, or a surprising passing scenario. Give the claim and snapshot, preferably without the original reviewer's full conclusion.

**Purpose:** Falsify the candidate before it becomes confirmed.

**Tasks and output:** Look for upstream validation, downstream recovery, chain behavior, or test setup that invalidates the trace. Check cited lines and try the smallest adversarial reproduction when feasible. Return upheld, narrowed, unproven, or rejected, with independent evidence and the remaining experiment that would settle it. The coordinator decides final status.

**Depth gate:** Independently reconstruct the attacker/event trace and inspect at least one concrete defense or recovery path that could defeat it. State whether the code defect, user impact, and severity are each upheld or still unproven. Agreement with the original reviewer is not independent evidence.
