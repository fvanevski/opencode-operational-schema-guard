"""Disposable ACTUAL backend: native RAGFS/SQLite QueueFS, Session and TaskTracker.
Only model/extraction work is replaced by a CPU stub. Never use production data.
"""
import asyncio,json,os,socket,sys
from pathlib import Path
from types import SimpleNamespace
import uvicorn
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from openviking.pyagfs import get_binding_client
from openviking.utils.agfs_utils import mount_agfs_backend
from openviking.storage.viking_fs import VikingFS
from openviking.service.task_store import PersistentTaskStore
from openviking.service.task_tracker import TaskTracker,set_task_tracker
from openviking.service.session_service import SessionService
from openviking.storage.queuefs import init_queue_manager
from openviking.storage.queuefs.session_commit_processor import SessionCommitProcessor
from openviking.server.identity import RequestContext,Role
from openviking.server.auth.plugins.api_key import ApiKeyAuthPlugin
from openviking.server.store_assembly import build_api_key_manager
from openviking_cli.session.user_id import UserIdentifier
from openviking.server.routers import sessions
from openviking.session.session import Session
from openviking.message import Message
from openviking.message.part import TextPart
from openviking.service.commit_receipts import runtime
from openviking_cli.exceptions import OpenVikingError

async def main(root,stage):
    root=Path(root);root.mkdir(exist_ok=True)
    if stage=="disabled": os.environ.pop("OPENVIKING_COMMIT_RECEIPT_DB",None)
    else: os.environ["OPENVIKING_COMMIT_RECEIPT_DB"]=str(root/"receipts.sqlite")
    C,_=get_binding_client();client=C(config={"service_name":"issue70-disposable","pathlock":{"provider":"filesystem","lock_expire_secs":1.0}})
    mount_agfs_backend(client,SimpleNamespace(path=str(root/"storage"),backend="local"))
    fs=VikingFS(client);tracker=TaskTracker(PersistentTaskStore(client));await tracker.load();set_task_tracker(tracker)
    service=SessionService(viking_fs=fs)
    queues=init_queue_manager(client)
    queue=queues.get_queue(queues.SESSION_COMMIT,dequeue_handler=SessionCommitProcessor(service),allow_create=True)
    await queue._ensure_initialized()
    # Native persistent QueueFS owns Work reconstruction after a process restart.
    await queues.prepare_task_tracking(tracker)
    ctx=RequestContext(UserIdentifier("a","u"),Role.ROOT)
    for name in ("s","other","skip","legacy"):
        obj=service.session(ctx,name)
        if not await obj.exists():
            obj=await service.create(ctx,session_id=name)
            if name!='skip':
                msg=Message(id="m1-"+name,role="user",parts=[TextPart(text="CPU disposable fixture")])
                await fs.write_file(obj.uri+"/messages.jsonl",(msg.to_jsonl()+"\n").encode(),ctx=ctx)
    state={"busy":0,"stage":"ready","extractions":0,"commit_calls":0,"archive_published":False}
    release=asyncio.Event()
    original=tracker.create
    async def pause_create(*args,**kwargs):
        if kwargs.get("resource_id")=="s" and stage in ("publication","registration") and not state["archive_published"]:
            state["archive_published"]=True
            if stage=="publication":
                state["stage"]="published_before_task";await release.wait()
                return await original(*args,**kwargs)
            result=await original(*args,**kwargs)
            state["stage"]="registered_before_enqueue";await release.wait();return result
        return await original(*args,**kwargs)
    tracker.create=pause_create
    real_commit=service.commit_async
    async def counted(*args,**kwargs):
        state["commit_calls"]+=1
        return await real_commit(*args,**kwargs)
    service.commit_async=counted
    async def cpu_extract(obj,**kwargs):
        state["extractions"]+=1
        if stage=="failure":
            await obj._write_failed_marker(kwargs["archive_uri"],stage="cpu_fixture",error="disposable model failure")
            await tracker.fail(kwargs["task_id"],"disposable model failure",account_id=obj.ctx.account_id,user_id=obj.ctx.user.user_id)
            return
        await obj._viking_fs.write_file(kwargs["archive_uri"]+"/.done",b"{}",ctx=obj.ctx)
        await tracker.complete(kwargs["task_id"],{"session_id":obj.session_id,"archive_uri":kwargs["archive_uri"]},account_id=obj.ctx.account_id,user_id=obj.ctx.user.user_id)
        if stage=="terminal_gap":
            state["stage"]="done_marker_worker_active";await release.wait()
    Session._run_memory_extraction=cpu_extract
    app=FastAPI();app.state.config=SimpleNamespace(auth_mode="api_key",root_api_key="disposable-root")
    app.state.auth_plugin=ApiKeyAuthPlugin()
    app.state.api_key_manager=build_api_key_manager("disposable-root",fs,service_name="issue70-disposable",issue_user_keys=False)
    await app.state.api_key_manager.load()
    sessions.get_service=lambda:SimpleNamespace(sessions=service)
    app.include_router(sessions.receipt_router)
    delayed=False
    @app.middleware("http")
    async def lose_response(request,call_next):
        nonlocal delayed
        response=await call_next(request)
        if stage=="response" and request.method=="POST" and '/commit_receipts/' in request.url.path and not delayed:
            delayed=True;state["stage"]="accepted_before_http";await release.wait()
        return response
    @app.exception_handler(OpenVikingError)
    async def auth_error(request,error):
        return JSONResponse({"error":{"code":error.code}},status_code=401 if error.code=="UNAUTHENTICATED" else 403)
    @app.get("/test/state")
    async def snapshot():
        tasks=await tracker.list_tasks(account_id="a",user_id="u",limit=200)
        return {**state,"tasks":[t.to_dict() for t in tasks],"queue_size":len(await queue.snapshot())}
    @app.post("/test/release")
    async def release_publication(): release.set();return {"ok":True}
    @app.post("/test/drain")
    async def drain():
        await queue.dequeue()
        return {"extractions":state["extractions"],"queue_size":len(await queue.snapshot())}
    @app.post("/test/replay")
    async def replay():
        with runtime().ledger._connect() as db:
            key=db.execute("SELECT request_key FROM receipt_bindings LIMIT 1").fetchone()[0]
        bound=runtime().binding(key)
        obj=service.session(ctx,"s")
        message=(await obj._read_phase1_meta(bound["archive_uri"]))["queue_message"]
        message.update({"_task_account_id":"a","_task_user_id":"u"})
        # Deliberately exercise a late physical QueueFS replay even after the
        # normal TaskWork enqueue boundary would reject terminal task work.
        await queue._async_agfs.write(queue.path+"/enqueue",json.dumps(message).encode())
        return {"ok":True}
    @app.post("/test/legacy")
    async def legacy(): return await service.commit_async("legacy",ctx,keep_recent_count=0)
    @app.post("/test/cancel")
    async def cancel():
        tasks=await tracker.list_tasks(account_id="a",user_id="u",limit=200)
        for task in tasks:
            if task.status.value in ("pending","running"):
                await tracker.cancel(task.task_id,account_id="a",user_id="u")
        return {"ok":True}
    @app.post("/test/busy")
    async def busy(): state["busy"]=1;return {"ok":True}
    @app.post("/test/idle")
    async def idle(): state["busy"]=0;return {"ok":True}
    @app.get("/metrics")
    async def metrics():
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(f"ninfer_requests_running {state['busy']}\nninfer_requests_waiting 0\n")
    sock=socket.socket();sock.bind(("127.0.0.1",0));sock.listen(128)
    (root/"port").write_text(str(sock.getsockname()[1]))
    try:
        await uvicorn.Server(uvicorn.Config(app,log_level="error",access_log=False)).serve(sockets=[sock])
    finally: client.close()

if __name__=='__main__':asyncio.run(main(sys.argv[1],sys.argv[2]))
