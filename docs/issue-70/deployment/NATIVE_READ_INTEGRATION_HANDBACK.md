# Issue #70 native read producer: host integration handback

Result: **BLOCKED — SOURCE_API_MISMATCH**, not ready for acceptance.
The mechanical package is reconstructed; the producer does not nominate a genuine
successful stock-V2 read. No production activation is authorized or performed.

Central source authenticated from origin: `854c5ea446eef798001b4a2a161330cf3aade254`,
tree `b1a3652eedf38feac2c6778aa36a278b2b70b699`.
Installed source readback passed for all 15 critical files against approved
`b126b6d415a3f8706e0c8c22b219cca2161a7465` / tree
`dacb27120deef3e8bfa27b50222bf20cb60c450c`, unchanged before/after.
Production Graphiti enablement and approval remain false. Ten protected config/source
hashes also match the earlier activation-preflight identities on current readback.

The new V2 patch has 10 changed-file entries and reconstructs all 11 candidate
files byte-for-byte. Reverse restores the original index/package and removes all
nine introduced files. The historical index is `6899822ec75a16ba05578d4ba165dfe8f913f3d37a4d96717767a170b906766d`;
it was recovered by reversing the authenticated approved package and independently
matched to preserved pre-promotion originals. The promoted candidate was never
misrepresented as the historical base. Gate/backend patches are unchanged.
The manifest, inventory and checksums include the new module and test.
Future promotion mapping must include `candidate/openviking-v2/read-source-producer.mjs`
to the corresponding installed V2 plugin directory; the approved-installed-source
verifier remains pinned to the existing deployment and is intentionally unchanged.

Verification: V2 **29/29**, repository **493/493**, V4 memory/session/hybrid
regressions **24/24**, repository static checks and diff hygiene passed. Python/gate,
GPU, real Graphiti and full OpenViking deployment campaigns were not repeated.

Stock installed OpenCode **v2.2.5**, binary SHA-256
`8d060e1d2fbb9bb44cf09ae6ed1f3f6a7cff070b5227e2f90970132b23a92050`,
ran in a fresh disposable HOME/XDG/project through the installed admission launcher.
The unchanged Central candidate was loaded through a transparent hook-observer
wrapper, preserving the required copied V4 sibling imports. Every callback received
the original native event unchanged. Only a local stub model was used. The gate
used the existing GateServer/QueueDB contract with a private DB, disposable
`issue70_native_read` group, production_activation=false, no draining worker or
Graphiti adapter. Source-policy canonical paths and SHA-256 were identical for
producer and disposable gate. Raw CLI output and databases are excluded from the
sanitized evidence packet.

Real before/after hooks correlate exact session, message and call IDs. A clean
committed authorized JSON read completes with `input: {path: <absolute path>}`,
`status: completed`, and `result.metadata: {truncated: false}`. There is **no
metadata.display**. `result.output` is a structured object with string fields
`type`, `uri`, `name`, `content`, `encoding`, `mime`; content is not retained.
Native `session.tool.success.executed=false` is observed for the same IDs.

The producer instead requires `input.filePath` and metadata.display with file
type/path/truncated proof. It therefore rejects the successful read before Git
attestation or enqueue. The authentic disposable Git record is independently
pinned, but **no producer-derived Git reference or durable nomination exists**.
All five final CLI turns exit 0; that is not producer success. Dirty, failed,
off-policy and genuinely partial reads produce zero rows. Partial read emits
metadata.truncated=true. These negatives are not sufficient positive qualification
while the producer rejects every native read. Duplicate durable delivery remains
unqualified. Ten native context hook invocations and the baseline event subscriber
remain active with autoRecall/autoCapture disabled; real backend recall is outside
this isolated test.

Smallest proposed Central source repair: use the native `path` field in exact
before/after correlation and eligibility; authenticate full-file proof from the
installed structured output and metadata truncation contract; retain immutable
Git byte equality and every policy/negative guard. Update producer fixtures to
the captured native shape. Do not fabricate metadata.display. This is substantive
source authority work and was **not applied** by Build.

Actual build harness: managed Codex app-server **0.166.0**, verified from /proc
executable and argv[1]=app-server. The direct-CLI preference was not satisfied by
the invoking environment. Stock OpenCode qualification itself used explicit CLI
children, private server URL and an admission lease. No harness trust state was
edited to conceal this provenance.

Private packet: `/home/filip/.issue70-promotion/evidence/native-read-ediiy5kv`.
See `qualification-native-read.json` for source identities and exact test commands;
the private packet contains bounded native shapes, source/config readbacks,
GHDEV-10 command friction and a SHA-256 manifest. Published commit/tree and exact-head
CI are recorded after publication in that packet to avoid self-referential hashes.
Central must repair and independently review this same PR before acceptance.
