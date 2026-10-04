"""Serve the exported SPA entirely on this laptop, including deep-link reloads."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
ROOT=Path(__file__).resolve().parents[1]/'dist'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def do_GET(self):
        if not Path(self.translate_path(self.path)).exists():
            if Path(self.path.split('?')[0]).suffix:return self.send_error(404)
            self.path='/index.html'
        super().do_GET()
if not (ROOT/'index.html').exists():raise SystemExit('Run npx expo export --platform web first.')
print('Open http://localhost:8087 — all files served locally. Press Ctrl+C to stop.',flush=True)
ThreadingHTTPServer(('127.0.0.1',8087),Handler).serve_forever()
