"""Start the prepared Lauda demo with cached models, without downloading anything."""
from pathlib import Path
import json,os,signal,subprocess,sys,time,urllib.request
ROOT=Path(__file__).resolve().parents[1]
children=[]
def ready(url,kind):
    try:
        request=urllib.request.Request(url,headers={'Origin':'http://localhost:8087'})
        with urllib.request.urlopen(request,timeout=2) as response:
            if kind=='web': return response.status==200
            data=json.load(response)
        if kind=='ollama':
            manifest=json.loads((ROOT/'ai/insights/model-manifest.json').read_text())
            return any(m.get('name')==manifest['model'] and m.get('digest')==manifest['digest'] for m in data.get('models',[]))
        if kind=='translation': return data.get('ready') is True and data.get('model')=='facebook/nllb-200-distilled-600M'
        return data.get('model_ready') is True and data.get('llm',{}).get('ready') is True and data.get('llm',{}).get('reply_prompt_version')=='reply-v4-grounded'
    except (OSError,ValueError): return False

def start(name,script,url,kind,args=()):
    if ready(url,kind): print(name+' already ready.',flush=True); return
    child=subprocess.Popen([sys.executable,str(ROOT/'scripts'/script),*args],cwd=ROOT,start_new_session=os.name!='nt'); children.append(child)
    deadline=time.monotonic()+180
    while time.monotonic()<deadline:
        if ready(url,kind): print(name+' ready.',flush=True); return
        if child.poll() is not None: raise RuntimeError(name+' exited before readiness. Check its output and existing port; restart any older service.')
        time.sleep(.5)
    raise RuntimeError(name+' did not become ready. Prepare the models while online first.')

try:
    if not (ROOT/'dist/index.html').exists() or not (ROOT/'backend/target/lauda-api-0.0.1-SNAPSHOT.jar').exists(): raise RuntimeError('Build the web export and Java jar once before starting offline. See docs/LOCAL-QWEN-IMPLEMENTATION.md.')
    start('Qwen','start-small-llm.py','http://127.0.0.1:11434/api/tags','ollama')
    start('NLLB','start-translation.py','http://127.0.0.1:8085/health','translation',('--offline',))
    start('Review API','start-review-ai.py','http://127.0.0.1:8080/v1/health','backend',('--offline','--llm'))
    start('App','serve-demo.py','http://127.0.0.1:8087/','web')
    print('Lauda ready: http://localhost:8087 — leave this terminal running. Ctrl+C stops only services started by this launcher.',flush=True)
    while True:
        if any(child.poll() is not None for child in children): raise RuntimeError('A local service stopped. Restart the demo after checking its output.')
        time.sleep(1)
except KeyboardInterrupt: pass
except RuntimeError as error: print(str(error),file=sys.stderr);sys.exitcode=1
finally:
    for child in reversed(children):
        if child.poll() is None:
            if os.name!='nt': os.killpg(child.pid,signal.SIGTERM)
            else: child.terminate()
    for child in children:
        try: child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            if os.name!='nt': os.killpg(child.pid,signal.SIGKILL)
            else: child.kill()
    if getattr(sys,'exitcode',0): raise SystemExit(sys.exitcode)
