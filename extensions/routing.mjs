import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const ORDER = "BCDEFGHIJ".split("");
const ROLE_NAMES = {
  B: "contract and signature validation",
  C: "taker state and route",
  D: "maker admission and state",
  E: "wallet and accounting",
  F: "chain, watchtower, and recovery",
  G: "offers, fidelity, and privacy",
  H: "Lightning atomicity",
  I: "code quality and reliability",
  J: "novel scenario gaps versus CI assertions",
};

function git(repo, args) {
  const result = spawnSync("git", args, { cwd: repo, encoding: "utf8", maxBuffer: 8_000_000 });
  if (result.status !== 0) throw new Error((result.stderr || result.error?.message || "").trim() || `git ${args.join(" ")} failed`);
  return result.stdout.trim();
}

function hasRef(repo, ref) {
  if (!ref || ref.startsWith("-") || !/^[A-Za-z0-9._/~^+-]+$/.test(ref)) return false;
  return spawnSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], { cwd: repo, stdio: "ignore" }).status === 0;
}

function pathsFrom(value) {
  return value.split("\0").filter(Boolean);
}

export function parseAuditArgs(input = "") {
  const base = input.match(/(?:--base(?:=|\s+)|\bagainst\s+)([A-Za-z0-9._/~^+-]+)/i)?.[1];
  const parallelRaw = input.match(/--parallel(?:=|\s+)(\d+)/)?.[1];
  const parallel = parallelRaw ? Number(parallelRaw) : 1;
  if (!Number.isInteger(parallel) || parallel < 1 || parallel > 4) throw new Error("--parallel must be between 1 and 4");
  return {
    base,
    release: /(?:^|\s)--release(?:\s|$)|\brelease audit\b/i.test(input),
    baseline: /(?:^|\s)--baseline(?:\s|$)|\bbaseline audit\b/i.test(input),
    planOnly: /(?:^|\s)--plan(?:\s|$)/.test(input),
    parallel,
    request: input.trim() || "Audit recent commits against the merge base, including dirty changes.",
  };
}

export function rolesForPath(file) {
  const p = file.replaceAll("\\", "/").toLowerCase();
  if (p === "cargo.toml" || p === "cargo.lock" || p === "build.rs") return ["B", "E", "G"];
  if (/funding_bump|refund_fee_bump/.test(p)) return ["C", "D", "E", "F"];
  if (/lightning/.test(p)) return ["E", "F", "H"];
  if (p.startsWith("src/watch_tower/") || p.startsWith("src/wallet/blockchain/") || p.startsWith("tests/integration/recovery/")) return ["E", "F"];
  if (p.startsWith("src/protocol/") || p.startsWith("tests/integration/rejection/")) return ["B", "C", "D"];
  if (p.startsWith("src/taker/offers") || p.startsWith("tests/integration/offerbook/")) return ["C", "G"];
  if (p.startsWith("src/maker/nostr") || p.startsWith("src/wallet/fidelity") || p.startsWith("src/wallet/deniability")) return ["D", "G"];
  if (p.startsWith("src/taker/") || p.startsWith("tests/integration/swap/")) return ["C", "E", "F"];
  if (p.startsWith("src/maker/")) return ["B", "D", "E"];
  if (p.startsWith("src/wallet/") || p.startsWith("src/atomic_file") || p.startsWith("src/security")) return ["E", "F"];
  return [];
}

export function selectRoles(paths, scope, request = "", lightningExists = true) {
  const selected = new Set(["I", "J"]);
  if (scope === "release") {
    for (const role of "BCDEFG".split("")) selected.add(role);
    if (lightningExists) selected.add("H");
  } else if (scope === "baseline" || paths.length === 0) {
    for (const role of "BEF".split("")) selected.add(role);
  } else {
    for (const file of paths) for (const role of rolesForPath(file)) selected.add(role);
    if (request.match(/watch.?tower|recovery|reorg/i)) for (const role of ["E", "F"]) selected.add(role);
    if (request.match(/offer|fidelity|privacy/i)) for (const role of ["C", "G"]) selected.add(role);
    if (request.match(/contract|signature|musig|protocol/i)) for (const role of ["B", "C", "D"]) selected.add(role);
    if (request.match(/lightning/i) && lightningExists) for (const role of ["E", "F", "H"]) selected.add(role);
    if (![...selected].some((role) => "BCDEFGH".includes(role))) selected.add("E");
  }
  return ORDER.filter((role) => selected.has(role));
}

