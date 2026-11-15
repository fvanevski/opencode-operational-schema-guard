# Issue #93 — additive snapshot-hash reconstruction erratum

Status: **HOST-REPORTED ROOT-CAUSE CORRECTION, published as additive evidence**.
This document supersedes only the inaccurate "source-snapshot provenance is
broken / dc597c69 does not reproduce" interpretation in
docs/issue-93/evidence/holdout-adjudication/{README.md,diagnostic.json}
and the original commit message at
385781f0705dcd2202907bd3a568aed0725e27a5.
Those immutable records remain preserved as originally published.

## Immutable identities

- Original frozen source snapshot SHA256:
  dc597c690b0e8990b925b01467269f530d37dfb2dd7730663bdda46680e7231b
- Development manifest SHA256:
  3e799c461080985324c58d487ec6327e7616436b546ee9aa2dce3a67251919db
- Exposed holdout manifest SHA256:
  3f9eaebb6debe949bc9eb07eb777f2851b957adc1a8a3d94bccfcd27fa75c0c9
- Published holdout adjudication commit:
  385781f0705dcd2202907bd3a568aed0725e27a5

## Reproduction method disclosed in the later host handback

The originally frozen snapshot fingerprint was computed with the
freeze-manifest.mjs helper:

    sha(o) = SHA256(UTF8(JSON.stringify(o)))
    joined = fact_pool.map(f => [f.assertion, f.remote_episode_uuid].join('|')).join('\n')
    snapshot_fingerprint = sha(joined)

The argument to sha is a STRING. JSON.stringify therefore encodes the
joined string as a JSON string literal, including wrapping quotes and
escaped newline characters. It is NOT SHA256 of the raw joined UTF-8
string and is NOT SHA256 of the original array of pairs.

The local host reported that applying the exact formula to the
unaltered frozen private source-snapshot.json reproduced the FULL
frozen fingerprint dc597c690b0e8990b925b01467269f530d37dfb2dd7730663bdda46680e7231b.
Reported input lengths: 69,297 characters for raw joined text and
69,952 for JSON-stringified joined text. The earlier wrong hash
of the raw joined string had prefix 1fba71c1. This identifies a
method-mismatch reconstruction error, not demonstrated Graphiti or
ReviewStore drift.

**Evidence strength:** GitHub independently proves the original
publication SHA, content and parent; the formula and exact local
private snapshot digest reproduction were reported by the host agent
in the subsequent handback. Central cannot read the private snapshot
from this repo and has NOT independently executed that reproduction.
No source, manifest, graph or evidence packet was mutated.

## Effect on the acceptance decision

- The earlier assertion that the source-snapshot identity is broken
  is WITHDRAWN on the corrected host evidence, subject to trusted
  local hash-reproduction receipt in the final acceptance packet.
- This does NOT requalify the exposed 4+2 holdout as untouched.
- The unchanged original-semantic comparator was NOT recorded
  during the once-only B2.2 holdout execution. The later
  post-exposure replay reports equivalent candidate and baseline
  outcomes (H01 only; HN01=4; HN02=0) but remains diagnostic-only
  under the currently approved protocol.
- Clean independent model-answer use and remaining exact-head
  gates remain UNVERIFIED.
- No issue acceptance-standard amendment, production selector
  change, PR creation, merge or deployment is authorized here.
