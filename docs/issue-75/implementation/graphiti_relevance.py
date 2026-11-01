"""Pure, bounded relevance planning for Graphiti Issue #75.

This module neither authenticates evidence nor touches Graphiti/Git/LLMs.
The calling service must preserve group-bound queries, receipt_sources,
combined_validation, and format_rows (including all temporal contributors).
"""
from __future__ import annotations
import re

SECRET = re.compile(r"(?:-----BEGIN .*PRIVATE KEY-----|Bearer\s+\S+|password\s*[:=]|\bsk-[A-Za-z0-9]{16,}|\bgh[pousr]_[A-Za-z0-9]{20,})", re.I)
TOKEN = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{2,}")
STOP = set(("a an and are as at be by can could do does did for from had has have "
            "how i if in into is it me my of on or our please show so that the their them there "
            "these this to us was were what when where which who why will with would you your "
            "current previous history historical relation relationship related state "
            "decided decision changed explain tell about more know give find check").split())
ALIASES = {
    "depends": ("requires","dependency","relies"),
    "depend": ("depends","requires"),
    "dependency": ("depends","requires"),
    "reliant": ("depends","requires"),
    "break": ("fails","depends","requires"),
    "breaks": ("fails","depends","requires"),
    "broken": ("fails","depends","requires"),
    "downstream": ("depends","requires"),
    "replaced": ("superseded","migrated"),
    "superseded": ("replaced","migrated"),
    "broker": ("messaging","queue"),
}
DEPENDENCY = {"depends","depend","dependency","reliant","break","breaks","broken","fails","downstream","requires","impact","affect"}


def valid_query(text):
    return (isinstance(text,str) and 8 <= len(text) <= 256
            and not re.search(r"[\x00-\x1f\x7f]",text) and not SECRET.search(text))


def query_plan(text, *, aliases=None, limit=6):
    """At most six CPU-only lexical probes, retaining multiple query concepts."""
    if not valid_query(text):
        return []
    words=list(dict.fromkeys(w.lower()[:64] for w in TOKEN.findall(text)
                             if w.lower() not in STOP))
    if not words:
        return []
    limit=max(1,min(6,int(limit)))
    out=words[:limit]
    dictionary=ALIASES if aliases is None else aliases
    for word in words:
        alts=dictionary.get(word,()) if isinstance(dictionary,dict) else ()
        if not isinstance(alts,(tuple,list)) or len(alts)>8:
            continue
        for alt in alts:
            if (isinstance(alt,str) and 3<=len(alt)<=64 and
                    re.fullmatch(r"[A-Za-z0-9_.-]+",alt) and
                    alt.lower() not in out and len(out)<limit):
                out.append(alt.lower())
    return out


def rank_rows(rows,text,*,limit=144):
    """Rank while keeping distinct episode contributors until authority merge."""
    terms=query_plan(text)
    if not terms or not isinstance(rows,list):
        return []
    result=[]
    seen=set()
    for row in rows[:192]:
        if not isinstance(row,dict):
            continue
        fact=row.get("fact")
        if not isinstance(fact,str) or not fact or len(fact)>512:
            continue
        names=(str(row.get("subject") or "")+" "+str(row.get("object") or "")).lower()
        phrase=fact.lower()
        name_hits=sum(t in names for t in terms)
        fact_hits=sum(t in phrase for t in terms)
        hop=row.get("_hop_anchor")
        if not (name_hits or fact_hits) and not (hop and DEPENDENCY.intersection(TOKEN.findall(text.lower()))):
            continue
        # Include full provenance grouping identity; unlike edge text alone,
        # different episode lists must not be collapsed before validation.
        key=(row.get("subject"),row.get("object"),fact,
             str(row.get("valid_at")),str(row.get("invalid_at")),
             str(row.get("episode_ids")))
        if key in seen:
            continue
        seen.add(key)
        score=5*name_hits+2*fact_hits-(1 if hop else 0)
        result.append((-score,str(key),row))
    result.sort(key=lambda x:(x[0],x[1]))
    return [row for _,_,row in result[:max(1,min(limit,144))]]


def hop_entities(rows,text,*,limit=2):
    """A bounded second lookup for explicit dependency/impact questions only."""
    if not valid_query(text) or not DEPENDENCY.intersection(TOKEN.findall(text.lower())):
        return []
    terms=query_plan(text)
    found=[]
    for row in rank_rows(rows,text,limit=24):
        a,b=row.get("subject"),row.get("object")
        if not isinstance(a,str) or not isinstance(b,str):
            continue
        other=(b if any(t in a.lower() for t in terms)
               else a if any(t in b.lower() for t in terms) else "")
        if 3<=len(other)<=64 and other not in found:
            found.append(other)
        if len(found)>=max(1,min(limit,2)):
            break
    return found
