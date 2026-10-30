"""Real Graphiti Core bridge for the disposable Phase 2 qualification.

This module adapts the coordinator-owned ``AwaitedCoreAdapter`` (see
``graphiti_terminal.py``) to the *installed* Graphiti Core client
(``graphiti_core`` 0.31.2) so the directly awaited ``add_episode`` path and the
exact-UUID/group persisted-episode readback run against a **separate,
disposable** FalkorDB graph -- never the live ``graphiti_live`` graph.

It is a qualification harness, not a production install: it constructs a
request-scoped ``Graphiti`` client, drives one awaited ``add_episode``, and
reads the persisted episode back by authoritative UUID + group lookup
(``EpisodicNode.get_by_uuid``), which is the only terminal-persistence proof
the contract accepts. No second scheduler, no MCP queue, no background worker.
"""
from __future__ import annotations

import os
from typing import Any, Awaitable, Callable, Optional

# --- Installed Graphiti Core (authenticated at 0.31.2) ----------------------
from graphiti_core import Graphiti
from graphiti_core.driver.falkordb_driver import FalkorDriver
from graphiti_core.llm_client.openai_client import OpenAIClient
from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient
from graphiti_core.llm_client.config import LLMConfig
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.nodes import EpisodicNode

# The live production graph MUST NEVER be a qualification target.
LIVE_GRAPHITI_DATABASE = "graphiti_live"

# Disposable defaults: a FRESH, isolated FalkorDB graph (separate environment
# from the live ``graphiti_live`` graph) on the local FalkorDB instance, plus
# the configured local model services (LLM on :8002, embedder on :8004).
#
# Graphiti's FalkorDB driver routes a ``group_id`` to ``database=group_id``
# (see ``Graphiti._resolve_request_scope``), so the episode only lands in the
# intended disposable graph when the group_id equals the database name.
_DISPOSABLE_DEFAULTS = {
    "falkor_host": "127.0.0.1",
    "falkor_port": 6382,
    "database": "issue70_phase2_disposable",
    "group_id": "issue70_phase2_disposable",
    "llm_base_url": "http://127.0.0.1:8002/v1",
    "llm_model": "chat",
    "embed_base_url": "http://127.0.0.1:8004/v1",
    "embed_model": "embed",
    "embed_dim": 1024,
}


class LiveGraphTargetError(RuntimeError):
    """Raised when a qualification target would mutate the live graph."""


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


def _is_openai_endpoint(base_url: str) -> bool:
    """Mirror the MCP server factory: official OpenAI endpoints only."""
    return any(d in base_url for d in ("api.openai.com", "openai.azure.com"))


def build_core_client(
    *,
    falkor_host: str = _DISPOSABLE_DEFAULTS["falkor_host"],
    falkor_port: int = _DISPOSABLE_DEFAULTS["falkor_port"],
    database: str = _DISPOSABLE_DEFAULTS["database"],
    llm_base_url: str = _DISPOSABLE_DEFAULTS["llm_base_url"],
    llm_model: str = _DISPOSABLE_DEFAULTS["llm_model"],
    embed_base_url: str = _DISPOSABLE_DEFAULTS["embed_base_url"],
    embed_model: str = _DISPOSABLE_DEFAULTS["embed_model"],
    embed_dim: int = _DISPOSABLE_DEFAULTS["embed_dim"],
) -> Graphiti:
    """Construct a real Graphiti client bound to a disposable FalkorDB graph.

    The target is rejected if it would address the live production graph.
    """
    if database == LIVE_GRAPHITI_DATABASE:
        raise LiveGraphTargetError(
            f"refusing to target live FalkorDB graph {database!r}; "
            "qualification must use a separate disposable graph"
        )
    driver = FalkorDriver(host=falkor_host, port=falkor_port, database=database)
    llm_config = LLMConfig(
        api_key="local",
        model=llm_model,
        base_url=llm_base_url,
        # Route BOTH the primary and the lightweight ("small") prompt paths to
        # the configured local model; otherwise Graphiti falls back to its
        # built-in default small model (gpt-6-luna) and the local service
        # rejects it.
        small_model=llm_model,
    )
    if _is_openai_endpoint(llm_base_url):
        # Official OpenAI API: Responses API client.
        llm = OpenAIClient(config=llm_config)
    else:
        # Local / OpenAI-compatible endpoint (vLLM, LiteLLM, Ollama, ...): the
        # Chat-Completions generic client, matching the MCP server factory.
        # This is the client that correctly handles the local reasoning model's
        # structured-output responses.
        llm = OpenAIGenericClient(config=llm_config, structured_output_mode="json_schema")
    embedder = OpenAIEmbedder(
        config=OpenAIEmbedderConfig(
            api_key="local",
            embedding_model=embed_model,
            embedding_dim=embed_dim,
            base_url=embed_base_url,
        )
    )
    return Graphiti(graph_driver=driver, llm_client=llm, embedder=embedder)


async def prepare_core_client(client: Graphiti) -> Graphiti:
    """Await the driver's index/constraint init before the first operation."""
    driver = client.driver
    if getattr(driver, "_init_task", None) is not None:
        await driver._init_task
    return client


async def close_core_client(client: Optional[Graphiti]) -> None:
    """Release the driver connection; idempotent and error-tolerant."""
    if client is None:
        return
    driver = getattr(client, "driver", None)
    close = getattr(driver, "close", None)
    if close is not None:
        try:
            await close()
        except Exception:  # noqa: BLE001 - cleanup best-effort
            pass


def read_episode_by_uuid(
    client: Graphiti, uuid: str, group_id: str
) -> Awaitable[Optional[Any]]:
    """Exact-UUID, group-scoped persisted-episode readback.

    Resolves the request-scoped driver for ``group_id`` (so a different group
    cannot be read from the wrong graph) and retrieves the episode by its
    authoritative UUID. This is a precise lookup, never a ranked search.
    """
    async def _read() -> Optional[Any]:
        _, driver, _ = client._resolve_request_scope(group_id)
        return await EpisodicNode.get_by_uuid(driver, uuid)

    return _read()


def make_client_factory(**overrides: Any) -> Callable[[], Graphiti]:
    """Return the ``client_factory`` the ``AwaitedCoreDriver``/``AwaitedCoreAdapter``
    expects. It is async so the driver's index/constraint init is awaited inside
    the adapter's running loop before the first ``add_episode``.
    """

    async def factory() -> Graphiti:
        client = build_core_client(**overrides)
        await prepare_core_client(client)
        return client

    return factory


def make_read_episode() -> Callable[[Graphiti, str, str], Awaitable[Optional[Any]]]:
    """Return the ``read_episode`` callback the ``AwaitedCoreAdapter`` expects."""
    return read_episode_by_uuid


if __name__ == "__main__":
    import asyncio

    async def _selftest() -> None:
        client = build_core_client()
        client = await prepare_core_client(client)
        _, driver, _ = client._resolve_request_scope(_DISPOSABLE_DEFAULTS["group_id"])
        print("bridge selftest: driver db =", driver._database)
        await close_core_client(client)
        print("bridge selftest: OK")

    asyncio.run(_selftest())
