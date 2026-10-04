import unittest
import threading
import json
import urllib.request
import urllib.error
from http.server import ThreadingHTTPServer
from server import handler, validate_bind

class FakeEngine:
    def translate(self, row):
        return {"text": "test-only", "source": "test"}

class Bridge(unittest.TestCase):
    def test_native_pairing_rejects_missing_code_and_browser_origins(self):
        service = ThreadingHTTPServer(("127.0.0.1", 0), handler(FakeEngine(), "127.0.0.1", 0, "test-pairing"))
        port = service.server_port
        service.RequestHandlerClass = handler(FakeEngine(), "127.0.0.1", port, "test-pairing")
        thread = threading.Thread(target=service.serve_forever, daemon=True)
        thread.start()
        try:
            url = f"http://127.0.0.1:{port}/health"
            with self.assertRaises(urllib.error.HTTPError) as rejected:
                urllib.request.urlopen(url)
            self.assertEqual(rejected.exception.code, 403)
            with urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization":"Bearer test-pairing"})) as response:
                self.assertTrue(json.load(response)["ready"])
            body = json.dumps({"text":"Hello", "from":"English", "to":"French"}).encode()
            request = urllib.request.Request(url.replace("/health", "/translate"), data=body, headers={"Content-Type":"application/json", "Authorization":"Bearer test-pairing"})
            with urllib.request.urlopen(request) as response:
                self.assertEqual(json.load(response)["text"], "test-only")
            with self.assertRaises(urllib.error.HTTPError) as rejected:
                urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization":"Bearer test-pairing", "Origin":"https://unrelated.example"}))
            self.assertEqual(rejected.exception.code, 403)
        finally:
            service.shutdown()
            service.server_close()
            thread.join()

    def test_final_demo_origins_can_reach_loopback_translation(self):
        service = ThreadingHTTPServer(("127.0.0.1", 0), handler(FakeEngine()))
        service.RequestHandlerClass = handler(FakeEngine(), "127.0.0.1", service.server_port)
        thread = threading.Thread(target=service.serve_forever, daemon=True)
        thread.start()
        try:
            for origin in ["http://localhost:8082", "http://localhost:8087", "http://127.0.0.1:8088"]:
                req = urllib.request.Request(f"http://127.0.0.1:{service.server_port}/health", headers={"Origin":origin})
                with urllib.request.urlopen(req) as response:
                    self.assertEqual(response.headers["Access-Control-Allow-Origin"], origin)
                    self.assertTrue(json.load(response)["ready"])
        finally:
            service.shutdown(); service.server_close(); thread.join()

    def test_bind_excludes_public_and_all_interface_addresses(self):
        for bind in ["0.0.0.0", "8.8.8.8", "224.0.0.1"]:
            with self.assertRaises(ValueError): validate_bind(bind)
        self.assertTrue(validate_bind("192.168.1.20").is_private)
