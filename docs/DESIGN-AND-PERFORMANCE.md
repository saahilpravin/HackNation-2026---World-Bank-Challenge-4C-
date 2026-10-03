# Workspace redesign and translation performance

Insights now shows only the active business workspace. The sample/business switch is removed. Ten generic categories cover tour guide, value for money, communication, facilities, location and directions, activities, timing, accessibility, family friendliness and other feedback. Categories count matching text, can overlap, and never invent a category-specific rating. No-feedback states are explicit. Recommendations use plain titles and still link to their evidence.

The shared visual system uses a navy, blue and neutral palette, a wider desktop content layout, compact cards, stronger hierarchy and clear navigation. The Insights grid adapts from two columns on phones to three on wider screens.

Review translations are now saved locally, keyed by review ID, exact source text and language pair. Reopening the same translation does not call the model. Up to 300 cached translations are retained; a changed source invalidates the match. These are NLLB outputs, not human-approved translations. Demo translations are removed when finishing setup for a different business.

A local CPU smoke test for a short English-to-French reply measured 5,073 ms for the first run and 2,058 ms when warm, with identical two-beam output. Hardware acceleration was unavailable in this environment. These are laptop measurements for one text, not phone performance or a translation benchmark. A one-beam experiment was faster but changed the wording, so the existing two-beam generation was retained. First-time translation of new text still requires laptop inference.
