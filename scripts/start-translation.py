"""Prepare NLLB from the pinned model hub revision and run it locally.

Default: install/download missing dependencies once, then serve cached weights.
--offline: prohibit dependency installation and downloads.
--setup-only: prepare local files without starting the service.
"""
from pathlib import Path
import argparse
import json
import os
import shutil
import subprocess
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]

def python_for_environment(root=ROOT):
    executable = root / '.venv-ai' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
    return executable

def bootstrap(offline, root=ROOT):
    executable = python_for_environment(root)
    if not executable.exists():
        if offline:
            raise SystemExit('Python environment is missing. Run npm run translate once while online.')
        suitable = next((shutil.which(name) for name in ('python3.12', 'python3.11', 'python3.10') if shutil.which(name)), None)
        if not suitable and (3, 10) <= sys.version_info[:2] <= (3, 12): suitable = sys.executable
        if not suitable:
            raise SystemExit('Install Python 3.12 first, then run npm run translate. The pinned PyTorch version needs Python 3.10–3.12.')
        subprocess.run([suitable, '-m', 'venv', str(root / '.venv-ai')], check=True)
    check = subprocess.run([str(executable), '-c', "import torch,transformers,sentencepiece; assert torch.__version__.split('+')[0]=='2.8.0'; assert transformers.__version__=='4.48.3'"], capture_output=True)
    if check.returncode:
        if offline: raise SystemExit('Translation dependencies are missing or incompatible. Run npm run translate once online.')
        subprocess.run([str(executable), '-m', 'pip', 'install', '-r', str(root/'ai/translation/requirements.txt')], check=True)
    return executable

def existing_local_service(port):
    try:
        request = urllib.request.Request(f'http://127.0.0.1:{port}/health', headers={'Origin': 'http://localhost:8087'})
        with urllib.request.urlopen(request, timeout=2) as response: health = json.load(response)
        return health.get('ready') is True and health.get('model') == 'facebook/nllb-200-distilled-600M'
    except (OSError, ValueError): return False

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--offline', action='store_true')
    parser.add_argument('--setup-only', action='store_true')
    parser.add_argument('--bind', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8085)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535: parser.error('Port must be 1–65535.')
    if not args.setup_only and args.bind == '127.0.0.1' and existing_local_service(args.port):
        print(f'NLLB is already running locally on port {args.port}. No separate repository is needed.')
        return
    executable = bootstrap(args.offline)
    env = os.environ.copy()
    env.update(HF_HOME=str(ROOT/'.ai-cache'), HF_XET_CACHE=str(ROOT/'.ai-cache/xet'), HF_HUB_DISABLE_TELEMETRY='1')
    command = [str(executable), str(ROOT/'ai/translation/prepare.py')]
    if args.offline: command.append('--offline')
    subprocess.run(command, cwd=ROOT, env=env, check=True)
    if args.setup_only: return
    env.update(HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1')
    try:
        subprocess.run([str(executable), str(ROOT/'ai/translation/server.py'), '--bind', args.bind, '--port', str(args.port)], cwd=ROOT, env=env, check=True)
    except KeyboardInterrupt: pass

if __name__ == '__main__': main()
