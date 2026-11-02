# Issue 75: material runtime/source drift blocks recovery implementation

**Result: BLOCKED. No recovery candidate was implemented or executed.**

Repository: `fvanevski/opencode-operational-schema-guard`.
Authenticated evidence parent: `9a932539d79db63929edc226c3e9a86f1c0dafc1`.
This packet is a review artifact, not an installed gate change or live-repair approval.

The governing handoff requires a stop when installed source identity differs
materially. Six backend files changed after the still-running backend process
started. Current disk no longer defines the receipt route or keyed session/queue
bindings; the live process still advertises that route and returns the old
`receipt unavailable` response. The gate source and original unknown claim are
unchanged. A source-bound repair must not quietly mix historical, disk and live
runtime authority.

Start with [HANDBACK.md](HANDBACK.md),
[source drift](observations/source-drift-timeline.json),
[live route readback](observations/runtime-receipt-openapi.json), and
[removed receipt route](relevant-installed-source/receipt-route-drift.diff).
The [proposal](RECOVERY_PROPOSAL.json) retains the prior proposal as a redacted,
explicitly historical object. Its original SHA256 matches the Central-reviewed
proposal; it is not a current executable repair plan.

The small [offline characterization](offline/characterize_schema.py) uses
necessary installed method excerpts and the actual current SQLite DDL on a fresh
temporary database only. It reproduces `unknown -> dead` leaving the attempt
latch unresolved, contrasts the real `inflight -> dead` trigger, and shows the
pending selector still exposes backlog. It does **not** implement a repair,
global hold, tenant binding, crash recovery or actual worker admission.

Run from this packet directory:

```text
rtk proxy python3 -B offline/characterize_schema.py
rtk proxy sha256sum -c SHA256SUMS
```

See [results](offline/characterization-results.json),
[backlog and tenant disposition](review/design-disposition.md),
[publication guard coverage](review/publication-guards.json), and
[privacy mapping](review/privacy-hash-mapping.json).

Every member is individually inspectable plaintext. No archive is needed.
Opaque aliases preserve cross-record matching while withholding private session,
request, body-fingerprint, caller and peer identifiers. Blank tenant fields stay
blank because their emptiness is material. Aliases are not valid protocol values.
Original-versus-public hashes are different by design; the mapping does not
claim redacted byte identity. Full originals remain private and untouched.

The manifest inventories payload members and separately names its self/SHA256SUMS
exclusions. SHA256SUMS covers payloads plus the manifest, excluding itself. The
independent post-publication receipt covers **all** remote member bytes, including
SHA256SUMS. A file cannot contain its own eventual Git commit SHA: this packet
identifies its base, and the controller's external final handback records the
published commit and remote readback. No follow-up/amend commit is authorized.

No protected source/config/database change, receipt fabrication, replay, service
pause/restart, model request, Graphiti ingestion or model/account switch occurred.
Native exec-bound effective inference transport remains UNVERIFIED.
