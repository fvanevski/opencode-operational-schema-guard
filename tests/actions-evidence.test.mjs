import assert from "node:assert/strict"
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import {
  buildReceipt,
  commandFingerprint,
  detectSelfCertification,
  evaluatePrIdentity,
  fingerprintFiles,
  parseNodeTapTotals,
  receiptDigest,
  validateDispatchInput,
  validateExecutionRecord,
  validateProfile,
  validateReceipt,
} from "../lib/actions-evidence.mjs"

const profile = validateProfile(JSON.parse(await readFile(new URL("../evidence/profiles/repository-final-v1.json", import.meta.url), "utf8")))
const base = "a".repeat(40)
const head = "b".repeat(40)
const controller = "c".repeat(40)
const dispatch = validateDispatchInput({ pr_number: "15", expected_base_sha: base, expected_head_sha: head, expected_controller_sha: controller, profile: "repository-final-v1" })

function pr(overrides = {}) {
  return {
    number: 15,
    state: "open",
    base: { ref: "main", sha: base },
    head: { sha: head, repo: { full_name: "fvanevski/opencode-operational-schema-guard" } },
    ...overrides,
  }
}

function execution(overrides = {}) {
  return {
    schema_version: "ghdev-actions-execution-v1",
    repository: "fvanevski/opencode-operational-schema-guard",
    pr_number: 15,
    expected_base_sha: base,
    observed_base_sha_initial: base,
    expected_head_sha: head,
    observed_head_sha_initial: head,
    observed_controller_sha_initial: controller,
    observed_candidate_head_initial: head,
    observed_candidate_head_final: head,
    controller_workflow_path: ".github/workflows/ghdev-verify.yml",
    controller_workflow_ref: "refs/heads/main",
    controller_commit_sha: controller,
    profile_id: "repository-final-v1",
    profile_version: 2,
    command_fingerprint: commandFingerprint(profile),
    candidate_fingerprints: {
      ".npmrc": "MISSING",
      "npm-shrinkwrap.json": "MISSING",
      "package-lock.json": "MISSING",
      "package.json": "d".repeat(64),
      "scripts/test-plugin.mjs": "e".repeat(64),
    },
    runner_class: "self-hosted-supported-linux",
    runner_labels: ["self-hosted", "Linux", "X64", "ghdev-verify"],
    environment: {
      image_fingerprint: "f".repeat(64),
      image_schema: "ghdev-runner-image-v2",
      image_id: "fixture",
      base_image_digest: `sha256:${"1".repeat(64)}`,
      actions_runner_version: "2.337.0",
      git_version: "git version 2.43.0",
      node_version: "v22.16.0",
      npm_version: "10.9.2",
      python_version: "Python 3.12.3",
      bwrap_version: "bubblewrap 0.10.0",
      os_id: "ubuntu",
      os_version_id: "24.04",
      os_release_fingerprint: "2".repeat(64),
      git_sha256: "6".repeat(64),
      node_sha256: "3".repeat(64),
      npm_sha256: "4".repeat(64),
      python_sha256: "7".repeat(64),
      bwrap_sha256: "5".repeat(64),
      sandbox: "bubblewrap-no-network-v1",
      network: "unshared",
      candidate_mount: "read-only",
      candidate_environment: "clearenv-allowlist",
    },
    commands_required: 2,
    commands_run: 2,
    per_command_exit: [{ id: "npm-check", exit: 0, signal: null }, { id: "npm-test", exit: 0, signal: null }],
    npm_test_count: 10,
    npm_test_pass: 10,
    npm_test_fail: 0,
    npm_test_skip: 0,
    worktree_clean_final: true,
    workspace_cleanup_final: true,
    execution_identity: "run:1:executor:attempt:1",
    block_reason: null,
    result: "PASS",
    ...overrides,
  }
}

