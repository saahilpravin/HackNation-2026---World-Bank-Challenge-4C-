"""Download the exact tested encoder once; subsequent startup requires no internet."""
from pathlib import Path
import hashlib
import subprocess
ROOT=Path(__file__).resolve().parents[1]
MODEL=ROOT/'ml/artifacts/encoder/model.onnx'
SHA='10f7a088420252b26caf819236ca2c9d2987afd0fc06fec7553b542a5655a05a'
REV='e8f8c211226b894fcb81acc59f3b34ba3efd5f42'
def digest(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f,'sha256').hexdigest()
if not MODEL.exists() or digest(MODEL)!=SHA:
    MODEL.parent.mkdir(parents=True,exist_ok=True)
    temp=MODEL.with_suffix('.onnx.part')
    subprocess.run(['curl','--fail','--location','--retry','3',f'https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2/resolve/{REV}/onnx/model.onnx','--output',str(temp)],check=True)
    if digest(temp)!=SHA:
        temp.unlink(missing_ok=True)
        raise SystemExit('Model checksum mismatch; model was not installed.')
    temp.replace(MODEL)
print('Review model verified. Runtime inference does not use the internet.')
