"""Run project-local Ollama. --setup pulls Qwen once while online."""
from pathlib import Path
import argparse,os,shutil,subprocess,time,urllib.request
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--setup',action='store_true');args=p.parse_args()
local=root/'.ai-cache/ollama-runtime/ollama'
cli=str(local) if local.exists() else shutil.which('ollama')
if not cli:raise SystemExit('Install Ollama from https://ollama.com/download first. See docs/LOCAL-INTEGRATION.md.')
env=os.environ.copy();env.update(OLLAMA_MODELS=str(root/'.ai-cache/ollama-models'),OLLAMA_HOST='127.0.0.1:11434',OLLAMA_NO_CLOUD='true')
server=subprocess.Popen([cli,'serve'],env=env,cwd=root)
try:
    for _ in range(30):
        if server.poll() is not None:raise SystemExit('Ollama could not start. Check whether port 11434 is already in use.')
        try:
            urllib.request.urlopen('http://127.0.0.1:11434/api/tags',timeout=1).close();break
        except OSError:time.sleep(.5)
    else:raise SystemExit('Ollama did not become ready.')
    if args.setup:subprocess.run([cli,'pull','qwen3:0.6b'],env=env,check=True)
    print('Small LLM ready on this laptop. Leave this terminal running. Press Ctrl+C to stop.',flush=True)
    server.wait()
except KeyboardInterrupt:pass
finally:
    server.terminate()
    try:server.wait(timeout=10)
    except subprocess.TimeoutExpired:server.kill();server.wait()