test("dispatch input fails closed on malformed PR/SHA/profile/controller values", () => {
  assert.throws(() => validateDispatchInput({ pr_number: "0", expected_base_sha: base, expected_head_sha: head, expected_controller_sha: controller, profile: "repository-final-v1" }), /pr_number/)
  assert.throws(() => validateDispatchInput({ pr_number: "15", expected_base_sha: base.toUpperCase(), expected_head_sha: head, expected_controller_sha: controller, profile: "repository-final-v1" }), /expected_base_sha/)
  assert.throws(() => validateDispatchInput({ pr_number: "15", expected_base_sha: base, expected_head_sha: head, expected_controller_sha: controller, profile: "candidate-profile" }), /profile/)
})

test("repository-final profile requires the current runner image schema", () => {
  assert.equal(profile.profile_version, 2)
  assert.equal(profile.runner.image_schema, "ghdev-runner-image-v2")
  assert.throws(() => validateProfile({ ...profile, runner: { ...profile.runner, image_schema: "ghdev-runner-image-v1" } }), /runner image schema/)
})

test("same-repository exact PR identity is required and fork/head movement is rejected", () => {
  assert.equal(evaluatePrIdentity(pr(), dispatch, "fvanevski/opencode-operational-schema-guard").admitted, true)
  assert.deepEqual(evaluatePrIdentity(pr({ head: { sha: head, repo: { full_name: "fork/repo" } } }), dispatch, "fvanevski/opencode-operational-schema-guard").reason, "FORK_OR_FOREIGN_HEAD_DENIED")
  assert.deepEqual(evaluatePrIdentity(pr({ head: { sha: "9".repeat(40), repo: { full_name: "fvanevski/opencode-operational-schema-guard" } } }), dispatch, "fvanevski/opencode-operational-schema-guard").result, "STALE")
})

test("candidate cannot self-certify trusted control-plane changes", () => {
  const clean = detectSelfCertification(["README.md"], profile.trusted_control_paths, profile.trusted_control_prefixes)
  assert.equal(clean.denied, false)
  const denied = detectSelfCertification(["README.md", ".github/workflows/ghdev-verify.yml", "lib/actions-evidence.mjs", "node_modules", "node_modules/.bin/node"], profile.trusted_control_paths, profile.trusted_control_prefixes)
  assert.equal(denied.denied, true)
  assert.deepEqual(denied.conflicting_paths, [".github/workflows/ghdev-verify.yml", "lib/actions-evidence.mjs", "node_modules", "node_modules/.bin/node"])
})

test("candidate fingerprints reject symlinks instead of dereferencing host paths", async () => {
  const root = await mkdtemp(join(tmpdir(), "ghdev-fingerprint-"))
  await mkdir(join(root, "scripts"))
  await writeFile(join(root, "package.json"), "{}\n")
  await symlink("/etc/passwd", join(root, "package-lock.json"))
  await assert.rejects(() => fingerprintFiles(root, ["package.json", "package-lock.json"]), /regular file/)
})

test("node TAP totals are parsed deterministically", () => {
  const totals = parseNodeTapTotals("1..10\n# tests 10\n# pass 9\n# fail 0\n# skipped 1\n")
  assert.deepEqual(totals, { count: 10, pass: 9, fail: 0, skip: 1 })
  assert.equal(parseNodeTapTotals("OPERATIONAL_PLUGIN_TEST_RESULT: PASS\n"), null)
})

test("execution record rejects duplicate/missing/conflicting command evidence", () => {
  assert.doesNotThrow(() => validateExecutionRecord(execution(), profile, dispatch))
  assert.throws(() => validateExecutionRecord(execution({ per_command_exit: [{ id: "npm-check", exit: 0, signal: null }, { id: "npm-check", exit: 0, signal: null }] }), profile, dispatch), /profile order exactly once/)
  assert.throws(() => validateExecutionRecord(execution({ commands_run: 1, per_command_exit: [{ id: "npm-check", exit: 0, signal: null }], result: "PASS" }), profile, dispatch), /PASS requires all commands/)
  assert.throws(() => validateExecutionRecord(execution({ environment: { ...execution().environment, candidate_environment: "inherited" } }), profile, dispatch), /sanitized/)
})

