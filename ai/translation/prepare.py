"""Install the pinned NLLB checkpoint, without cloning an external repository."""
from pathlib import Path
import argparse
import json
import shutil
import tempfile

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = json.loads(Path(__file__).with_name('model-manifest.json').read_text())

def checkpoint_ready(path):
    try:
        provenance = json.loads((path/'lauda-provenance.json').read_text())
        if provenance.get('model') != MANIFEST['model'] or provenance.get('revision') != MANIFEST['revision']: return False
        return all((path/name).is_file() and (path/name).stat().st_size > 0 for name in ('config.json', 'tokenizer_config.json', 'tokenizer.json')) and any(p.stat().st_size > 0 for p in path.glob('*.safetensors'))
    except (OSError, ValueError): return False

def prepare(cache, offline=False):
    checkpoint = cache/'local-nllb'
    if checkpoint_ready(checkpoint):
        print('Pinned NLLB checkpoint is already installed. No download required.', flush=True)
        return checkpoint
    if offline:
        raise SystemExit('Pinned NLLB files are missing. Run npm run translate once with internet enabled.')
    if checkpoint.exists():
        raise SystemExit('An incomplete or different NLLB checkpoint already exists. Preserve it and move it aside before installing the pinned model.')
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
    print('First setup: downloading NLLB model files. Reserve approximately 5 GB of disk space for hub cache and local checkpoint.', flush=True)
    cache.mkdir(parents=True, exist_ok=True)
    options = dict(cache_dir=str(cache/'hub'), revision=MANIFEST['revision'])
    tokenizer = AutoTokenizer.from_pretrained(MANIFEST['model'], src_lang='eng_Latn', **options)
    catalog = json.loads((ROOT/'src/data/nllb-languages.json').read_text())
    if any(row['code'] not in tokenizer.get_vocab() for row in catalog): raise RuntimeError('Language catalog is incompatible with the pinned NLLB tokenizer.')
    model = AutoModelForSeq2SeqLM.from_pretrained(MANIFEST['model'], use_safetensors=True, low_cpu_mem_usage=False, **options)
    staging = Path(tempfile.mkdtemp(prefix='.nllb-install-', dir=cache))
    try:
        model.save_pretrained(staging, safe_serialization=True)
        tokenizer.save_pretrained(staging)
        (staging/'lauda-provenance.json').write_text(json.dumps({'model': MANIFEST['model'], 'revision': MANIFEST['revision']}))
        if not checkpoint_ready(staging): raise RuntimeError('Checkpoint preparation did not finish.')
        staging.rename(checkpoint)
    finally:
        if staging.exists(): shutil.rmtree(staging)
    print('NLLB installed. Runtime translation now loads local files only.', flush=True)
    return checkpoint

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--offline', action='store_true')
    parser.add_argument('--cache', type=Path, default=ROOT/'.ai-cache')
    args = parser.parse_args()
    prepare(args.cache, args.offline)

if __name__ == '__main__': main()
