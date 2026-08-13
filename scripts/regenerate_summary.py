#!/usr/bin/env python3
"""Regenerate docs/design/summary.json from current design-doc metadata."""
import json
import re
from pathlib import Path

DESIGN_DIR = Path(__file__).resolve().parent.parent / "docs" / "design"
FUNCTIONS_DIR = DESIGN_DIR / "functions"

summary: dict[str, dict] = {}
scope_re = re.compile(r"^- \*\*Scope:\*\* (\S+)")
cat_re = re.compile(r"^- \*\*Category:\*\* (.+)$")

for path in sorted(FUNCTIONS_DIR.rglob("*.md")):
    text = path.read_text(encoding="utf-8")
    scope = "implement"
    category = "Unknown"
    for line in text.splitlines():
        m = scope_re.match(line)
        if m:
            scope = m.group(1)
        m = cat_re.match(line)
        if m:
            category = m.group(1).strip()
    if category not in summary:
        summary[category] = {"count": 0, "scopes": {}}
    summary[category]["count"] += 1
    summary[category]["scopes"][scope] = summary[category]["scopes"].get(scope, 0) + 1

(DESIGN_DIR / "summary.json").write_text(
    json.dumps(dict(sorted(summary.items(), key=lambda x: x[0])), indent=2) + "\n",
    encoding="utf-8",
)

for cat, data in sorted(summary.items()):
    print(f"{cat}: {data['count']} {data['scopes']}")
