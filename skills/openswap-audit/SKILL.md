---
name: openswap-audit
description: Plan and run a recurring, risk-prioritized multi-agent security and correctness audit of OpenSwap, with named module reviewers and novel swap scenarios derived from recent changes and existing CI assertions. Use for explicit OpenSwap audits or audit-workflow planning; ordinary code review does not require it.
---

# OpenSwap audit

Use this skill for a branch, PR, release, module, or recurring OpenSwap/Coinswap audit. A `coinswap` path may resolve to the `openswap` checkout; identify the actual Git root. Read the protocol specification and relevant repository documentation before asserting protocol invariants. The [repository README](https://github.com/0xEgao/openswap-audit-skills#readme) explains the architecture and invocation. Work against the target OpenSwap checkout, not this instruction repository.

## Pi package activation

When this skill is installed as the `openswap-audit-skills` Pi package, run `/openswap-audit` from the OpenSwap source checkout. The command itself captures the Git snapshot, selects roles by changed path and cross-module risk, and launches the first isolated worker wave **before** role A receives the reports. It always includes I and J; B–H follow the changed boundary. With no changed paths it rotates B/E/F, and `--release` covers the P0 lanes plus Lightning when its module exists. Use `--plan` for a no-model routing preview, `--base=REF` for an explicit base, and `--parallel=N` only when the model backend can sustain it. `/skill:openswap-audit` only loads instructions and does not launch workers.

Role A receives the initial snapshot, assignments, and report paths. Verify that the path router covered the actual changed invariants; add or narrow reviewers with `openswap_audit_agents` when a cross-boundary trace requires it. Check CI status for the exact HEAD, read the nearest test assertions, challenge serious claims through L, and integrate the evidence. For a selected novel scenario, call `openswap_audit_scenario` with J's exact brief only when source changes are committed (project-local `.pi/settings.json` is exempt); it creates a separate detached worktree and retains the test patch and report. Keep K's result distinct from CI status. If the model or test dependencies are unavailable, report the blocked lane rather than claiming coverage.

The coordinator is a working agent, not an extra spawned process. It may use `bash` to inspect Git, CI configuration, and protocol documentation. Worker roles B–J and L have only Pi read/search tools; K additionally has shell and edit tools in its disposable worktree. The worktree is source isolation, not an operating-system sandbox.

## 1. Capture the audit snapshot

- Record date, physical repository root, `HEAD`, base ref and merge base, staged/unstaged/untracked changes, enabled features, and available test dependencies. Honor a user-supplied PR/range. Otherwise prefer the merge base with `upstream/master`, then `origin/master`, then the local default branch. Include both `base...HEAD` and working-tree changes; state if the tree is dirty.
- Read recent commits individually, not only the aggregate diff. Identify each changed state transition, trust boundary, persistent field, transaction or payment path, and intended behavioral claim.
- Choose **change audit**, **rotating baseline**, or **release audit**. A change audit follows changed behavior and dependent invariants. A rotating baseline examines underreviewed lanes. A release audit covers every P0 lane and every enabled money-moving feature, even if untouched by the diff.
- Check CI configuration and current run status if available. CI success is a starting fact about existing tests, not evidence for unasserted behavior. If status is unavailable, say so.

## 2. Route specialist work

Read [module priorities](references/module-priorities.md) and check the command's auto-selected roles against the actual changed invariants. The initial B–J assignments have already run in Pi. Issue bounded follow-up assignments from [agent briefs](references/agent-briefs.md) when a boundary or claim needs another view. Give each added worker the exact snapshot, question, paths, protocol/backend scope, assumptions, and expected output. Follow callers, callees, persisted state, and recovery paths beyond the assigned directory.

Validate roles by **changed invariant**, not by file count or a fixed agent count. The command guarantees I and J plus at least one money-safety specialist in its initial wave; its path rules are a starting assignment, not a coverage claim. Add a separate scenario executor only when there is a specific worthwhile new case or reproduction. Add an independent challenger for serious candidates. Route cross-boundary changes to complementary specialists; the coordinator reconciles their conclusions. For a release audit, run all applicable lanes in waves. With limited concurrency, perform the same assignments sequentially.

The Markdown files define each assignment. In Pi, `/openswap-audit` starts the first wave directly; `openswap_audit_agents` starts any follow-up wave requested by role A. In another runner, use its delegation mechanism and pass the same bounded briefs. Each worker returns evidence to the coordinator.

## 3. Seek coverage gaps created by recent changes

Read [scenario selection](references/scenario-selection.md). The scenario designer must inventory the nearest existing integration tests and their **actual assertions**, including CI coverage, before suggesting a test. Its main output is a small ranked set of new edge cases tied to recent commits, with a reason each differs from the nearest test. The CI suite already runs ordinary ITs; do not spend the scenario budget routinely rerunning a passing suite or proposing cases that it already asserts.

Run a focused existing test only to investigate a failure, establish a necessary control, or support a new reproduction. New scenarios should probe a changed transition or uncovered failure window and assert funds, spendability, durable state, and terminal outcome as applicable. Do not claim that a suggested scenario is covered until it has an executable assertion and result. For a full baseline, also sample old, high-impact invariant gaps independent of the latest diff.

## 4. Verify and report

- Agents report using [finding format](references/finding-format.md): paths and exact current lines, trigger-to-impact trace, evidence, competing explanation, and coverage gaps. Code-quality findings are separate from security findings.
- The coordinator checks every serious claim against the captured snapshot, tries to falsify it, deduplicates cross-agent reports, and reproduces high-impact claims when feasible. Independent agreement without independent evidence is not confirmation.
- Produce one dated brief: snapshot and CI status, role assignments, invariant/coverage ledger, changed-commit-to-scenario map, tests run and not run, confirmed findings, unresolved hypotheses, and highest-value next actions. Never describe an unreviewed lane as secure.

## Execution boundaries

- Audit workers inspect and run local checks by default. Do not edit implementation code unless the user also asks for fixes. A new regression test or fault-injection hook belongs in an isolated checkout during an actual audit and requires a concrete gap. The scenario designer may propose tests without modifying code.
- Use disposable regtest fixtures. Do not broadcast on a live network or use funded wallets. Follow the target checkout's `tests/integration/README.md` for dependencies and filters. Integration tests use `cargo nextest run --features integration-test`; `cargo test` can invalidate log assertions because of the shared logger.
- Keep sensitive vulnerability detail local and follow the repository's security reporting policy before disclosure.
