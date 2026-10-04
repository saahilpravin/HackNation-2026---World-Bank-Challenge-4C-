"""Local NLLB experiment. No app/user data is transmitted for inference."""
import argparse
import json
import re
from pathlib import Path
import time

MODEL = "facebook/nllb-200-distilled-600M"
LANGUAGES = {row["name"]: row["code"] for row in json.loads((Path(__file__).resolve().parents[2] / "src/data/nllb-languages.json").read_text())}


def validate(row):
    if not isinstance(row.get("text"), str) or not row["text"].strip():
        raise ValueError("Each case needs nonempty text.")
    if row.get("from") not in LANGUAGES or row.get("to") not in LANGUAGES:
        raise ValueError("Choose a supported language for from/to.")
    return row


def sentence_parts(text):
    # Simple boundary baseline; abbreviations should be checked by the operator.
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+|\n+", text) if part.strip()]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases", type=Path, default=Path(__file__).with_name("cases.jsonl"))
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / "results/latest.json")
    parser.add_argument("--cache", type=Path, default=Path(__file__).resolve().parents[2] / ".ai-cache")
    parser.add_argument("--offline", action="store_true", help="Require previously downloaded files; no network.")
    parser.add_argument("--revision", default="main", help="Use recorded commit hash for repeatability.")
    args = parser.parse_args()
    rows = [validate(json.loads(line)) for line in args.cases.read_text().splitlines() if line.strip()]
    if not rows:
        raise ValueError("No translation cases supplied.")
    import torch
    import transformers
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
    started = time.perf_counter()
    options = {"cache_dir": str(args.cache), "local_files_only": args.offline, "revision": args.revision}
    checkpoint = args.cache / "local-nllb"
    manifest_path = checkpoint / "lauda-provenance.json"
    if args.offline:
        if not manifest_path.exists():
            raise ValueError("Run once online to assemble the local checkpoint before --offline.")
        provenance = json.loads(manifest_path.read_text())
        if args.revision != "main" and args.revision != provenance["revision"]:
            raise ValueError("Cached checkpoint revision differs from requested revision.")
        tokenizer = AutoTokenizer.from_pretrained(checkpoint, src_lang="eng_Latn", local_files_only=True)
        model = AutoModelForSeq2SeqLM.from_pretrained(checkpoint, use_safetensors=True, low_cpu_mem_usage=False, local_files_only=True).eval()
    else:
        tokenizer = AutoTokenizer.from_pretrained(MODEL, src_lang="eng_Latn", **options)
        model = AutoModelForSeq2SeqLM.from_pretrained(MODEL, use_safetensors=True, low_cpu_mem_usage=False, **options).eval()
        provenance = {"model": MODEL, "revision": getattr(model.config, "_commit_hash", None)}
        checkpoint.mkdir(parents=True, exist_ok=True)
        model.save_pretrained(checkpoint, safe_serialization=True)
        tokenizer.save_pretrained(checkpoint)
        manifest_path.write_text(json.dumps(provenance))
    load_ms = round((time.perf_counter() - started) * 1000)
    results = []
    for row in rows:
        tokenizer.src_lang = LANGUAGES[row["from"]]
        start = time.perf_counter()
        translated_parts = []
        parts = sentence_parts(row["text"])
        for part in parts:
            inputs = tokenizer(part, return_tensors="pt", truncation=False)
            if inputs.input_ids.shape[1] > 512:
                raise ValueError("Sentence exceeds 512 tokens. Shorten it; do not silently truncate.")
            with torch.inference_mode():
                tokens = model.generate(**inputs, forced_bos_token_id=tokenizer.convert_tokens_to_ids(LANGUAGES[row["to"]]), max_new_tokens=256, num_beams=2)
            if tokens[0][-1].item() != tokenizer.eos_token_id:
                raise ValueError("Output reached the token limit before finishing; retry a shorter input.")
            translated_parts.append(tokenizer.batch_decode(tokens, skip_special_tokens=True)[0])
        elapsed = round((time.perf_counter() - start) * 1000)
        text = " ".join(translated_parts)
        results.append({**row, "translation": text, "latencyMs": elapsed, "source": "local-laptop-model", "humanReviewed": False, "segments": len(parts)})
        print(json.dumps(results[-1], ensure_ascii=False), flush=True)
    report = {"model": MODEL, "revision": provenance["revision"], "device": "CPU laptop", "offlineRequested": args.offline, "loadMs": load_ms, "torch": torch.__version__, "transformers": transformers.__version__, "results": results, "note": "Local laptop inference, not measured phone performance. Cases are authored smoke tests, not FLORES or an accuracy benchmark."}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
