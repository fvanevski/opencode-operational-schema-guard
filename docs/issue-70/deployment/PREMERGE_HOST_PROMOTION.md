# Issue #70: approved-source, disabled-capture pre-merge host promotion

Status: **candidate for Build execution**, not an assertion that the host has been changed or qualified.

## Authority and bounded exception

The operator requested this Issue #70 sequence:

1. Promote and authenticate the independently reviewed source on the **actual stock OpenCode V2 host**, with Graphiti capture fully **disabled**.
2. Read back installed source/config and validate the affected capability from new processes, without using the running Build harness as its own independent acceptance witness.
3. Publish host promotion/acceptance evidence to the **existing PR #73**, then obtain a **fresh exact-head independent disposition**.
4. If that final disposition remains positive, separately authorize readiness transition and squash merge; verify merged-main CI and equal source tree.
5. Production Graphiti capture, eligible categories/groups and Issue #70 closure remain separate opt-in and acceptance boundaries.

This is a **specific exception** to GHDEV-06's merge-before-host-deploy order, NOT a general change to GHDEV-06 and NOT authorization to use its historical V1 installer outside the V1 contract.

Source baseline approved on 2026-10-31:

- Repo: \`fvanevski/opencode-operational-schema-guard\`
- Reviewed PR #73 source: \`b126b6d415a3f8706e0c8c22b219cca2161a7465\`
- Reviewed source Git tree: \`dacb27120deef3e8bfa27b50222bf20cb60c450c\`
- Parent merged-main base: \`4d4825b8151a1d8272af9da89701954d7ab27822\`
- Formal independent review: PR review \`5723993819\` by \`gh-mcp-reviewer[bot]\`
- Codex final review: \`b126b6d415...\`, completed, no findings, request cap 2/2.
- The source package is \`docs/issue-70/implementation/i1-integrated\` and \`docs/issue-70/phase2\`, \`phase3\`, \`phase4\`.

**Promotion stops if the live PR head, source package bytes, installed base, or selected config has changed unexpectedly.** Use one immutable **detached** release checkout at this reviewed SHA, not an editable \`issue/70-host-activation\` worktree, and retain the checkout and its path as an installed runtime dependency until an expressly reviewed later replacement. A later evidence-only PR commit must not silently change the deployed source.

## Installation authority and surfaces

Authenticate and explicitly inventory every host owner before the first mutation:

| Component | Source and install boundary |
| --- | --- |
| Gate | \`i1-integrated/candidate/gate/\` -> authenticated installed gate root (historically \`~/.local/share/openviking-commit-gate\`) |
| OpenViking V2 plugin | \`i1-integrated/candidate/openviking-v2/\` -> authenticated installed plugin root (historically \`~/.config/opencode/plugins/openviking-v2\`) |
| Launcher/admission shim | \`candidate/shim/\` -> installed \`openviking-agent-run\` and gate \`admission_exec.py\`, without losing current wrappers or sibling V4 import |
| Backend | \`i1-integrated/patches/backend.patch\` -> exact installed OpenViking Python source root; no dependency/venv upgrades |
| Graphiti source | Immutable \`docs/issue-70/phase2\`, \`phase3\`, \`phase4\` in the detached release checkout. The gate's \`graphiti_runtime_dir\`, when configured, must refer to this release's \`phase3\` and Graphiti Core interpreter must be the authenticated supported venv |
| Existing validator | Operator-installed read-only validator. No edits; future exclusive-state opt-in requires its exact file SHA |

The **stock-V2** mapping in \`source-base-manifest.json\` governs candidate source and exact installed-base digests, not \`scripts/install-live-plugin.mjs\` (historical V1 installer, requires merged-main identity). The V1 installer's \`--merged-sha\` precondition must NOT be weakened, spoofed, or bypassed. Do not install the historical repo root as the stock V2 plugin. No extra PR.

## Prepare: detached source, preflight, backup and release construction

1. Fetch the authoritative branch and prove \`refs/remotes/origin/issue/70-host-activation\` is the exact approved SHA. Prove \`git cat-file -t <SHA>\` is \`commit\` and \`git rev-parse <SHA>^{tree}\` equals the approved tree. Establish one fresh private release path **outside** active dev worktrees, with a detached checkout at the approved SHA, pinned against later GC/cleanup.
2. Establish current process/service/wrapper/config/site-packages ownership, stock OpenCode version, effective plugin order, live gate DB and flock, and whether the existing worker/interactive processes may still hold leases or durable uncompleted work. Inspect queues **read-only**. A pre-fix gate process must not survive promotion: stop/quiesce it by its actual owner, respecting outstanding durable state; no destructive drain, manual receipt edit, forced lock removal or fake idle metrics.
3. Verify each candidate and patch SHA-256 against the committed manifest and \`SHA256SUMS\`. Reauthenticate each existing original installed file against the \`source_base_sha256\` (where provided). For a new candidate path, prove there is no conflicting unowned installed file. Record all discovered files/modes/owner/group, service/config pointers, and any extras without interpreting an inventory mismatch as permission to delete.
4. Reproduce gate (13-entry) and plugin (8-entry) candidate trees from the authenticated originals using the committed patches, and backend changed files from the exact installed Python root. Verify they reproduce candidate bytes and reverse cleanly in **disposable copies**. The shim's new files and paths follow the source manifest. Never patch or test the live destination in place before a complete staged candidate exists.
5. Construct a dedicated, permission-restricted, persistent source/config backup and a prepared release containing all installable components. Prefer per-component same-filesystem directory staging + rename with verified backup for directory-owned roots, and inode-safe staged file replacement with preserved mode/owner for individually owned shim/backend files. These multiple roots are **not one atomic transaction**; maintain a durable operator-readable journal of each mutation and a well-defined reverse order. Only activate/restart services after the full component set and config are consistent. If interrupted, resume/roll back from the durable journal, not ad-hoc guessing.
6. Validate the actual effective gate TOML and operator policy with capture disabled:
   \`graphiti_enabled=false\`, \`graphiti_production_approved=false\`, and no \`production_activation:true\` write policy. Missing keys may be accepted **only when the current parser establishes their false defaults**. Do not insert an enabled group, broaden workspace/categories or enable \`exclusive_state_transition\`. Preserve existing OpenViking session state, runtime data, SQLite, secrets, and the established shared-lease semantics.
7. A schema/config migration that would change production authority, a source hash drift, unknown live modification, unresolved writer or changing live API contract is a STOP for promotion, not grounds to modify unrelated source or relax checks. Collect diagnostic evidence and propose the exact bounded correction.

## Promote: single Build-authorized source-only installation

- The operator authorizes **only** reversible source promotion of the approved Issue #70 candidate with Graphiti ingestion disabled. This may stop/restart the real gate/linked services as needed for clean V2 deployment. It does not authorize live Graphiti ingestion, new per-event capture rights, or rewriting persisted work.
- Revalidate approved checkout, candidate hashes, originals, quiescence, and effective disabled config immediately before the first write.
- Preserve live config bytes unless an explicitly necessary, separately verified disabled-only compatibility adjustment is required. Any permitted adjustment must have a complete old/new diff and rollback copy.
- Execute the preplanned component promotion under the Build harness / host operator; no service should observe a partially replaced component set. Verify source and configs **after** promotion by re-reading the installed files, not by trusting \`cp\`/rename exit codes.
- Restart the actual owner processes only after full staged-to-live readback is sound. Check healthy service initialization, error logs, legacy ingress and gate queue/status, existing scheduler/lease ownership and OpenViking behavior. There must be no Graphiti capture or unexpected work triggered simply by plugin or service startup.
- When a restart or affected capability fails, **rollback installed source/config in reverse order**, preserve protected DB/QueueFS/receipt data intact, and report partial-state/error/recovery evidence. Do not claim success from a disabled-only smoke while the original user-visible functionality is broken.

## Verify: distinct post-Build fresh-process acceptance

A **separate Evidence-primary process or an explicitly operator-run external fresh process** checks the final deployed state after Build releases its session/lease. No Evidence process may edit live source or bypass lease enforcement. Provide it the immutable reviewed checkout path, exact host paths and sanitized read-only evidence, prepared on the operator plane when required by stock-V2 permissions.

Verify: installed file hashes and modes == authenticated candidate files; gate/launcher/backend source identities; plugin and V4 sibling coexistence; effective disabled config; gate health, native V2 startup and event/context/compaction behaviors; OpenViking session commit/queue/recovery and shared admission; busy/unknown scheduler fail closed; a read-only live status request and new fresh-process public capability rather than only a unit test. Evidence process must distinguish public behavior, durable state, and source/config identities. Recheck that Graphiti live group and gate DB were not changed by tests or unintended capture; ordinary OpenViking production writes can occur **only** as authorized natural operations, not injected acceptance fixtures.

Record readback **at deployment source SHA**, not at any future squash SHA. Prefer bounded source/install manifest and before/after state summaries; exclude secrets, raw private memory contents, full DB copies, tokens and huge logs. Include protected-state preservation proof and rollback backups' own readback.

## Final PR evidence and merge

Publish one concise evidence artifact / one metadata-only commit to existing PR #73, if needed, documenting: exact deployed **source** SHA and tree; final branch/evidence SHA; host source+config before/after hashes; file-install/rollback receipts; process/service startup IDs and dates; external fresh-process proof; exact test/run identities, limitations and deviations. The installation must still correspond to the reviewed source bytes; a new PR evidence commit does **not** automatically authorize changing host source bytes.

Central independently reviews final evidence and exact new PR head, revalidates changed diff/CI/formal approval eligibility, then (only if independently authorized) transitions draft -> ready and squash-merges with an exact-head CAS. Compare merged-main tree to the **final reviewed PR tree**, and additionally distinguish the \`docs/issue-70\` installed-source tree/byte identities from a later evidence-only change to unrelated PR metadata. Run final merged-main CI. **Do not silently close Issue #70:** its write-capable production Graphiti opt-in and genuinely verified post-write temporal acceptance are distinct.

## Required handback

\`\`\`text
ISSUE70_PREMERGE_PROMOTION=PASS|PARTIAL|BLOCKED|FAIL
REVIEWED_SOURCE_SHA=b126b6d415a3f8706e0c8c22b219cca2161a7465
REVIEWED_SOURCE_TREE=dacb27120deef3e8bfa27b50222bf20cb60c450c
HOST_SOURCE_INSTALLED=YES|NO
INSTALLED_CONFIG_GRAPHITI_CAPTURE=DISABLED|OTHER
OPERATOR_POLICY_PRODUCTION_ACTIVATION=FALSE|UNKNOWN|TRUE
BEFORE_FILE_MANIFEST=<path/hash>
AFTER_FILE_MANIFEST=<path/hash>
ROLLBACK_BACKUP=<private path/hash>
OPERATOR_QUIESCENCE=<evidence>
SOURCE_RECONSTRUCTION=<forward/reverse/installed hash evidence>
OPENVIKING_RUNTIME=<actual version/state evidence>
FRESH_PROCESS_ACCEPTANCE=<separate process receipt or not_executed>
GATE_ADMISSION_NONREGRESSION=PASS|FAIL|UNVERIFIED
LIVE_STATE_PRESERVATION=PASS|FAIL|UNVERIFIED
DEPLOYED_PRODUCTION_GRAPHITI_WRITES=0|UNVERIFIED
PR73_EVIDENCE_HEAD=<full SHA or none>
PR73_CI=<check/sha/status or pending>
BLOCKERS=<none or exact>
COMMAND_SHAPE_FRICTION=<canonical GHDEV-10 record>
\`\`\`

### Read-only installed-byte helper

The project also ships \`docs/issue-70/deployment/verify_installed_sources.py\`, a read-only
source/installed-byte verifier for the Build/independent Evidence readback boundary.
It requires Python 3.11+, \`git\` and an operator-generated private JSON mapping.
Example mapping **shape only**, not actual host paths:

\`\`\`json
{
  "reviewed_checkout": "/absolute/immutable/release/checkout",
  "gate_toml": "/absolute/current/gate.toml",
  "false_defaults_verified": false,
  "operator_policy_json": null,
  "mappings": [
    {
      "source": "docs/issue-70/implementation/i1-integrated/candidate/gate/openviking_commit_gate.py",
      "installed": "/absolute/installed/gate/openviking_commit_gate.py"
    }
  ]
}
\`\`\`

The helper verifies exact reviewed commit/tree, clean checkout, source hashes
against the committed package manifest, and each installed target against
the same candidate bytes. All installed components must be included in the
actual mapping; the example above is deliberately incomplete. Absent
\`graphiti_enabled\` or \`graphiti_production_approved\` TOML keys are accepted
only if the *host-tested* parser's false defaults have been established and
\`false_defaults_verified=true\` is set in the plan. Run it once after
Build promotion and again independently after fresh-process validation;
store raw sanitized receipts and digests in the private operator directory.

This helper does **not** prove service behavior, process quiescence, backend
inference admission, backups or any protected database identity. Those remain
separate mandatory acceptance observations.
