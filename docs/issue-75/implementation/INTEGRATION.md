# SUPERSEDED — do not execute

Following the Issue #75 architectural correction on 2026-11-01, this first-pass retrieval-only packet and its local-agent kickoff are **withdrawn**. It incorrectly assumed that Issue #70's Git source authority, receipts, temporal validation and scheduler were mandatory implementation contracts. Those are prior working fixtures to evaluate, not required architecture. See `docs/issue-75/ARCHITECTURE_REASSESSMENT.md`. The code/tests below remain historical experiments, not the approved Issue #75 implementation. No live host behavior is changed by this notice.

# Central-authored mechanical wiring to current actual host source

These modules are not self-installing. They are intended to minimize semantic
work in the local Build campaign. Authenticate the installed source first.

## Python read-only service

Copy the following centrally supplied modules to the candidate directory
containing the actual host graphiti_recall_service.py:
- graphiti_relevance.py
- graphiti_retrieval_adapter.py

At the top of that service import:
    from graphiti_relevance import query_plan
    from graphiti_retrieval_adapter import retrieve_rows, bounded_rows_for_format

Retain the existing FalkorDriver constructor BEFORE asyncio.run.
Retain the existing authenticated local-only HTTP handler, semaphore,
status codes, receipt_sources, combined_validation and format_rows.

Replace ONLY the internals of Reader.query with the following implementation
adapted to actual installed method/interface names if different:

    if not query_plan(text):
        return []
    from graphiti_core.driver.falkordb_driver import FalkorDriver
    driver=FalkorDriver(host=self.falkor_host,port=self.falkor_port,
                        database=self.group_id)
    if getattr(driver,"_init_task",None) is not None:
        raise RuntimeError("read-only recall must not schedule index creation")
    async def read():
        try:
            return await retrieve_rows(driver,self.group_id,text,seconds=2.0)
        finally:
            await driver.close()
    raw=asyncio.run(read())
    records=bounded_rows_for_format(raw,text,
                episode_ids=episode_ids,episode_overflow=episode_overflow)
    ids=list(dict.fromkeys(i for row in records
                            for i in episode_ids(row.get("episode_ids"))))
    approved=receipt_sources(self.db_path,self.group_id,ids)
    return format_rows(records,approved,self.group_id,limit=limit)

Keep the existing parameterized original READ_QUERY available for a pinned
old-baseline comparison if needed; the new adapter owns the changed
name-or-fact query. Do not modify the trusted receipt/temporal SQL
or reinterpret missing exclusive validation as PASS.

The original handler checks term_for_query(query) before Reader.query.
Update ONLY that cheap query gate to use bool(query_plan(query)) (preserve
HTTP payload, group/token/size checks). Otherwise paraphrases will still
be rejected before the new selection logic runs.

## Native V2 Graphiti client

Copy graphiti-intent.mjs next to candidate graphiti-recall.mjs.
Import graphIntentQuery from that module and delete its historical local
function of the same name plus fixed historical-keyword regex. No other
client request envelope, policy, formatting or OpenViking ordering change.

## All source changes in isolated candidate first

Do not mutate the installed production source/config/Graphiti/SQLite DB
to "test" this packet. A candidate must first pass focused tests, prior
Issue #70 source/temporal suites and a frozen disposable graph benchmark.
After handback, Central will independently review and adjudicate whether
to stage candidate integrated files into the working branch. A later
separately approved live activation requires fresh-process public proof.
