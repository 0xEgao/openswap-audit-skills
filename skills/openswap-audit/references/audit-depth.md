# Audit depth and completion contract

Use this contract before calling a run complete. A fast review can still find a real bug, but elapsed time, number of agents, number of files opened, and a green CI badge are not measures of security coverage. The final report must say what was examined, what was executed, and what remains unreviewed.

## 1. Choose and name the scope

| Mode | Selection | Honest result label |
| --- | --- | --- |
| Change | Merge-base-to-`HEAD` commits plus staged, unstaged, and untracked source; follow dependent invariants outside the diff | Change audit of the stated commit range |
| Baseline | Explicit `--baseline`; B/E/F/I/J sample of untouched P0 behavior | Bounded baseline sample, never a whole-system audit |
| Release | Explicit `--release`; all applicable B–G lanes, H when the module exists, plus I/J and cross-boundary follow-ups | Release-scope review with an evidence ledger; incomplete lanes remain visible |

`--base=origin/master` on a clean `master` checkout compares `HEAD` with itself. It yields zero commits. To review recent merged commits, name a historical base such as `--base=HEAD~1` for the latest commit; to review a fork against upstream, choose the appropriate fetched upstream ref. Verify the actual base SHA and commit list before interpreting results. A range is not “latest commit only” unless the chosen base is the parent of `HEAD`. The dispatcher refuses an implicit zero-diff baseline; use `--baseline` or `--release` intentionally. It also refuses ranges over 20 commits because the worker snapshot lists at most 20; split larger histories and carry the ledger across runs.

Do not use “full audit,” “critical vulnerabilities scanned,” or “secure” as an unqualified result label. A release run routes every applicable specialist, but breadth still depends on their evidence and on scenario execution. If the user asks for an end-to-end audit, record which party, protocol, backend, funding/recovery path, and failure events were actually covered.

## 2. Establish the threat model and inventory before reviewing

Role A records the exact checkout SHA, base/merge base, commit count, dirty files, build features, configured backends, CI status for that SHA, available regtest dependencies, and previous unresolved findings. If a feature or backend is unavailable, label it unreviewed or blocked rather than assuming its behavior matches another. Recheck paths and tests in the target checkout; documentation examples can refer to another branch.

For every in-scope P0 lane, inventory the externally reachable entry points and irreversible actions: accept a peer message, reserve a coin, sign, reveal a preimage, pay an invoice, broadcast, persist, acknowledge completion, and retire recovery state. Draw at least one path from entry to funded output and to each cooperative or unilateral exit. Inspect callers, callee validation, durable state, chain observations, and restart/reorg recovery. A directory listing, symbol search, or first successful path alone does not complete the lane.

Consider both parties as adversarial peers; a chain backend that is delayed, inconsistent, or temporarily failing; crash and restart between adjacent external actions and saves; concurrent sessions; replacement and reorg; and malformed, replayed, or boundary-valued messages. Separate plausible adversarial control from infrastructure failure. Record assumptions about Bitcoin consensus, trusted local processes, and deployed features.

## 3. Minimum evidence from each specialist

Each worker report must contain:

1. **Scope inventory:** exact paths, main entry points/state transitions inspected, protocol/backend dimensions, and important paths skipped.
2. **Invariant map:** what must hold before and after the irreversible action; where it is validated and persisted; who can violate or delay it.
3. **At least one negative path:** a concrete malicious input or failure ordering through validation, persistence, chain observation, and recovery. If no credible path emerges, say which candidate paths were traced and why they fail.
4. **Test comparison:** nearest test body and helpers, exact assertions, whether that test is in CI at the captured SHA, and what is still unproved. Do not infer coverage from a test name.
5. **Evidence:** current `path:line` citations, a transaction/outpoint or state trace when relevant, competing explanations, and a confidence label. Searches and unexecuted test proposals are marked as such.
6. **Coverage ledger:** reviewed, unreviewed, blocked, and follow-up cells. State whether the assignment was completed to this depth. If not, give the reason and the next bounded task.

