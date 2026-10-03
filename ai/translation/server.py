"""Loopback-only development bridge. Inference uses the downloaded local checkpoint."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import time
from run import MODEL, LANGUAGES, validate, sentence_parts

ORIGINS = {f"http://{host}:{port}" for host in ("localhost", "127.0.0.1") for port in (8082, 8084)}
LOCK = threading.Lock()


class Engine:
    def __init__(self):
        import torch
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        self.torch = torch
        torch.set_num_threads(4)
        checkpoint = Path(__file__).resolve().parents[2] / ".ai-cache/local-nllb"
        self.provenance = json.loads((checkpoint / "lauda-provenance.json").read_text())
        self.tokenizer = AutoTokenizer.from_pretrained(checkpoint, local_files_only=True)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(checkpoint, use_safetensors=True, low_cpu_mem_usage=False, local_files_only=True).eval()

    def translate(self, row):
        validate(row)
        if len(row["text"]) > 4000:
            raise ValueError("Keep your reply under 4,000 characters.")
        start = time.perf_counter()
        self.tokenizer.src_lang = LANGUAGES[row["from"]]
        inputs = [self.tokenizer(part, return_tensors="pt", truncation=False) for part in sentence_parts(row["text"])]
        if any(i.input_ids.shape[1] > 512 for i in inputs):
            raise ValueError("A sentence is too long. Split it into shorter sentences.")
        translated = []
        for item in inputs:
            with self.torch.inference_mode():
                tokens = self.model.generate(**item, forced_bos_token_id=self.tokenizer.convert_tokens_to_ids(LANGUAGES[row["to"]]), max_new_tokens=256, num_beams=2)
            if tokens[0][-1].item() != self.tokenizer.eos_token_id:
                raise ValueError("Translation did not finish. Try shorter sentences.")
            translated.append(self.tokenizer.batch_decode(tokens, skip_special_tokens=True)[0])
        return {"text": " ".join(translated), "source": "local-laptop-model", "modelVersion": f"{MODEL}@{self.provenance['revision']}", "latencyMs": round((time.perf_counter() - start) * 1000)}


def handler(engine):
    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(10)

        def log_message(self, *args):
            pass  # Do not log visitor drafts.

        def permitted(self):
            return self.headers.get("Origin") in ORIGINS and self.headers.get("Host") in ("127.0.0.1:8085", "localhost:8085")

        def respond(self, code, payload):
            body = json.dumps(payload).encode()
            self.send_response(code)
            if self.headers.get("Origin") in ORIGINS:
                self.send_header("Access-Control-Allow-Origin", self.headers["Origin"])
                self.send_header("Vary", "Origin")
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self):
            if not self.permitted():
                return self.respond(403, {"error": "Preview origin not allowed."})
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", self.headers["Origin"])
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Vary", "Origin")
            self.end_headers()

        def do_GET(self):
            if not self.permitted():
                return self.respond(403, {"error": "Preview origin not allowed."})
            if self.path != "/health":
                return self.respond(404, {"error": "Not found."})
            self.respond(200, {"ready": True, "model": MODEL, "source": "local-laptop-model"})

        def do_POST(self):
            if not self.permitted():
                return self.respond(403, {"error": "Preview origin not allowed."})
            if self.path != "/translate":
                return self.respond(404, {"error": "Not found."})
            if self.headers.get("Content-Type") != "application/json":
                return self.respond(415, {"error": "Use JSON."})
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if size < 1 or size > 20000:
                    return self.respond(413, {"error": "Reply is too large."})
                row = json.loads(self.rfile.read(size))
                if not isinstance(row, dict):
                    raise ValueError("Invalid request.")
                validate(row)
            except (ValueError, TypeError):
                return self.respond(400, {"error": "Enter text and supported source/target languages."})
            if not LOCK.acquire(blocking=False):
                return self.respond(503, {"error": "Model is translating another reply. Try again shortly."})
            try:
                self.respond(200, engine.translate(row))
            except ValueError as e:
                self.respond(400, {"error": str(e)})
            except Exception:
                self.respond(500, {"error": "Translation failed. Your draft has not been changed."})
            finally:
                LOCK.release()
    return Handler


if __name__ == "__main__":
    print("Loading cached NLLB on laptop CPU…", flush=True)
    engine = Engine()
    server = ThreadingHTTPServer(("127.0.0.1", 8085), handler(engine))
    server.daemon_threads = True
    print("NLLB ready at http://127.0.0.1:8085 (local preview only)", flush=True)
    server.serve_forever()