test("started execution requires complete Git and Python provenance", () => {
  assert.throws(() => validateExecutionRecord(execution({ environment: { ...execution().environment, python_version: null } }), profile, dispatch), /python_version provenance missing/)
  assert.throws(() => validateExecutionRecord(execution({ environment: { ...execution().environment, python_sha256: null } }), profile, dispatch), /python_sha256 missing/)
  assert.throws(() => validateExecutionRecord(execution({ environment: { ...execution().environment, git_version: null } }), profile, dispatch), /git_version provenance missing/)
  assert.throws(() => validateExecutionRecord(execution({ environment: { ...execution().environment, git_sha256: null } }), profile, dispatch), /git_sha256 missing/)
})

test("signal termination is BLOCKED without fabricating a numeric exit", () => {
  const blocked = execution({
    commands_run: 1,
    per_command_exit: [{ id: "npm-check", exit: null, signal: "SIGKILL" }],
    npm_test_count: null,
    npm_test_pass: null,
    npm_test_fail: null,
    npm_test_skip: null,
    block_reason: "COMMAND_TERMINATED_WITHOUT_EXIT",
    result: "BLOCKED",
  })
  assert.doesNotThrow(() => validateExecutionRecord(blocked, profile, dispatch))
  assert.throws(() => validateExecutionRecord({ ...blocked, per_command_exit: [{ id: "npm-check", exit: 125, signal: "SIGKILL" }] }, profile, dispatch), /must not carry a signal/)
})

test("setup failures can produce a typed BLOCKED execution without fabricating environment provenance", () => {
  const blocked = execution({
    observed_candidate_head_initial: head,
    observed_candidate_head_final: head,
    candidate_fingerprints: {},
    environment: {
      image_fingerprint: null,
      image_schema: "ghdev-runner-image-v2",
      image_id: null,
      base_image_digest: null,
      actions_runner_version: null,
      git_version: null,
      node_version: null,
      npm_version: null,
      python_version: null,
      bwrap_version: null,
      os_id: null,
      os_version_id: null,
      os_release_fingerprint: null,
      git_sha256: null,
      node_sha256: null,
      npm_sha256: null,
      python_sha256: null,
      bwrap_sha256: null,
      sandbox: "bubblewrap-no-network-v1",
      network: "not-executed",
      candidate_mount: "not-executed",
      candidate_environment: "not-executed",
    },
    commands_run: 0,
    per_command_exit: [],
    npm_test_count: null,
    npm_test_pass: null,
    npm_test_fail: null,
    npm_test_skip: null,
    worktree_clean_final: true,
    workspace_cleanup_final: true,
    block_reason: "SETUP_OR_ISOLATION_ERROR",
    result: "BLOCKED",
  })
  assert.doesNotThrow(() => validateExecutionRecord(blocked, profile, dispatch))
  const receipt = buildReceipt({ execution: blocked, profile, dispatch, observedBaseFinal: base, observedHeadFinal: head, observedControllerFinal: controller, workflowRunId: 123, workflowRunAttempt: 1, executionArtifactId: 456, receiptArtifactName: "ghdev-receipt-fixture" })
  assert.equal(receipt.result, "BLOCKED")
  assert.equal(receipt.block_reason, "SETUP_OR_ISOLATION_ERROR")
  assert.doesNotThrow(() => validateReceipt(receipt, profile, dispatch))
})

test("final non-stale PR identity denial cannot preserve executor PASS", () => {
  const receipt = buildReceipt({ execution: execution(), profile, dispatch, observedBaseFinal: base, observedHeadFinal: head, observedControllerFinal: controller, finalIdentityResult: "BLOCKED", finalIdentityReason: "PR_NOT_OPEN", workflowRunId: 123, workflowRunAttempt: 1, executionArtifactId: 456, receiptArtifactName: "ghdev-receipt-fixture" })
  assert.equal(receipt.result, "BLOCKED")
  assert.equal(receipt.block_reason, "FINAL_PR_IDENTITY_BLOCKED")
  assert.doesNotThrow(() => validateReceipt(receipt, profile, dispatch))
  const conflict = { ...receipt, block_reason: "SETUP_OR_ISOLATION_ERROR" }
  conflict.receipt_sha256 = receiptDigest(conflict)
  assert.throws(() => validateReceipt(conflict, profile, dispatch), /block_reason conflicts/)
})

