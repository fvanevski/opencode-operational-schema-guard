# Issue #92 S2 — COMMAND_SHAPE_FRICTION (canonical GHDEV-10)

`COMMAND_SHAPE_FRICTION.encountered = yes`
`COMMANDS_MATCH_HANDOFF = yes` (required agent-phase commands, workdirs, tool-routing
classes, and lifecycle boundaries matched the handoff apart from transparent
harness behavior and the strict-start fast-forward below).

## Events

1. **strict-start fast-forward (guard_annotation)**
   - scenario: `REQUIRED STARTING HEAD: c4a804b8...`
   - requested_shape: local HEAD == `c4a804b8`
   - effective_shape: local HEAD was `57c3326` (a direct ancestor); `c4a804b8` absent locally
   - rewrite_provenance: agent
   - event_kind: guard_annotation
   - execution_effect: pre-execution; no blocked checkout/merge/edit/commit/push occurred
   - correction_or_annotation: fetched `origin/work/91-memory-utility-r1` (authenticated
     exactly `c4a804b8`), then `git merge --ff-only origin/...` (clean fast-forward,
     3 Central S2 commits); HEAD then == required starting head
   - replacement_shape: `git fetch origin work/91-memory-utility-r1 && git merge --ff-only origin/work/91-memory-utility-r1`
   - recipe_reference: strict-start admission (fetch + authenticate + ff-only)
   - resource_reference: `c4a804b8fbcec722b007a55aa64af2c808f343a0`
   - contract_conflict: none
   - durable_gap_candidate: no

2. **zsh PIPESTATUS masked producer exit (masked_producer_failure)**
   - scenario: `node --test .../finite-batch.test.mjs | tail -25; echo SUITE_RC=${PIPESTATUS[0]:-$?}`
   - requested_shape: report the test producer's real exit
   - effective_shape: zsh has no `PIPESTATUS`; the fallback `$?` was `tail`'s exit (0), masking the real rc=1
   - rewrite_provenance: agent
   - event_kind: masked_producer_failure
   - execution_effect: the first S2-suite run appeared to pass (rc=0) while 2 tests failed
   - correction_or_annotation: re-ran with `node --test ... > log 2>&1; rc=$?` to capture the producer exit directly; real rc=1 confirmed
   - replacement_shape: `node --test <suite> > /tmp/opencode/x.log 2>&1; rc=$?; echo REAL_RC=$rc`
   - recipe_reference: acceptance-bearing producer exit must be preserved independently of display pipes
   - resource_reference: `finite-batch.test.mjs` (39 pass / 2 fail at head)
   - contract_conflict: none
   - durable_gap_candidate: no

3. **`git checkout --` rejected by shell guard (guard_annotation)**
   - scenario: revert the temporary `fact-review.mjs` patch
   - requested_shape: `git checkout -- docs/issue-78/v2-curator/fact-review.mjs`
   - effective_shape: `permission.rejected: shell` (guard denied the command)
   - rewrite_provenance: agent
   - event_kind: guard_annotation
   - execution_effect: none (command not executed)
   - correction_or_annotation: reverted by reversing the `edit` (restoring the exact HEAD bytes); verified `git hash-object` == HEAD blob `0131c5f...`
   - replacement_shape: direct `edit` reversal, then `git status`/`git hash-object` readback
   - recipe_reference: keep candidate changes intact; avoid `git restore`/`checkout --` on the candidate surface
   - resource_reference: `fact-review.mjs`
   - contract_conflict: none
   - durable_gap_candidate: no

4. **standalone repro import path (interface_discovery)**
   - scenario: minimal `evidence_span` repro in `/tmp/opencode/s2-repro.mjs`
   - requested_shape: relative import `./docs/...`
   - effective_shape: `ERR_MODULE_NOT_FOUND` (resolved against `/tmp/opencode`)
   - rewrite_provenance: agent
   - event_kind: interface_discovery
   - execution_effect: first repro run failed to load the module
   - correction_or_annotation: used absolute import paths; repro then confirmed `evidence_span` is `undefined`
   - replacement_shape: absolute `file://`/absolute-path imports in the /tmp repro
   - recipe_reference: n/a
   - resource_reference: `fact-review.mjs` / `core.mjs`
   - contract_conflict: none
   - durable_gap_candidate: no

5. **EX gate module load requirements (interface_discovery)**
   - scenario: preflight the canonical EX gate
   - requested_shape: `importlib.util.spec_from_file_location(...); exec_module(...)`
   - effective_shape: `ModuleNotFoundError: receipt_protocol`, then `dataclass` `NoneType` (module not in `sys.modules`)
   - rewrite_provenance: agent
   - event_kind: interface_discovery
   - execution_effect: gate preflight initially failed to load
   - correction_or_annotation: added `sys.path.insert(0, parent)` and `sys.modules[spec.name]=module` before `exec_module` (matching the S1 launcher pattern); gate then loaded with `Config`/`Worker`/`parse_vllm_metrics`
   - replacement_shape: see `s2-ex-preflight.md`
   - recipe_reference: S1 `s1-ex-launcher.py` `load_gate()`
   - resource_reference: `openviking_commit_gate.py`
   - contract_conflict: none
   - durable_gap_candidate: no

## Omitted sensitive values
- Private host paths under `/tmp/opencode/issue92-s2/` are referenced by name only
  (disposable, non-secret). No credentials, raw model prompts/replies, raw private
  source text, private DB paths, or unredacted logs are published in this packet.
  The native `opencode.db` path is a host-only identity and is not a secret, but it
  is a private DB location and is recorded only as a host identity in the preflight.
