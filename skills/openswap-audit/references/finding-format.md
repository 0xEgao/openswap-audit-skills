# Audit evidence and report format

Produce one Markdown brief per run. Record date, branch, `HEAD`, base/merge-base SHA, dirty-tree status, relevant commits, enabled features, CI result or “unavailable,” test backends/dependencies, reviewer assignments, and explicit exclusions. Retain private vulnerability detail under the repository security policy. A clean CI run is a statement about tests that ran, not blanket audit coverage. Name the scope **change**, **bounded baseline**, or **release** and apply the [depth/exit gates](audit-depth.md). Record worker failures and incomplete assignments; do not silently drop them from the ledger.

## Candidate finding

```markdown
### F-001 — Short claim
Status: confirmed | likely | hypothesis | rejected
Severity: critical | high | medium | low
Confidence: high | medium | low
Invariant: What must always hold?
Affected code: `path:line` and the relevant call/state chain
Trigger: Attacker-controlled input or exact failure event and prerequisites
Trace: Ordered steps from trigger to the violated invariant
Impact: Funds, atomicity, availability, privacy, or accounting effect
Evidence: Test command/result, minimized regtest reproduction, or code proof
Limits: Assumptions, untested backend/protocol, and competing explanation
Next action: Narrow fix or regression test
```

For a fund-safety finding, add the exact outpoint/transaction-version relationship when a local reproduction permits it; redact secrets. For an accounting finding, show expected and actual satoshi movements, including fees. For a privacy finding, identify the observer and linkable data. A candidate should be actionable without relying on the reviewer’s intuition.

Do not label a hypothesis confirmed merely because multiple reviewers repeat it. Verify the cited lines in the captured snapshot. For critical/high candidates, have the coordinator or independent challenger look for a caller check, recovery path, or harness assumption that defeats the trace. Reproduce when feasible. If a test fails for infrastructure reasons, label the scenario blocked and state why.

## Scenario brief and outcome

```markdown
### S-001 — Specific missing edge case
Source: commit SHA; changed path/transition
Invariant: property the test would falsify
Nearest coverage: test path/name and exact existing assertions
Novelty: ordering, dimension, or assertion the nearest test lacks
Setup: parties, protocol, hop, backend, splits, starting balances/state
Injection: exact event and when it occurs relative to persistence/broadcast
Oracle: expected transactions/outpoints, recoverable exits, state, balances/fees, terminal result
Harness: existing helper or minimal new hook
Status: proposed | implemented | passed | failed | blocked
Evidence: command, commit, logs/artifacts, actual result; or why unrun
Limits: combinations not exercised and expected test cost
```

The scenario designer returns at most a few ranked briefs and a short discarded-duplicate list. The executor fills the outcome fields. A proposal or a green pre-existing test is not an executed result for the new boundary.

## Coverage ledger

Use a compact table with one row per reviewed invariant or scenario: lane, changed commit, paths, Legacy/Taproot, Core/Electrum, normal/failure/restart/reorg boundary, evidence type (read/test/inferred), result (pass/fail/blocked/unrun), and evidence pointer. Distinguish **unreviewed**, **reviewed with no finding**, **existing CI assertion**, and **new scenario executed**. End with the highest-value missing test, unresolved question, and lane to revisit in the next audit wave. Add a one-line completion status: **complete for stated bounded scope**, **partial**, or **blocked**, with the missing evidence. “No critical finding” is permitted only for the explicitly reviewed scope, never for unreviewed lanes.
