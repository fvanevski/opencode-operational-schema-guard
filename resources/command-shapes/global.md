# Operational command-shape recovery

This resource is advisory. The live operational guard and its current `OPERATIONAL_CORRECTION` payload are authoritative. A cookbook example never admits a rejected command, creates or releases authority, auto-splits a command, retries a mutation, or changes review/Verify/publication policy. If this file and the live guard disagree, stop using the recipe and preserve the guard evidence.

<!-- command-shape-section:exact-target-admission -->
## Exact-target admission

Use exact-target authority only when the task actually targets an exact candidate revision:

```text
REQUIRED EXACT HEAD: <TARGET_SHA>
```

A target movement/setup call and the subsequent proof are separate tool calls. When a disposable worktree is the selected route, use the exact setup shape advertised by the live correction, then set the tool `workdir` to that target workspace and run one bare proof:

```text
workdir=<GOVERNED_OWNER_REPOSITORY>
git worktree add --detach <ABSOLUTE_DISPOSABLE_PATH> <TARGET_SHA>
```

then:

```text
workdir=<ABSOLUTE_DISPOSABLE_PATH>
git rev-parse HEAD
```

Do not prepend cleanup, append proof/status commands, add `&&`/`;`/pipes/redirections/substitutions, or replace the tool `workdir` with `cd ... &&`. Do not prove a known owner/base checkout against the target merely because a separate target worktree is intended.

<!-- command-shape-section:strict-start-proof -->
## Strict-start proof

After a recognized strict-start declaration, set the tool `workdir` to the governed repository and run exactly:

```text
git rev-parse HEAD
```

A mismatch is not a prompt to reshape, reset, switch, or retry the proof. Follow the live correction and authority lifecycle.