A reviewer must not manufacture a finding to fill a quota. It must also not claim “no critical issue” for an unexamined critical path. If its context or time budget runs out, return a partial report with an explicit continuation assignment.

## 4. Critical-risk questions by lane

Use these as adversarial questions, not a claim that checking the list proves safety.

| Lane | Critical-risk trace to attempt |
| --- | --- |
| B contract/signature | Peer changes prevout, amount, script, role, SIGHASH selector, aggregate key/nonce, preimage, or locktime after validation; accepted bytes differ from serialized witness; nonce reuse or replay changes spend authority. Prove each funded output still has a valid exit. |
| C taker | One hop is paid, signed, funded, or marked complete before the preceding position is recoverable; maker drops, lies, is replaced, or withholds a reply; retries double-spend fees or retire a live version. |
| D maker | Hostile taker reserves the same liquidity twice, confuses swap/session identity, obtains unsafe signatures, replays a message, or leaves a funded maker coin with no durable claim/refund. |
| E wallet | Crash between broadcast and save loses keys, outpoints, or raw recovery transactions; restore omits live swap material; accounting double counts or misprices fees; secret exposure makes outputs spendable by another party. |
| F chain/recovery | Core and Electrum disagree, an indexer lags, a notification is lost, a query fails once, a replacement wins, or a confirmed transaction reorgs after state retirement; watcher and caller still find the winning output and exit before deadline. |
| G offer/network/privacy | Stale or forged bond/offer changes route or fee trust; denial of service consumes liquidity or blocks recovery; relay/log/retry data links parties or outputs. Escalate fund movement to C/D/E. |
| H Lightning | Invoice/hash/amount/expiry is mismatched; payment succeeds while chain leg or acknowledgement fails; restart duplicates payment or loses preimage; deadlines allow one party to settle while the other cannot. |
| I reliability | Error swallowing, panic, lock-order or blocking-I/O deadlock, secret logging, unsafe/FFI misuse, changed dependency/build-script attack surface, branch divergence, and tests whose assertions cannot fail their parent. Route any fund-safety consequence to the owning specialist. |

For money-safety claims, ask whether the affected output is actually funded, who can spend it, which witness/signature bytes survive, which transaction version wins, and what happens after restart. A serious claim requires an ordered trigger-to-impact trace and a falsification attempt by A or L. Code inspection can establish a validation defect; permanent loss or theft needs the extra spend/recovery evidence.

## 5. Scenario decision and execution gate

J proposes a small ranked set of novel cases after inspecting nearby tests and CI assertions. A records a decision for **each top-ranked case**: execute with K, defer with reason, duplicate with the exact existing assertion, or blocked by a named dependency/hook. Do not imply that all possible swaps or all edge cases were simulated. A release-scope run should attempt at least one executable high-impact gap if one exists; if none is executed, the report must explain why and remain review-only for those boundaries.

K runs one case per isolated worktree and returns an exact command, source SHA, injected timeline, expected and actual transaction/UTXO/wallet/balance outcomes, logs, patch, and limits. A passing targeted case settles only its stated matrix cell. It does not settle a different crash mode, protocol, backend, hop, or reorg. Distinguish a graceful restart from abrupt process death, and a simulated failure from a real backend fault.

## 6. Exit gate for the coordinator

Before issuing the final report, A verifies: the snapshot matches the source and test results; every dispatched worker succeeded or is marked failed/blocked; each in-scope P0 lane has a trace and explicit exclusions; critical/high claims were independently challenged; top J cases have decisions; executed tests have actual oracles and artifacts; CI results are tied to exact `HEAD`; and the ledger differentiates source review, existing CI assertion, new execution, hypothesis, and unreviewed. If a gate fails, commission a follow-up or label the run partial. Put the highest-value remaining experiment first in the next-run plan.
