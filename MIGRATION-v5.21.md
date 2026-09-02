# Operational schema v5.21 live migration

This runbook migrates a verified staged v5.21 plugin tree into the live OpenCode
harness without asking the agent to reinterpret the refactor. The staged tree is
authority for plugin content; the live v5.20 tree and live `opencode.json` are
backup sources only.

## Invariants

- Do not edit `/home/filip/.config/opencode/opencode.json` directly.
- Do not mutate the staged v5.21 tree during migration.
- Do not run a concurrent migration or another process that writes the live plugin/config.
  The OpenCode process performing this migration may remain running, but it remains a
  v5.20-loaded runtime until restart and must not exercise v5.21 behavior after the
  live files are replaced.
- Create fresh backup/candidate paths. Never overwrite an earlier backup or
  migration candidate.
- Build the v5.21 config candidate with the staged v5.21 migration script before
  replacing the live plugin.
- If live-plugin validation fails after copying v5.21, restore the plugin backup
  and leave the live config unchanged.
- If atomic config installation fails, restore the plugin backup before starting
  OpenCode again.

## Inputs

Set these to concrete paths before executing the migration:

```text
STAGED_PLUGIN=/absolute/path/to/verified/operational-schema-v5
LIVE_PLUGIN=/home/filip/.config/opencode/plugins/operational-schema-v5
LIVE_CONFIG=/home/filip/.config/opencode/opencode.json
PLUGIN_BACKUP=/home/filip/.config/opencode/plugins/operational-schema-v5.backup-v5.20.0-<unique-id>
CONFIG_BACKUP=/home/filip/.config/opencode/opencode.json.backup-v5.20.0-<unique-id>
CONFIG_CANDIDATE=/tmp/opencode/v521-migration/opencode-v5.21-<unique-id>.json
```

The distributed refactor artifact records the expected Git commit separately.
When using the Git bundle, check out that exact commit/branch. When using the
clean archive, verify its published SHA-256 before extraction.

## 1. Verify the staged tree

From `STAGED_PLUGIN`:

```text
node -p 'require("./package.json").version'
npm run check
npm test
git diff --check                 # Git-bundle checkout only
git status --porcelain=v1        # Git-bundle checkout only; must be empty
git rev-parse HEAD               # Git-bundle checkout only; must equal the published v5.21 commit
```

Required result:

```text
version=5.21.0
npm run check=PASS
npm test=PASS
OPERATIONAL_PLUGIN_TEST_RESULT: PASS
```

## 2. Stage and validate the v5.21 config candidate

Create the candidate with the **staged v5.21** code while the live files are
still untouched:

```text
mkdir -p /tmp/opencode/v521-migration
$STAGED_PLUGIN/scripts/migrate-v521-config.mjs \
  --input $LIVE_CONFIG \
  --output $CONFIG_CANDIDATE
$STAGED_PLUGIN/scripts/validate-config.mjs --candidate $CONFIG_CANDIDATE
```

The migration is intentionally idempotent. It removes the retired
Firecrawl-specific core gateway rules, removes the legacy
`local-agent-assessment.mjs --sha ... --assessment-id ...` permissions,
installs the typed `--spec /tmp/opencode/verify/assessments/*.json` route, and
generalizes repository-local Python validation permissions to `.venv*/bin/...`.

Required marker:

```text
OPERATIONAL_CONFIG_RESULT: PASS
```

Do not proceed if the candidate does not validate.

## 3. Back up and replace the live plugin tree

With no concurrent process writing the live plugin/config:

```text
cp -a $LIVE_PLUGIN $PLUGIN_BACKUP
rsync -a --delete --exclude='.git/' $STAGED_PLUGIN/ $LIVE_PLUGIN/
```

Do not copy the staged `.git` directory into the live plugin directory.

Validate the installed live plugin before changing the live config:

```text
cd $LIVE_PLUGIN
npm run check
npm test
```

If either command fails, remove the failed live tree, restore `PLUGIN_BACKUP` to
`LIVE_PLUGIN`, and stop. Do not install the v5.21 config candidate.

## 4. Atomically install the validated config candidate

Use the newly installed v5.21 installer:

```text
$LIVE_PLUGIN/scripts/install-live-config.mjs \
  --candidate $CONFIG_CANDIDATE \
  --backup $CONFIG_BACKUP
$LIVE_PLUGIN/scripts/validate-config.mjs --candidate $LIVE_CONFIG
```

The installer performs the live-config contract validation again, creates the
backup first, and uses a same-directory atomic rename for `opencode.json`.

If installation or final validation fails, restore `PLUGIN_BACKUP` before
starting OpenCode. Preserve `CONFIG_BACKUP` and the failed candidate as evidence.

## 5. Post-migration proof

Record at minimum:

```text
live plugin package version
npm run check result
npm test result and test count
OPERATIONAL_PLUGIN_TEST_RESULT marker
OPERATIONAL_CONFIG_RESULT marker
plugin backup path
config backup path
config candidate path
staged artifact/commit identity
```

After recording the migration result, end the current OpenCode session and start a
fresh process. Do not use the process that loaded v5.20 to exercise the new gateway
or to treat v5.21 policy as active. The first repository-level host assessment in
the fresh process should use one concrete
`opencode-local-assessment-v1` spec and one invocation of:

```text
/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs \
  --spec /tmp/opencode/verify/assessments/<concrete-name>.json
```

A stale local branch sharing the PR head-ref name is not an admission failure;
the gateway proves remote authority and owns an isolated exact-head named
worktree instead.
