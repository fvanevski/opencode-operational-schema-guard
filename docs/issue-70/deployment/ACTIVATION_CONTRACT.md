# Issue #70 — Host integration and operator-controlled activation

## Authority and goal

Current merged source-only baseline is main commit
\`4d4825b8151a1d8272af9da89701954d7ab27822\`, tree
\`1f2db3d9f653192621c718a90887f4a3044c602c\`.
This continuation stages the *production target policy boundary*, installation
rehearsal, and one coherent host qualification campaign. It does not deploy
or enable any production memory capture just by being merged.

The source package at
\`docs/issue-70/implementation/i1-integrated\` is the versioned source
home. The historical repository V1 root is not a stock V2 installation
candidate. The previously generated package patches and manifest must
be regenerated/re-authenticated after the changes to the gate and phase3.

## Source-owned correction

The reviewed Phase 2–4 implementation was intentionally limited to
\`issue70_*\` Graphiti graphs in three independent locations:
the gate bootstrap, the process transport, and the isolated child.
Merely setting \`graphiti_enabled=true\` for a production group would fail.

The continuation introduces an explicit non-disposable target contract:

1. Legacy \`[worker].graphiti_enabled\` remains **false** by default.
2. \`[worker].graphiti_production_approved\` is **false** by default and
   accepts only the TOML Boolean \`true\` as affirmative.
3. The independently read operator Git source policy must have
   \`production_activation: true\`, \`enabled: true\`, and
   \`groups: [<exact configured group>]\`.
4. The configured group must have a bounded alphanumeric/underscore/hyphen
   name. Disposable \`issue70_*\` groups cannot inherit a production
   authorization flag. An ordinary production group cannot be enabled
   through a naming convention or the candidate event payload.
5. \`ProcessCoreClient\` binds the exact target through subprocess arguments;
   the child checks the incoming request's group against that exact
   configured group **before** Graphiti Core construction/add_episode.
6. The independent source-authority, shared lease, scheduler admission,
   durable ingestion identity, completion readback, read-only temporal
   validator and recall authorization remain unchanged.
7. Declared exclusive transitions additionally require the existing
   operator-pinned temporal validator SHA-256, its exact path, source
   contract and category opt-in. Never infer success from graph ingestion.

The graph store's current production contents and the current host's
runtime/configuration/source IDs are **UNVERIFIED by Central**. The local
agent must inspect them read-only before proposing any live write.

## One-campaign local integration and preparation

### Discover / authenticate

Authenticate the *current* installed stock OpenCode V2 executable, plugin
order and hook signatures, V4 sibling dependency, gate service/config,
launcher/admission helper, gate SQLite state, receipt owner API and
OpenViking backend, Graphiti Core interpreter/version, FalkorDB group
topology, source policy, validator digest, and scheduler metrics name.
Use current host paths rather than assuming historical source-ownership
JSON is still current. Record exact SHA-256 source/config identities and
which process owns each file/service. Redact credentials.

Establish whether a live gate has unresolved OpenViking/Graphiti work,
a sticky admission contract, or competing interactive harness processes.
Never delete, reset, truncate or rewrite receipt/queue/SQLite rows to
make admission look idle. Do not access production database with
test helpers or synthetic candidates.

### Rebuild / test entirely outside production

Use one fresh collision-free disposable root and an authenticated exact-SHA
worktree. Recreate the source package against *current* installed originals,
including the complete gate and V2 patches and backend/shim source mapping.
The Phase 3 runtime is executed from an immutable, reviewed release tree;
do not point a running service to a mutable development worktree.

Start CPU regressions with
\`test_production_target_policy.py\`,
\`test_graphiti_process_transport.py\` and
\`test_graphiti_process_transport_extended.py\`. Exercise child-group
mismatch, missing opt-in, wrong policy group, malformed group,
disposable default, disabled config and normal existing Graphiti tests.
Run the full impacted phase2/phase3/phase4, gate, V2 Node, launcher,
receipt and cross-backend tests once. Run genuine service-backed tests
only where a changed behavior needs them; older 212/157 check claims
remain tied to their historical SHAs.

Qualify isolated fresh-process OpenCode V2 with its real plugin discovery
and exact sibling V4 dependency under isolated HOME/XDG/project and
disposable gate/config/lock/SQLite. Verify the real wrapper's shared
admission semantics are not bypassed. Keep credentials and GPU use
off until actual service-backed Graphiti qualification is needed.

For the new group policy, use a **new disposable Graphiti group** for
positive tests even when explicitly passing the production opt-in shape.
The new production-group code path is proven without writing to
\`graphiti_live\` or any other existing host group.
Check intended one-group-only write, failed cross-group call before child,
awaited persistence and exact UUID readback, separately trusted temporal
validation and source-attributed read-only recall.

### Deployment plan, backups and go/no-go

Prepare a deterministic installation map with complete source bytes,
the current-epoch installed hash for every overwritten file, target
paths/modes/owners, sibling source imports, gate/launcher/service wiring
and ordered dependency refresh. Verify forward-and-reverse patch
reconstruction, all SHA256SUMS, current source-bound manifest, package
reproducer, and fresh installation/rollback dry runs.

Prepare backups in a private, versioned local directory and document
the owner-controlled stop/quiescence and rollback sequence. A code
rollback must preserve and continue guarding outstanding durable work:
there is no permission to erase admission contracts, receipt identities,
archive/task/QueueFS records or temporal results. Do not restart a
production service merely for smoke testing.

Prepare two explicit operational configurations:
- installed candidate with \`graphiti_enabled=false\`,
  \`graphiti_production_approved=false\`, no enabled capture policy,
  and baseline OpenViking behavior unchanged;
- a separate *nonactive* operator opt-in proposal naming exactly one
  production group/workspace/categories, Git source repository/ref,
  local recall endpoint/access policy, pinned validator (if exclusive),
  scheduler ownership and recovery/rollback boundaries.

The optional proposal is NOT an activated config. Do not install a new
global write policy, start production Graphiti ingestion or mutate a
live graph/database from this source-only preparation handoff.

### Publication and handback

Update ONE continuation branch \`issue/70-host-activation\` and ONE PR
against merged main. Host agent may correct limited
build/install/path/import/test wiring and host-specific fixture issues
while preserving source authority, global lease, and validation.
Material changes to target authorization, durable state transitions,
backend security or rollback semantics return to Central.
Record exact new head/tree, CI, affected suite counts, installed-epoch
drift, hash/patch/rollback proof, process identities, real disposable
validation and qualified/unqualified facets.

Status \`READY_FOR_CENTRAL_REVIEW\` means the package is safe to
independently review for a later approved deployment. It does not
mean live acceptance or Issue #70 closure.

## Mandatory release boundary

The final production installation/activation is a distinct irreversible-
risk and permission boundary. Issue #70 says filing permits design, not
a new live capture permission. Do not conflate an implementation PR,
host qualification, a disabled live installation, and enabling actual
production Graphiti capture. Central will decide final-source PR merge
and obtain an explicit operator opt-in to the exact production group,
categories, installed/config source identities and rollback posture
before any write-capable production activation.
