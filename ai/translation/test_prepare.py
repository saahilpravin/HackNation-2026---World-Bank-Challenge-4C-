import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from prepare import MANIFEST, checkpoint_ready, prepare

class Preparation(unittest.TestCase):
    def test_offline_missing_checkpoint_never_imports_or_downloads_model(self):
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaisesRegex(SystemExit, 'once with internet'):
                prepare(Path(root), offline=True)

    def test_cached_pinned_checkpoint_is_reused_without_download(self):
        with tempfile.TemporaryDirectory() as root:
            checkpoint = Path(root)/'local-nllb'; checkpoint.mkdir()
            (checkpoint/'lauda-provenance.json').write_text(json.dumps({'model': MANIFEST['model'], 'revision': MANIFEST['revision']}))
            for name in ['config.json','tokenizer_config.json','tokenizer.json','model.safetensors']: (checkpoint/name).write_text('fixture')
            self.assertTrue(checkpoint_ready(checkpoint))
            self.assertEqual(prepare(Path(root), offline=True), checkpoint)
            (checkpoint/'model.safetensors').write_text('')
            self.assertFalse(checkpoint_ready(checkpoint))

    def test_wrong_revision_is_preserved_and_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            checkpoint = Path(root)/'local-nllb'; checkpoint.mkdir()
            (checkpoint/'lauda-provenance.json').write_text('{"revision":"other"}')
            with self.assertRaisesRegex(SystemExit, 'move it aside'): prepare(Path(root))
            self.assertTrue(checkpoint.exists())
