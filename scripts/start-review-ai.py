"""Build once when online, then run with --offline, all on localhost."""
from pathlib import Path
import os, subprocess, argparse, shutil, tempfile, json
p=argparse.ArgumentParser();p.add_argument('--offline',action='store_true');p.add_argument('--llm',action='store_true');p.add_argument('--build-only',action='store_true');args=p.parse_args()
root=Path(__file__).resolve().parents[1]
model=root/'ml/artifacts/encoder/model.onnx'
if not model.exists():raise SystemExit('Run python3 scripts/setup-review-model.py first while online.')
env=os.environ.copy();
if args.llm:
    manifest=json.loads((root/'ai/insights/model-manifest.json').read_text())
    env.update(LAUDA_LLM_ENABLED='true',LAUDA_LLM_MODEL=manifest['model'],LAUDA_LLM_DIGEST=manifest['digest'])
env['LAUDA_MODEL_DIR']=str(root/'ml/artifacts')
# Homebrew Java is not automatically on macOS PATH.
jdk=Path('/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home')
if jdk.exists() and not env.get('JAVA_HOME'):env['JAVA_HOME']=str(jdk)
java=str(Path(env['JAVA_HOME'])/'bin/java') if env.get('JAVA_HOME') else shutil.which('java')
jar=root/'backend/target/lauda-api-0.0.1-SNAPSHOT.jar'
if not args.offline:
    subprocess.run(['mvn','-f',str(root/'backend/pom.xml'),f'-Dmaven.repo.local={root/".maven-cache"}','-DskipTests','package'],cwd=root,env=env,check=True)
if not jar.exists():raise SystemExit('Build once while online before using --offline.')
if args.build_only: raise SystemExit(0)
# Maven may replace target/*.jar while a server is running. Run an isolated copy.
with tempfile.TemporaryDirectory(prefix='lauda-backend-') as runtime:
    runtime_jar=Path(runtime)/jar.name
    shutil.copy2(jar,runtime_jar)
    try:subprocess.run([java,'-jar',str(runtime_jar)],cwd=root,env=env,check=True)
    except KeyboardInterrupt:pass
