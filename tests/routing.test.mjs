import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildAuditPlan, parseAuditArgs, selectRoles } from "../extensions/routing.mjs";

test("watchtower changes dispatch chain and wallet reviewers plus quality and scenarios", () => {
  assert.deepEqual(selectRoles(["src/watch_tower/watcher.rs"], "change"), ["E", "F", "I", "J"]);
});

test("dependency and build changes dispatch protocol, wallet, and network reviewers", () => {
  assert.deepEqual(selectRoles(["Cargo.lock"], "change"), ["B", "E", "G", "I", "J"]);
});

test("funding replacement dispatches both peers, wallet, and recovery", () => {
  assert.deepEqual(selectRoles(["src/maker/funding_bump.rs"], "change"), ["C", "D", "E", "F", "I", "J"]);
});

test("release audit covers all protocol lanes and Lightning when present", () => {
  assert.deepEqual(selectRoles([], "release", "", true), ["B", "C", "D", "E", "F", "G", "H", "I", "J"]);
  assert.deepEqual(selectRoles([], "release", "", false), ["B", "C", "D", "E", "F", "G", "I", "J"]);
});

test("explicit baseline selects a bounded P0 sample", () => {
  assert.deepEqual(selectRoles([], "baseline"), ["B", "E", "F", "I", "J"]);
});

test("command flags select base, preview, and local-model concurrency", () => {
  assert.deepEqual(parseAuditArgs("--base=origin/master --parallel=2 --plan --release").base, "origin/master");
  assert.equal(parseAuditArgs("--base=origin/master --parallel=2 --plan --release").parallel, 2);
  assert.equal(parseAuditArgs("--base=origin/master --parallel=2 --plan --release").planOnly, true);
  assert.equal(parseAuditArgs("--base=origin/master --parallel=2 --plan --release").release, true);
  assert.throws(() => parseAuditArgs("--parallel=8"), /between 1 and 4/);
});


test("Git snapshot ignores local Pi settings and includes changed source commits", () => {
  const repo = mkdtempSync(path.join(os.tmpdir(), "openswap-router-test-"));
  const git = (...args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" });
  try {
    git("init", "-q");
    writeFileSync(path.join(repo, "README.md"), "initial\n");
    git("add", "README.md");
    git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "initial");
    git("tag", "baseline");
    mkdirSync(path.join(repo, ".pi"));
    writeFileSync(path.join(repo, ".pi", "settings.json"), "{}\n");
    assert.throws(() => buildAuditPlan(repo, "--base=baseline"), /No commits or working-tree changes/);
    const preview = buildAuditPlan(repo, "--base=baseline --plan");
    assert.equal(preview.implicitBaseline, true);
    assert.equal(preview.commitCount, 0);
    const baseline = buildAuditPlan(repo, "--base=baseline --baseline");
    assert.equal(baseline.scope, "baseline");
    assert.deepEqual(baseline.paths, []);
    mkdirSync(path.join(repo, "src", "watch_tower"), { recursive: true });
    writeFileSync(path.join(repo, "src", "watch_tower", "watcher.rs"), "fn watch() {}\n");
    git("add", "src/watch_tower/watcher.rs");
    git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "watchtower update");
    const change = buildAuditPlan(repo, "--base=baseline");
    assert.equal(change.scope, "change");
    assert.deepEqual(change.roles, ["E", "F", "I", "J"]);
    assert.match(change.tasks.find((task) => task.role === "J").assignment, /watchtower update/);
    assert.match(change.tasks.find((task) => task.role === "F").assignment, /fn watch/);
    for (let index = 0; index < 20; index++) {
      writeFileSync(path.join(repo, "README.md"), `revision ${index}\n`);
      git("add", "README.md");
      git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", `revision ${index}`);
    }
    const wide = buildAuditPlan(repo, "--base=baseline --plan");
    assert.equal(wide.commitCount, 21);
    assert.equal(wide.rangeTooLarge, true);
    assert.throws(() => buildAuditPlan(repo, "--base=baseline"), /range has 21 commits/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
