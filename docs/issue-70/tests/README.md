# Issue #70 — Red regressions for Phase 1 candidate

Source basis: uploaded archive SHA-256
`caeeddc5b48f303fa3ae489de1c416fe41bdcfa50d3619360fb904761f76e705`;
`openviking-v2.patch` SHA-256
`a4cd60e34ed50757ffc5bf99986a054fdee7055e729e155f3fc7da14803fea85`.

`central-authentication-regressions.test.mjs` is a **Central-authored
regression test source**, not a test intended to pass against the
unchanged Phase 1 candidate. It imports `../candidate-capture.mjs`,
so copy it into the isolated authenticated OpenViking V2
`tests/` folder and run:

```bash
node --test tests/central-authentication-regressions.test.mjs
```

Central independently reconstructed the new module from the uploaded patch
and ran this file with Node v22.16.0. All **three tests failed as expected**:
unverified `source_verified` promotion, alternate logical digests
for the same event, and uncaught optional enqueue error. The existing
candidate's six tests still passed (6/6). Both results must be preserved
until a correct implementation passes both test sets.

The tests do not independently prove production event-hook ordering,
persisted queue conflict handling or cross-process lease ownership.
For additional findings and required authoritative-source readback see
`../phase1-independent-review.md`.

The next correction packet should resolve B1/B2/B3 and I1/I2/I3/I4
as one bounded campaign; it must not change acceptance criteria or turn
off the new regressions to obtain PASS. Keep new Graphiti inference disabled.
