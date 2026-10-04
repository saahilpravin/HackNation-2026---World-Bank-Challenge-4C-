import unittest
from run import validate, sentence_parts

class Validation(unittest.TestCase):
    def test_bad_input_is_rejected_before_model_load(self):
        for row in [{"text":"", "from":"English", "to":"French"}, {"text":"Hi", "from":"Unknown", "to":"French"}]:
            with self.assertRaises(ValueError):
                validate(row)

    def test_sentences_are_not_dropped(self):
        self.assertEqual(sentence_parts("Thank you. Please visit!"), ["Thank you.", "Please visit!"])

    def test_source_text_is_preserved(self):
        row = {"text":"4 guests at 14:00", "from":"English", "to":"Kiswahili"}
        self.assertEqual(validate(row), row)

if __name__ == "__main__":
    unittest.main()

class BackendLanguageCodes(unittest.TestCase):
    def test_iso_and_nllb_codes_are_resolved_without_changing_text(self):
        original = "Une visite agréable."
        row = validate({"text": original, "from": "fr", "to": "eng_Latn"})
        self.assertEqual(row["from"], "French")
        self.assertEqual(row["to"], "English")
        self.assertEqual(row["text"], original)
        with self.assertRaises(ValueError): validate({"text":original,"from":"unknown","to":"en"})
