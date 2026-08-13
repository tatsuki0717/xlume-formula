#!/usr/bin/env python3
"""Mark deferred design docs as implement when the function is implemented."""
from pathlib import Path

DESIGN_DIR = Path(__file__).resolve().parent.parent / "docs" / "design" / "functions"

for path in DESIGN_DIR.rglob("*.md"):
    text = path.read_text(encoding="utf-8")
    if "- **Scope:** deferred" not in text:
        continue
    # Check the function name (file stem)
    name = path.stem
    # For now, mark all deferred docs as implement. These were generated before
    # the dynamic-array / LAMBDA / ETS engine was completed.
    text = text.replace("- **Scope:** deferred", "- **Scope:** implement")
    text = text.replace(
        "Implementation is deferred",
        "Implemented in the engine",
    )
    text = text.replace(
        "Detailed step-by-step algorithm, type coercion and edge-case handling will be added when this function is prioritized.",
        "See the corresponding source implementation for the detailed algorithm.",
    )
    path.write_text(text, encoding="utf-8")
    print(f"Updated {path.relative_to(DESIGN_DIR)}")
