"""Issue #75: bounded, read-only Graphiti service adapter.

Central-owned code for the existing graphiti_recall_service.Reader. This
module never opens the graph/SQLite itself, creates indices or calls models.
Construct the FalkorDriver outside the running event loop as before.
"""
from __future__ import annotations
import asyncio
import time
from graphiti_relevance import query_plan, hop_entities, rank_rows

# Keep the original explicit group isolation on both endpoints and the edge.
# Only the entity-name-or-fact match differs from the Issue #70 query.
READ_QUERY = """MATCH (a:Entity)-[r:RELATES_TO]->(b:Entity)
WHERE a.group_id = $group AND b.group_id = $group
  AND r.group_id = $group
  AND (toLower(a.name) CONTAINS $term OR toLower(b.name) CONTAINS $term
       OR toLower(coalesce(r.fact, '')) CONTAINS $term)
RETURN a.name AS subject, b.name AS object, r.fact AS fact,
       r.episodes AS episode_ids, r.valid_at AS valid_at,
       r.invalid_at AS invalid_at
LIMIT 24"""


async def retrieve_rows(driver, group_id: str, query: str, *, seconds=2.0):
    """Run <=8 bounded literal read queries under ONE wall-clock deadline.

    A saturated 24-row probe is ambiguous (potential missing contributor);
    return no facts, not a possibly falsely temporal-validated subset.
    """
    terms = query_plan(query)
    if not terms:
        return []
    if not isinstance(group_id, str) or not group_id or len(group_id)>128:
        return []
    deadline = time.monotonic()+min(2.0,max(0.1,float(seconds)))
    rows=[]
    async def execute(term):
        remaining=deadline-time.monotonic()
        if remaining<=0:
            raise TimeoutError("Graphiti search budget exhausted")
        raw=await asyncio.wait_for(driver.execute_query(
            READ_QUERY,group=group_id,term=term.lower()),timeout=remaining)
        batch=raw[0] if isinstance(raw,tuple) else raw
        if not isinstance(batch,list):
            raise TypeError("unexpected graph query result")
        if len(batch)>=24:
            # The query LIMIT may have hidden a conflicting episode/edge.
            raise ValueError("saturated Graphiti read boundary")
        for item in batch:
            if not isinstance(item,dict):
                raise TypeError("unexpected Graphiti row")
            rows.append(dict(item))
    for term in terms:
        await execute(term)
    # A maximum of two additional 1-hop neighbor probes produces a bounded
    # 2-hop neighborhood only for explicit dependency/impact questions.
    for anchor in hop_entities(rows,query,limit=2):
        start=len(rows)
        await execute(anchor)
        for item in rows[start:]:
            item["_hop_anchor"]=anchor
    if len(rows)>192:
        raise ValueError("Graphiti aggregate bound exceeded")
    return rows


def bounded_rows_for_format(rows, query, *, episode_ids, episode_overflow,
                            max_groups=24, max_unique_episodes=96):
    """Merge all received edge contributors before temporal/source validation.

    Returns at most 24 complete fact/period groups for the EXISTING
    format_rows and receipt_sources. A malformed/oversized contributor causes
    the fact group to be excluded, not silently granted a passing status.
    """
    if not isinstance(rows,list) or len(rows)>192:
        return []
    groups={}
    for row in rows:
        if not isinstance(row,dict):
            return []
        fact=row.get("fact")
        if not isinstance(fact,str) or not fact or len(fact)>512:
            continue
        key=(fact,str(row.get("valid_at") or ""),
             str(row.get("invalid_at") or ""))
        state=groups.setdefault(key,{"episodes":[],"bad":False,"row":row})
        if episode_overflow(row.get("episode_ids")):
            state["bad"]=True
            continue
        ids=episode_ids(row.get("episode_ids"))
        if not ids:
            state["bad"]=True
            continue
        for episode in ids:
            if episode not in state["episodes"]:
                state["episodes"].append(episode)
                if len(state["episodes"])>32:
                    state["bad"]=True
    prepared=[]
    for state in groups.values():
        if state["bad"] or not state["episodes"]:
            continue
        row={key:val for key,val in state["row"].items()
             if key!="_hop_anchor"}
        row["episode_ids"]=state["episodes"]
        if state["row"].get("_hop_anchor"):
            row["_hop_anchor"]=state["row"]["_hop_anchor"]
        prepared.append(row)
    ordered=rank_rows(prepared,query,limit=144)
    selected=[]
    all_ids=set()
    for row in ordered:
        ids=set(row["episode_ids"])
        if len(all_ids|ids)>max(1,min(96,max_unique_episodes)):
            continue
        all_ids.update(ids)
        selected.append({k:v for k,v in row.items() if k!="_hop_anchor"})
        if len(selected)>=max(1,min(24,max_groups)):
            break
    return selected
