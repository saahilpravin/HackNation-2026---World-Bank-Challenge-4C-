"""Local Ollama launcher. --setup downloads the pinned model once while online."""
from pathlib import Path
import argparse, json, os, shutil, subprocess, time, urllib.request
root = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(); p.add_argument('--setup', action='store_true'); args = p.parse_args()
manifest = json.loads((root/'ai/insights/model-manifest.json').read_text())
local = root/'.ai-cache/ollama-runtime/ollama'
cli = str(local) if local.exists() else shutil.which('ollama')
if not cli: raise SystemExit('Install Ollama from https://ollama.com/download first. See docs/design-doc.md.')
env = os.environ.copy(); env.update(OLLAMA_MODELS=str(root/'.ai-cache/ollama-models'), OLLAMA_HOST='127.0.0.1:11434', OLLAMA_NO_CLOUD='true')
def tags():
    with urllib.request.urlopen('http://127.0.0.1:11434/api/tags', timeout=2) as response: return json.load(response)['models']
def verify():
    if not any(m['name'] == manifest['model'] and m['digest'] == manifest['digest'] for m in tags()):
        raise SystemExit('Pinned Qwen model is missing or its digest changed. Run --setup online, then check model-manifest.json before changing the pin.')
try: tags(); existing = True
except OSError: existing = False
server = None
try:
    if not existing:
        server = subprocess.Popen([cli, 'serve'], env=env, cwd=root)
        for _ in range(30):
            if server.poll() is not None: raise SystemExit('Ollama could not start. Check port 11434.')
            try: tags(); break
            except OSError: time.sleep(.5)
        else: raise SystemExit('Ollama did not become ready.')
    if args.setup: subprocess.run([cli, 'pull', manifest['model']], env=env, check=True)
    verify()
    if existing: print('An existing local Ollama service has the pinned Qwen model. Keep that service running.');
    else:
        print('Pinned Qwen ready locally. Leave this terminal running. Ctrl+C stops it.', flush=True)
        server.wait()
except KeyboardInterrupt: pass
finally:
    if server:
        server.terminate()
        try: server.wait(timeout=5)
        except subprocess.TimeoutExpired: server.kill(); server.wait()
