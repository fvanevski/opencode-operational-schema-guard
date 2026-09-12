# Command-shape cookbook — `fvanevski/firecrawl_skill`

This is a local recovery reference for the Firecrawl repository. It is advisory only: the live operational guard and its current correction payload always win. All identities below are placeholders. Never substitute a cookbook example for current exact-head, mutation, service, or evidence authority.

<!-- command-shape-section:exact-target-disposable-worktree -->
## Exact-target caller-owned disposable worktree

Declare exact target authority in the primary task context:

```text
REQUIRED EXACT HEAD: <TARGET_SHA>
```

When Central/caller authority selects a separate disposable target worktree while preserving the owner checkout, run setup and proof as two calls:

```text
workdir=$OWNER_REPO
git worktree add --detach <ABSOLUTE_DISPOSABLE_PATH> <TARGET_SHA>
```

then:

```text
workdir=<ABSOLUTE_DISPOSABLE_PATH>
git rev-parse HEAD
```

A live correction may advertise a supported wrapper form such as:

```text
rtk git worktree add --detach <ABSOLUTE_DISPOSABLE_PATH> <TARGET_SHA>
```

Prefer the exact shape in the current correction. Wrapper acceptance does not create authority by itself.

Invalid target-admission variants include:

- prefixing cleanup such as `rm ... ;`;
- combining setup and proof with `&&`, `;`, or a newline;
- appending a pipe, status probe, substitution, or another command;
- adding redirection such as `2>&1` when the exact setup grammar does not admit it;
- using `cd <path> && git rev-parse HEAD` instead of setting the tool `workdir`; and
- proving the known owner/base checkout against `<TARGET_SHA>` when the selected route is a separate target worktree.

A repeated rejection after one correctly reshaped attempt is drift/runtime/interface evidence. Do not grep guard implementation source merely to infer a published invocation shape.

<!-- command-shape-section:candidate-source-owner-runtime -->
## Candidate source against the owner-configured research runtime

Keep the authority classes separate:

```text
candidate source/entrypoint = $TARGET_WORKTREE
configured env/runtime      = $OWNER_REPO
persisted service state     = existing local services/PostgreSQL
```

Durable symbolic paths:

```text
$OWNER_REPO/.env
$OWNER_REPO/.venv-research-store/bin/python
$TARGET_WORKTREE/src
$TARGET_WORKTREE/scripts/finspect
```

A target worktree may intentionally lack the owner's `.env` and `.venv-research-store`; that is not itself a failure. After exact target proof, bind candidate source to the owner-configured runtime with the current authorized environment, including:

```text
PYTHONPATH=$TARGET_WORKTREE/src
FIRECRAWL_RESEARCH_PYTHON=$OWNER_REPO/.venv-research-store/bin/python
```

Confirm imports resolve under `$TARGET_WORKTREE/src` before treating host execution as candidate evidence. Do not expose credentials from `$OWNER_REPO/.env` in logs or handbacks.

<!-- command-shape-section:finspect-bounded -->
## Bounded `finspect` inspection

Use the public bounded interface rather than guessing larger pagination limits:

```text
$TARGET_WORKTREE/scripts/finspect operations --run <EXTERNAL_RUN_ID> --limit 100
```

Current public pagination contract:

```text
default limit = 20
accepted maximum = 100
pagination = --cursor <CURSOR>
```

If more rows are required, follow the returned cursor. Do not try `--limit 500` to force one-page output.

<!-- command-shape-section:postgres-readonly -->
## Read-only PostgreSQL corroboration

Use bounded read-only queries only when that evidence route is authorized. Resolve the public run identity before internal identifiers, then inspect only the relations/columns required by the acceptance question. Typical bounded facts include:

```text
research_runs.external_run_id -> internal research run identity
count/group research_invocations.operation for the run
count search_responses for the run/invocation set
count extraction_attempts for the run/invocation set
```

Raw-schema distinctions exposed by the Firecrawl host-evidence trace:

```text
research_invocations uses started_at/completed_at/created_at;
occurred_at is an inspection-surface projection, not a raw research_invocations column.

extraction_attempts raw relation field is invocation_id;
related_invocation_id is an inspection-surface field.
```

When a raw column is not documented, use a bounded `information_schema.columns` read before writing a query instead of repeatedly guessing names. Do not mutate live research data as evidence collection, and do not treat a disposable test database as the live research store.