test("final source movement forces STALE and never PASS on the old receipt", () => {
  const receipt = buildReceipt({ execution: execution(), profile, dispatch, observedBaseFinal: base, observedHeadFinal: "9".repeat(40), observedControllerFinal: controller, finalIdentityResult: "STALE", finalIdentityReason: "REMOTE_IDENTITY_CHANGED", workflowRunId: 123, workflowRunAttempt: 1, executionArtifactId: 456, receiptArtifactName: "ghdev-receipt-fixture" })
  assert.equal(receipt.result, "STALE")
  assert.equal(receipt.expected_head_sha, head)
  assert.equal(receipt.observed_head_sha_final, "9".repeat(40))
  assert.doesNotThrow(() => validateReceipt(receipt, profile, dispatch))
})

test("trusted controller movement forces STALE even when the candidate head is unchanged", () => {
  const receipt = buildReceipt({ execution: execution(), profile, dispatch, observedBaseFinal: base, observedHeadFinal: head, observedControllerFinal: "8".repeat(40), finalIdentityResult: "STALE", finalIdentityReason: "CONTROLLER_REF_MOVED", workflowRunId: 123, workflowRunAttempt: 1, executionArtifactId: 456, receiptArtifactName: "ghdev-receipt-fixture" })
  assert.equal(receipt.result, "STALE")
  assert.equal(receipt.observed_head_sha_final, head)
  assert.equal(receipt.observed_controller_sha_final, "8".repeat(40))
  assert.doesNotThrow(() => validateReceipt(receipt, profile, dispatch))
})

test("receipt digest/provenance is deterministic and malformed/conflicting receipt is rejected", () => {
  const receipt = buildReceipt({ execution: execution(), profile, dispatch, observedBaseFinal: base, observedHeadFinal: head, observedControllerFinal: controller, workflowRunId: 123, workflowRunAttempt: 1, executionArtifactId: 456, receiptArtifactName: "ghdev-receipt-fixture" })
  assert.equal(receipt.result, "PASS")
  assert.equal(receipt.semantic_review, "NOT_EVALUATED")
  assert.equal(receipt.host_specific_evidence, "NOT_EVALUATED")
  assert.equal(receipt.environment.python_version, "Python 3.12.3")
  assert.equal(receipt.environment.git_version, "git version 2.43.0")
  assert.equal(receipt.receipt_sha256, receiptDigest(receipt))
  assert.doesNotThrow(() => validateReceipt(receipt, profile, dispatch))
  assert.throws(() => validateReceipt({ ...receipt, result: "FAIL" }, profile, dispatch), /digest mismatch/)
  const conflict = { ...receipt, observed_head_sha_final: "9".repeat(40) }
  conflict.receipt_sha256 = receiptDigest(conflict)
  assert.throws(() => validateReceipt(conflict, profile, dispatch), /PASS final identity conflicts|PASS head identity mismatch/)
})

test("new head cannot reuse an old receipt and evidence classes remain distinct", () => {
  const receipt = buildReceipt({ execution: execution(), profile, dispatch, observedBaseFinal: base, observedHeadFinal: head, observedControllerFinal: controller, workflowRunId: 123, workflowRunAttempt: 1, executionArtifactId: 456, receiptArtifactName: "ghdev-receipt-fixture" })
  const movedDispatch = validateDispatchInput({ ...dispatch, expected_head_sha: "9".repeat(40) })
  assert.throws(() => validateReceipt(receipt, profile, movedDispatch), /expected_head_sha mismatch|expected identity mismatch/)
  assert.equal(receipt.evidence_class, "actions-repository-deterministic")
  assert.notEqual(receipt.semantic_review, "CLEAN")
  assert.notEqual(receipt.host_specific_evidence, "PASS")
})
