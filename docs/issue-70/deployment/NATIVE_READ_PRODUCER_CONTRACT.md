# Issue #70 — native stock-V2 read nomination integration

Status: **Central source implementation staged in draft PR #74**. It does not authorize
or enable production memory capture. The separate operator-selected policy in
the host activation preflight remains a **proposal**, not live configuration.

## Source authority

- Base main after merged PR #73: `76e2e7f96721f38c77ece5b1f29951008c060cc1`.
- Current candidate changes live in `docs/issue-70/implementation/i1-integrated/candidate/openviking-v2/`.
- Live plugin source remains the earlier reviewed disabled-capture commit
  `b126b6d415a3f8706e0c8c22b219cca2161a7465`
  until a separately controlled promotion.

## Root cause and source correction

Stock OpenCode V2 emits a completed tool result for a local read while the
native session tool event's `executed` flag may be false. That flag
tracks provider-side execution, not whether a local tool successfully ran.
The previous observer wrongly required true. The corrected observer only
accepts a Boolean execution field on real `session.tool.success`
events and keeps successful tool-name/call-ID correlation.

A new real producer registers native `execute.before` and
`execute.after` hooks. Before/after must correlate exact
session ID, assistant message ID, call ID and file path. It only processes
`read` with `status=completed`, native `input.path`, a present result,
no explicit offset/limit, and no reported failure/truncation.
Stock OpenCode V2 v2.2.5 does **not** expose `metadata.display`; that field
is not required or fabricated. To remain conservative without an authoritative
display-completeness flag, eligible committed JSON records must be at most
8 KiB and 200 lines. A default read plus these bounds is the supported
nomination trigger; immutable Git-byte equality, not the displayed tool body,
is the source fact authority. Actual local positive delivery must still be
verified in a fresh stock-V2 process.
The Git inspection and bounded candidate enqueue run asynchronously outside
the interactive tool completion path.

The producer uses an **explicit separate source-policy path**
`GRAPHITI_CAPTURE_SOURCE_POLICY_PATH` that must point
to the same exact operator-reviewed JSON file as the gate's
`[worker].graphiti_source_policy`. Before enabling writes,
compare canonical file path and SHA-256, not merely matching prose.
Absent/mismatched policy path fails closed. The existing
`GRAPHITI_CAPTURE_POLICY_PATH` and
`GRAPHITI_CAPTURE_GATE_URL` /
`GRAPHITI_CAPTURE_TOKEN` retain their original roles.

The operator's Git policy fixes one group, workspace, repository root,
trusted branch ref, source prefix and categories. The producer resolves the
local read path canonically under the same workspace/repository, refuses
partial/dirty reads and files outside the approved prefix, loads the
current trusted-ref commit, and requires the on-disk JSON bytes to match
that immutable blob. Only canonical Git references and limited categorical
metadata are nominated. The gate independently re-verifies the Git record,
scope and admission policy; agent/tool metadata is never final authority.

The source permits disposable `issue70_*` qualification groups
only when `production_activation=false`. Non-disposable
groups require `production_activation=true`. Neither case
implicitly flips the live gate's independent
`graphiti_enabled` or
`graphiti_production_approved` controls.

## Required completion within the same PR

1. Reconstruct `patches/openviking-v2.patch`,
   `source-base-manifest.json`,
   `SHA256SUMS` and changed-file inventory from the authenticated
   installed source base. Incorporate the new module and test; prove exact
   forward/reverse identities in disposable copies. Do not substitute the
   old V1 installer.
2. Run the entire candidate V2 Node test suite once, including the new
   producer and local executed=false tests. Validate the actual installed
   OpenCode version's before/after hook and read metadata in a separate,
   private, fresh V2 process. Do not infer this from synthetic fixtures.
3. Exercise one genuine completed local `read` of a committed
   eligible JSON fact in an isolated Git repository, with actual producer
   callback, source Git attestation, candidate HTTP delivery to a disposable
   gate, durable identity and deferred/authorized status. Ensure duplicate
   read-callback delivery is safe, and unmatched/failed/dirty/partial reads
   produce zero delivery. All policy and DB paths must be disposable; no
   Graphiti production write or GPU inference.
4. Prove the original disabled-Graphiti OpenViking memory session and context
   behavior still work and the shared admission contract is not bypassed.
5. Return exact source SHA/tree and artifact hashes, tested command shapes,
   environment/server/harness identity, failure logs and
   `COMMAND_SHAPE_FRICTION`. Central owns semantic repairs,
   final review and the later exact production opt-in.

If a later stock V2 version changes the supported `input.path` or
`status=completed` contract, stop and report its observed, sanitized native
hook shape. Do not fabricate a successful nomination by injecting synthetic
metadata or disabling source and policy safeguards. Central will make the
minimal supported adapter correction in the same PR.

No new issue or PR is required. Host changes are limited to isolated test
and packaging scratch; active installed source/config/service remains unchanged.
