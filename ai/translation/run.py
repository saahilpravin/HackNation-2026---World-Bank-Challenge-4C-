"""Local NLLB experiment. No app/user data is transmitted for inference."""
import argparse
import json
import re
from pathlib import Path
from prepare import MANIFEST, prepare
import time

MODEL = "facebook/nllb-200-distilled-600M"
LANGUAGES = {row["name"]: row["code"] for row in json.loads((Path(__file__).resolve().parents[2] / "src/data/nllb-languages.json").read_text())}


def resolve_language(value):
    if value in LANGUAGES: return value
    aliases = {"en": "eng_Latn", "sw": "swh_Latn", "fr": "fra_Latn", "es": "spa_Latn", "de": "deu_Latn", "it": "ita_Latn", "pt": "por_Latn", "ar": "arb_Arab", "zh": "zho_Hans", "ja": "jpn_Jpan"}
    code = aliases.get(value, value)
    return next((name for name, item in LANGUAGES.items() if item == code), None)


def validate(row):
    if not isinstance(row.get("text"), str) or not row["text"].strip():
        raise ValueError("Each case needs nonempty text.")
    source, target = resolve_language(row.get("from")), resolve_language(row.get("to"))
    if source is None or target is None:
        raise ValueError("Choose a supported language for from/to.")
    row["from"], row["to"] = source, target
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
    parser.add_argument("--revision", default=MANIFEST["revision"], help="Use recorded commit hash for repeatability.")
    args = parser.parse_args()
    rows = [validate(json.loads(line)) for line in args.cases.read_text().splitlines() if line.strip()]
    if not rows:
        raise ValueError("No translation cases supplied.")
    import torch
    import transformers
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
    started = time.perf_counter()
    if args.revision != MANIFEST["revision"]:
        raise ValueError("Revision differs from project model-manifest.json; update the manifest deliberately first.")
    checkpoint = prepare(args.cache, args.offline)
    provenance = json.loads((checkpoint / "lauda-provenance.json").read_text())
    tokenizer = AutoTokenizer.from_pretrained(checkpoint, src_lang="eng_Latn", local_files_only=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(checkpoint, use_safetensors=True, low_cpu_mem_usage=False, local_files_only=True).eval()
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
