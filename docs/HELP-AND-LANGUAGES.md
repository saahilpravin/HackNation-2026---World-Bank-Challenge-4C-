# Help and language selection

Help is a fifth bottom tab. Owners can type a question or choose one of ten guide topics. Answers are retrieved from authored local app instructions, with navigation shortcuts. This is not LLM inference and needs no network. Unknown questions get a clear fallback.

Review reading, writing and customer language controls are searchable dropdown lists. `src/data/nllb-languages.json` is the shared 202-option catalog used by the app and Python NLLB runner. Names come from the official FLORES-200 table, filtered to the locally installed NLLB tokenizer's actual special tokens. Santali uses the checkpoint's Bengali script token (sat_Beng), not the FLORES table's Ol Chiki token. Original saved English/French/Kiswahili/Arabic/Chinese names remain compatible.

Sources: https://github.com/facebookresearch/flores/tree/main/flores200 and https://huggingface.co/facebook/nllb-200-distilled-600M

Selecting a language does not promise an available cached translation or authored example. New custom translations need the laptop service on the local network. Authored reply examples remain available in ten languages; other languages show an actionable message. Approval remains human-controlled and local. No external review posting is implemented.

Restart an existing Python bridge after catalog changes. A LAN restart generates a new pairing code; re-pair in Offline & AI. Model quality has not been evaluated across all 202 options. Use qualified language reviewers before relying on translations.
