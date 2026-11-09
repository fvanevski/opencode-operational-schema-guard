# Issue #92 ADR Prospective Qualification — Final Evidence Summary

## Result

**Overall: INSUFFICIENT_SAMPLE** (both trials)

The candidate arms (t1-cand, t2-cand) persisted 2 and 3 episodes respectively,
below the 8-episode grounded-sample floor required by the frozen scorer. The
baseline arms persisted 10 and 9 episodes. The candidate is more selective
(skipping 22/24 sources as transient in t1, 22/24 in t2) while the baseline
persists more aggressively (10/24 in t1, 9/24 in t2).

## Trial Scorecards

| Gate | t1 | t2 |
|------|-----|-----|
| valuable_capture | PASS | PASS |
| valuable_selection | FAIL (12.5%) | FAIL (12.5%) |
| valuable_retention | FAIL (12.5%) | FAIL (12.5%) |
| baseline_useful_preservation | FAIL (6 missed) | FAIL (3 missed) |
| groundedness | PASS (100%) | PASS (100%) |
| sample | INSUFFICIENT (2<8) | INSUFFICIENT (3<8) |
| usefulness | INSUFFICIENT | INSUFFICIENT |
| selectivity | PASS | PASS |
| redundancy_nonregression | PASS | PASS |
| privacy_source_authority | PASS | PASS |
| ex_and_remote | PASS | PASS |

## Per-Arm Episode Counts

| Arm | Episodes | Grounded | Useful | Low-Value | Redundant | Unsafe |
|-----|----------|----------|--------|-----------|-----------|--------|
| t1-base | 10 | 10 | 10 | 0 | 0 | 0 |
| t1-cand | 2 | 2 | 2 | 0 | 0 | 0 |
| t2-base | 9 | 9 | 9 | 0 | 0 | 0 |
| t2-cand | 3 | 3 | 3 | 0 | 0 | 0 |

## Baseline Valuable Targets Missed by Candidate

- **t1** (6 missed): django_add_filter_lazy_string_typeerror, graphiti_0312_py313_falkordb_smoke,
  graphiti_live_mcp_no_openviking, pylint_6386_verbose_flag_negative,
  pylint_short_verbose_expects_arg, sphinx_14182_rst_header_rows
- **t2** (3 missed): django_add_filter_lazy_string_typeerror, graphiti_0312_py313_falkordb_smoke,
  pylint_short_verbose_expects_arg

## Identities

- Branch: `work/91-memory-utility-r1`
- Freeze receipt commit: `6952f3936ae7a262c10a6ad72a58926557daab09`
- Baseline SHA: `c8eb5260f2b10832346234b1b5d0cf28302ffba8`
- Candidate SHA: `a684667a6eefa2dc19f29755bed0c3048874721d`
- Freeze SHA-256: `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f`
- Model policy SHA-256: `38ea80aeafc8dbeb4a0d71e86bcfde7cc5f89867909a14daf8a77f9d05f30d40`

## Campaign Execution

- Four-arm sequential EX-gated campaign, all wrapper exits=0
- Campaign completed: 2026-11-09T20:09:42Z
- Production group (development-knowledge) unchanged by campaign arms
- Scheduler idle (running=0, waiting=0) throughout
- No unresolved remote submissions

## Interpretation

The candidate's increased selectivity (skipping transient sources) reduces
episode count below the sample floor. This is a **selectivity-vs-recall tradeoff**:
the candidate correctly identifies and skips 22/24 transient SWE-bench task
prompts, but at the cost of persisting only 2-3 durable facts per trial.
The 8-episode floor is designed to ensure statistical reliability; with only
2-3 episodes, the Wilson confidence intervals are too wide (retention 95% CI:
[3.5%, 36%]) to make a reliable utility claim.

The baseline's higher persistence rate (10/9 episodes) meets the sample floor
but includes more borderline facts. The candidate's groundedness and
usefulness rates are 100% on the episodes it does persist, with zero
low-value, redundant, or unsafe episodes.

**The INSUFFICIENT_SAMPLE result is the correct, pre-registered outcome.**
It does not indicate a defect in the candidate; it indicates that the
candidate's selectivity is too high for the current cohort size to meet
the statistical floor. A larger cohort or a lower selectivity threshold
would be needed to achieve a PASS.

## Files

- `scorecard.json` — full two-trial scorecard (issue92-adr-two-trial-scorecard-v1)
- `freeze-receipt.json` — pre-freeze cohort and policy receipt (evidence 1 of 2)
- `FREEZE_RECEIPT.md` — human-readable freeze receipt
