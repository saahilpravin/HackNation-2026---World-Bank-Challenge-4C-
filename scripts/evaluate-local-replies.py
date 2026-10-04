"""Local generation smoke evaluation. Heuristic checks are not measured semantic accuracy."""
from pathlib import Path
import argparse,json,time,urllib.request,statistics
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--endpoint',default='http://127.0.0.1:8080');p.add_argument('--limit',type=int,default=30);args=p.parse_args()
manifest=json.loads((root/'ai/insights/model-manifest.json').read_text())
deadline=time.monotonic()+30
while True:
    try:
        with urllib.request.urlopen(args.endpoint+'/v1/health',timeout=2) as response: health=json.load(response)
        if health.get('model_ready') and health.get('llm',{}).get('ready') and health['llm'].get('model')==manifest['model']: break
    except (OSError,ValueError): pass
    if time.monotonic()>deadline: raise SystemExit('Start the current local backend and model before evaluating.')
    time.sleep(.5)
rows=[]
for line in (root/'ai/replies/cases.jsonl').read_text().splitlines()[:args.limit]:
    case=json.loads(line)
    body={'review':{'id':1,'text':case['text'],'language':case['language'],'rating':case['rating']},'owner_language':'en','business_name':'Evaluation Farm'}
    started=time.monotonic()
    request=urllib.request.Request(args.endpoint+'/v1/reviews/reply-draft',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=120) as response: result=json.load(response)
        drafts=result['drafts'];joined=' '.join(d['text'] for d in drafts).lower();generated=result.get('generation',{}).get('status')=='generated'
        row={'case':case,'generation':result.get('generation'),'elapsed_seconds':round(time.monotonic()-started,3),'distinct':len(drafts)==2 and drafts[0]['text']!=drafts[1]['text'],'mentions_expected_term':any(term in joined for term in case['expected_terms']),'drafts':drafts,'generated':generated}
    except Exception as error: row={'case':case,'generated':False,'error':str(error)}
    rows.append(row);print(case['id'], 'generated' if row['generated'] else 'fallback/error',flush=True)
output=root/'.ai-cache/reply-evaluation.json';output.parent.mkdir(exist_ok=True);output.write_text(json.dumps(rows,indent=2))
latencies=[r['elapsed_seconds'] for r in rows if r.get('generated')]
print(json.dumps({'cases':len(rows),'generated':sum(r['generated'] for r in rows),'distinct_generated':sum(r.get('generated') and r.get('distinct',False) for r in rows),'expected_term_generated':sum(r.get('generated') and r.get('mentions_expected_term',False) for r in rows),'median_seconds':statistics.median(latencies) if latencies else None,'p95_seconds':sorted(latencies)[min(len(latencies)-1,int(.95*len(latencies)))] if latencies else None,'note':'Heuristic smoke results, not human-rated accuracy. Inspect saved outputs.'},indent=2))

if any("error" in row for row in rows): raise SystemExit(1)