export function buildAuditPlan(repo, input = "") {
  const opts = parseAuditArgs(input);
  const head = git(repo, ["rev-parse", "HEAD"]);
  const base = opts.base || ["upstream/master", "origin/master", "origin/main", "main", "master"].find((ref) => hasRef(repo, ref)) || "HEAD";
  if (!hasRef(repo, base)) throw new Error(`Base ref ${base} is not available in this checkout`);
  const mergeBase = git(repo, ["merge-base", base, "HEAD"]);
  const committed = pathsFrom(git(repo, ["diff", "--name-only", "-z", `${mergeBase}...HEAD`]));
  const staged = pathsFrom(git(repo, ["diff", "--name-only", "-z", "--cached"]));
  const unstaged = pathsFrom(git(repo, ["diff", "--name-only", "-z"]));
  const untracked = pathsFrom(git(repo, ["ls-files", "--others", "--exclude-standard", "-z"]));
  const paths = [...new Set([...committed, ...staged, ...unstaged, ...untracked])].filter((file) => !file.startsWith(".pi/")).sort();
  const noDiff = paths.length === 0;
  const implicitBaseline = noDiff && !opts.release && !opts.baseline;
  if (implicitBaseline && !opts.planOnly) {
    throw new Error("No commits or working-tree changes relative to the selected base. Use --base=HEAD~N to audit recent commits, --baseline for a bounded P0 sample, or --release for all applicable review lanes.");
  }
  const scope = opts.release ? "release" : opts.baseline || noDiff ? "baseline" : "change";
  const roles = selectRoles(paths, scope, opts.request, existsSync(path.join(repo, "src", "lightning")));
  const status = git(repo, ["status", "--short", "--untracked-files=all"]);
  const count = Number(git(repo, ["rev-list", "--count", `${mergeBase}..HEAD`]));
  const rangeTooLarge = count > 20;
  if (rangeTooLarge && !opts.planOnly) {
    throw new Error(`Selected range has ${count} commits, but worker context includes at most 20. Split the range with a closer --base=REF and preview with --plan.`);
  }
  const commits = git(repo, ["log", "--format=%h %s", "--max-count=20", `${mergeBase}..HEAD`]);
  const stat = git(repo, ["diff", "--stat", `${mergeBase}...HEAD`]);
  const context = [
    `Date: ${new Date().toISOString()}`,
    `Repository: ${repo}`,
    `HEAD: ${head}`,
    `Base ref: ${base}`,
    `Merge base: ${mergeBase}`,
    `Scope: ${scope}${scope === "baseline" ? " (bounded B/E/F sample; not whole-codebase coverage)" : scope === "release" ? " (all applicable reviewer lanes; execution still requires evidence)" : ""}`,
    `CI status: not queried by the dispatcher; verify against this exact HEAD`,
    `Working tree status:\n${status || "clean"}`,
    `Commits since merge base (${count}; showing at most 20):\n${commits || "none"}`,
    `Committed diff stat:\n${stat || "none"}`,
    `Changed paths (${paths.length}):\n${paths.join("\n") || "none"}`,
  ].join("\n\n");
  const commitShas = git(repo, ["log", "--format=%H", "--max-count=20", `${mergeBase}..HEAD`]).split("\n").filter(Boolean).reverse();
  const patchParts = commitShas.map((sha) => git(repo, ["show", "--no-ext-diff", "--format=fuller", "--unified=2", sha]));
  const stagedPatch = git(repo, ["diff", "--no-ext-diff", "--unified=2", "--cached"]);
  const unstagedPatch = git(repo, ["diff", "--no-ext-diff", "--unified=2"]);
  if (stagedPatch) patchParts.push(`Staged working-tree changes:\n${stagedPatch}`);
  if (unstagedPatch) patchParts.push(`Unstaged working-tree changes:\n${unstagedPatch}`);
  const patch = patchParts.join("\n\n");
  const scenarioPatch = patch.length > 60_000 ? `${patch.slice(0, 60_000)}\n[Per-commit patches truncated at 60,000 characters; inspect the remaining commits in the coordinator session.]` : patch;
  const tasks = roles.map((role) => {
    const related = paths.filter((file) => rolesForPath(file).includes(role));
    const focus = related.length ? related : paths;
    const focusArgs = focus.length ? ["--", ...focus] : [];
    const focusedPatch = role === "J" || focus.length === 0 ? "" : [
      git(repo, ["diff", "--no-ext-diff", "--unified=2", `${mergeBase}...HEAD`, ...focusArgs]),
      git(repo, ["diff", "--no-ext-diff", "--unified=2", "--cached", ...focusArgs]),
      git(repo, ["diff", "--no-ext-diff", "--unified=2", ...focusArgs]),
    ].filter(Boolean).join("\n\n");
    const focusedExcerpt = focusedPatch.length > 20_000 ? `${focusedPatch.slice(0, 20_000)}\n[Focused patch truncated; inspect source paths and ask the coordinator for more diff context.]` : focusedPatch;
    const assignment = [
      `Review ${ROLE_NAMES[role]} for this ${scope} audit. User request: ${opts.request}`,
      `Focus paths: ${focus.slice(0, 40).join(", ") || "bounded P0 baseline sample"}${focus.length > 40 ? " (additional paths listed in snapshot)" : ""}.`,
      "Follow the relevant state across adjacent modules and report exact evidence, competing explanations, and coverage gaps.",
      role === "J" ? `Compare recent changes with actual CI test assertions. Commit and dirty diffs:\n${scenarioPatch || (scope === "release" ? "No source diff; inspect release-scope P0 gaps." : "No source diff; inspect bounded baseline gaps.")}` : focusedExcerpt ? `Focused committed and dirty diff:\n${focusedExcerpt}` : "",
    ].filter(Boolean).join("\n\n");
    return { role, assignment };
  });
  return { ...opts, repo, head, base, mergeBase, scope, paths, roles, context, tasks, status, commitCount: count, implicitBaseline, rangeTooLarge };
}
