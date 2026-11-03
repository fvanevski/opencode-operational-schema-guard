import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme, Button, TextField, Badge, Card, Flex, Heading, Text, Box, Callout, Select,
  TextArea, Separator, Tabs, Code } from '@radix-ui/themes';
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from '@xyflow/react';
import '@radix-ui/themes/styles.css';
import '@xyflow/react/dist/style.css';
import './style.css';

type Item = {id:string;state:string;project:string;session_id:string;event_count:number;
  reason:string;decision:string;revision:number;updated_at:string;remote_episode_uuid:string|null};
type Fact = {assertion:string;kind:string;source_refs:string[];evidence_class:string;scope:{
  group:string;project:string;workspace:string};observed_at:string;temporal_status:string};
type Event = {event_id:string;source_refs:string[];evidence_class:string;kind:string;excerpt:string;observed_at:string};
type Detail=Item & {group:string;workspace:string;events:Event[];facts:Fact[];audit:{
  at:string;action:string;outcome:string}[]};
type Preview={nodes:Node[];edges:Edge[];note:string;scope:{group:string;project:string}};
const api=async <T,>(path:string,token:string,init:RequestInit={}):Promise<T>=>{
 const res=await fetch(path,{...init,headers:{'x-review-token':token,...(init.body?{'Content-Type':'application/json'}:{})}});
 const data=await res.json();
 if(!res.ok)throw new Error(data.error||'HTTP '+res.status);
 return data as T;
};
function App(){
 const [token,setToken]=useState(''); const [entry,setEntry]=useState('');
 const [error,setError]=useState(''); const [rows,setRows]=useState<Item[]>([]);
 const [selected,setSelected]=useState<string|null>(null);const [detail,setDetail]=useState<Detail|null>(null);
 const [preview,setPreview]=useState<Preview|null>(null);const [counts,setCounts]=useState<Record<string,number>>({});
 const [filter,setFilter]=useState('all');const [search,setSearch]=useState('');
 const [draft,setDraft]=useState('');const [reason,setReason]=useState('');
 const [busy,setBusy]=useState(false);const [theme,setTheme]=useState<'dark'|'light'>('dark');
 const refresh=async(k=token)=>{
  if(!k)return;
  try{
   const [list,status]=await Promise.all([
    api<{items:Item[]}>('/api/clusters',k),
    api<{review_counts:Record<string,number>}>('/api/status',k)]);
   setRows(list.items);setCounts(status.review_counts);setError('');
  }catch(e){setError(String(e));}
 };
 useEffect(()=>{if(!token)return;void refresh();
  const id=window.setInterval(()=>void refresh(),12000);return()=>window.clearInterval(id);
 },[token]);
 useEffect(()=>{if(!token||!selected){setDetail(null);setPreview(null);return;}
  let active=true;
  Promise.all([api<Detail>('/api/clusters/'+selected,token),
   api<Preview>('/api/clusters/'+selected+'/preview',token)])
    .then(([d,p])=>{if(!active)return;setDetail(d);setPreview(p);
      setDraft(d.facts[0]?.assertion||'');setReason(d.reason||'');})
    .catch(e=>{if(active)setError(String(e));});
  return()=>{active=false;};
 },[token,selected]);
 const visible=useMemo(()=>rows.filter(r=>(filter==='all'||r.state===filter)&&
    (r.project.toLowerCase().includes(search.toLowerCase())||
     r.reason.toLowerCase().includes(search.toLowerCase())||
     r.id.includes(search))),[rows,filter,search]);
 async function submit(action:string){
  if(!detail)return;setBusy(true);setError('');
  try{
   const facts= action==='edit-and-approve'&&detail.facts.length?
    [{...detail.facts[0],assertion:draft.trim()},...detail.facts.slice(1)]:detail.facts;
   await api('/api/clusters/'+detail.id+'/review',token,{
    method:'POST',body:JSON.stringify({action,reason:reason.trim()||detail.reason,
      revision:detail.revision,facts})});
   setSelected(null);setDetail(null);await refresh();
  }catch(e){setError(String(e));}finally{setBusy(false);}
 }
 if(!token)return <Theme appearance={theme}><main className="login"><Card size="4">
  <Heading size="6">Graphiti review</Heading><Text color="gray">Private local evidence triage. No model or Graphiti writes from this browser.</Text>
  <TextField.Root type="password" value={entry} placeholder="Paste local operator token"
   aria-label="Review token" onChange={e=>setEntry(e.target.value)}/>
  <Button disabled={entry.length<32} onClick={()=>{setToken(entry);setEntry('');}}>Unlock local inbox</Button>
  <Text size="2" color="gray">The token stays in this page's memory, not browser storage.</Text>
  <Button variant="soft" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>Theme</Button>
 </Card></main></Theme>;
 return <Theme appearance={theme}><div className="layout">
  <header><Flex justify="between" align="center"><Box>
   <Text color="gray" size="1">LOCAL GRAPHITI / SOURCE-GROUNDED REVIEW</Text>
   <Heading size="6">Deferred memory inbox</Heading></Box>
   <Flex align="center" gap="2"><Button variant="soft" onClick={()=>void refresh()}>Refresh</Button>
    <Button variant="outline" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'Light':'Dark'}</Button>
    <Button variant="outline" color="gray" onClick={()=>{setToken('');setSelected(null);}}>Lock</Button></Flex>
  </Flex></header>
  <section className="summary" aria-label="Review status counts">{['deferred','approved','submission_unknown','queued','persisted','skipped'].map(k=>
   <Card key={k}><Text size="1" color="gray">{k.replaceAll('_',' ')}</Text><Heading size="5">{counts[k]||0}</Heading></Card>)}</section>
  {error&&<Callout.Root color="red"><Callout.Text role="alert">{error}</Callout.Text></Callout.Root>}
  <div className="columns">
   <aside><Flex direction="column" gap="2"><TextField.Root placeholder="Filter by project / reason / ID" value={search}
     aria-label="Filter reviews" onChange={e=>setSearch(e.target.value)}/>
    <Select.Root value={filter} onValueChange={setFilter}><Select.Trigger aria-label="Filter by state"/><Select.Content>
      {['all','deferred','approved','submission_unknown','queued','persisted','skipped'].map(s=>
       <Select.Item key={s} value={s}>{s}</Select.Item>)}</Select.Content></Select.Root>
   </Flex><div role="list" className="inbox">{visible.map(r=><button type="button" role="listitem" key={r.id}
      className={'inboxItem '+(selected===r.id?'current':'')} onClick={()=>setSelected(r.id)}>
     <Flex justify="between"><Text weight="bold">{r.project}</Text><Badge color={
       ['submission_unknown','deferred'].includes(r.state)?'orange':r.state==='persisted'?'green':'gray'}>{r.state}</Badge></Flex>
     <Text size="2">{r.reason}</Text><Text size="1" color="gray">{r.event_count} events · {r.session_id.slice(0,18)}</Text>
    </button>)}</div>{visible.length===0&&<Text color="gray">No matching reviews.</Text>}</aside>
   <main className="workspace">{!detail?<Card><Heading size="4">Select an evidence cluster</Heading>
     <Text color="gray">Review source events, inspect proposed facts and record a safe decision. Automated curation continues with this portal closed.</Text></Card>:
     <><Flex justify="between" align="center"><Box><Heading size="4">{detail.project} / {detail.session_id}</Heading>
      <Text size="1" color="gray">Cluster {detail.id} · revision {detail.revision}</Text></Box>
      <Badge>{detail.state}</Badge></Flex><Separator size="4"/>
     <Tabs.Root defaultValue="evidence"><Tabs.List><Tabs.Trigger value="evidence">Evidence and proposal</Tabs.Trigger>
       <Tabs.Trigger value="graph">Graph preview</Tabs.Trigger><Tabs.Trigger value="audit">Decision history</Tabs.Trigger></Tabs.List>
      <Tabs.Content value="evidence"><div className="detailGrid"><div><Heading size="3">Source timeline</Heading>
       {detail.events.map(ev=><Card key={ev.event_id} className="event"><Flex justify="between"><Badge>{ev.kind}</Badge>
         <Text size="1" color="gray">{ev.evidence_class}</Text></Flex>
        <Text as="p" size="2">{ev.excerpt}</Text><Code>{ev.source_refs[0]}</Code>
        <Text size="1" color="gray">{ev.observed_at}</Text></Card>)}</div>
        <div><Heading size="3">Curator proposal</Heading>{detail.facts.map((f,i)=><Card className="event" key={i}>
          <Text size="2" weight="medium">{f.assertion}</Text><Flex gap="1"><Badge>{f.kind}</Badge><Badge color="amber">{f.evidence_class}</Badge>
           <Badge color="gray">{f.temporal_status}</Badge></Flex>
          <Text size="1" color="gray">{f.source_refs.join(' · ')}</Text></Card>)}
         {detail.facts.length===0&&<Text color="gray">No validated assertion. This cluster requires more evidence or dismissal.</Text>}
         <Heading size="3">Operator decision</Heading>
         <TextArea value={draft} onChange={e=>setDraft(e.target.value)}
          placeholder="Edit grounded assertion" aria-label="Grounded assertion edit" rows={4}/>
         <TextField.Root value={reason} onChange={e=>setReason(e.target.value)}
          placeholder="Rationale" aria-label="Decision rationale"/>
         <Flex gap="2" wrap="wrap">
          <Button disabled={busy||detail.facts.length===0||!['approved','deferred'].includes(detail.state)}
           onClick={()=>void submit('edit-and-approve')}>Validate & approve</Button>
          <Button disabled={busy||!['deferred','approved'].includes(detail.state)}
           variant="soft" color="orange" onClick={()=>void submit('defer')}>Keep deferred</Button>
          <Button disabled={busy||!['deferred','approved'].includes(detail.state)}
           variant="soft" onClick={()=>void submit('merge')}>Propose merge</Button>
          <Button disabled={busy||!['deferred','approved'].includes(detail.state)}
           variant="soft" onClick={()=>void submit('propose-supersession')}>Propose supersession</Button>
          <Button disabled={busy||!['deferred','approved'].includes(detail.state)}
           variant="soft" color="red" onClick={()=>{
            if(window.confirm('Discard this proposal? This does not delete Graphiti episodes.'))void submit('discard');
           }}>Discard</Button>
         </Flex>
         <Text size="1" color="gray">Approval records intent for the admitted post-exit worker. It does not call the model or Graphiti from this page.</Text>
         {detail.state==='submission_unknown'&&<Callout.Root color="orange"><Callout.Text>Submission outcome unknown. Do not retry. Await positive Graphiti episode reconciliation.</Callout.Text></Callout.Root>}
        </div></div></Tabs.Content>
      <Tabs.Content value="graph"><section className="graph"><ReactFlow nodes={preview?.nodes||[]} edges={preview?.edges||[]}
       fitView nodesDraggable={false} nodesConnectable={false} elementsSelectable={true}>
         <Background/><Controls/><MiniMap/></ReactFlow></section><Text size="1" color="gray">{preview?.note}</Text></Tabs.Content>
      <Tabs.Content value="audit">{detail.audit.map((a,i)=><Card key={i}><Text>{a.action} → {a.outcome}</Text><Text size="1" color="gray">{a.at}</Text></Card>)}</Tabs.Content>
     </Tabs.Root></>}</main>
  </div><footer><Text size="1" color="gray">Source observations are not verified facts. Persisted episode status requires remote positive readback.</Text></footer>
 </div></Theme>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
