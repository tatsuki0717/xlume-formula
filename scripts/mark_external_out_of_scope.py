#!/usr/bin/env python3
"""Mark external/spreadsheet-dependent function design docs as out-of-scope."""
from pathlib import Path

EXTERNAL_FUNCTIONS = {
    # External / web / information
    "WEBSERVICE", "IMAGE", "STOCKHISTORY", "TRANSLATE",
    "PHONETIC", "RTD", "REGISTER.ID", "CALL",
    "GETPIVOTDATA",
    # CUBE functions
    "CUBEVALUE", "CUBEMEMBER", "CUBEMEMBERPROPERTY",
    "CUBEKPIMEMBER", "CUBERANKEDMEMBER", "CUBESET", "CUBESETCOUNT",
    # Google Sheets network / spreadsheet functions
    "GOOGLETRANSLATE", "GOOGLEFINANCE", "IMPORTDATA", "IMPORTXML",
    "IMPORTHTML", "IMPORTFEED", "IMPORTRANGE",
}

BASE = Path(__file__).resolve().parent.parent / "docs"

BEHAVIOR_NOTE = (
    "This function depends on external services, spreadsheet data, or an external runtime "
    "(network, OLAP, pivot cache, XLL, RTD, etc.). The core `xlume-formula` engine does not "
    "perform network calls or access external data sources; the registered implementation always "
    "returns `#N/A`.\n"
)

for fn in EXTERNAL_FUNCTIONS:
    for subdir in (BASE / "design" / "functions").rglob(f"{fn}.md"):
        text = subdir.read_text(encoding="utf-8")
        # Update scope if present
        text = text.replace("- **Scope:** in-scope", "- **Scope:** out-of-scope")
        text = text.replace("- **Scope:** implement", "- **Scope:** out-of-scope")
        # Replace Behavior / Algorithm section body
        if "## Behavior / Algorithm" in text:
            parts = text.split("## Behavior / Algorithm")
            before = parts[0] + "## Behavior / Algorithm\n"
            rest = parts[1]
            next_heading = rest.find("\n## ")
            if next_heading == -1:
                next_heading = len(rest)
            text = before + "\n" + BEHAVIOR_NOTE + rest[next_heading:]
        # Update implementation notes if they claim implementation
        text = text.replace(
            "Implement natively in the appropriate builtins module",
            "Not implemented in the core engine; returns `#N/A` without network or external calls",
        )
        text = text.replace(
            "Implemented in `src/functions/builtins-",
            "Not implemented in the core engine; registered as a stub that returns `#N/A`",
        )
        text = text.replace(
            "Implemented in `src/providers/",
            "Not implemented in the core engine; registered as a stub that returns `#N/A`",
        )
        subdir.write_text(text, encoding="utf-8")
        print(f"Updated {subdir.relative_to(BASE)}")

# Google Sheets docs live under docs/design/google-sheets
for fn in EXTERNAL_FUNCTIONS:
    for path in (BASE / "design" / "google-sheets").rglob(f"{fn}.md"):
        text = path.read_text(encoding="utf-8")
        text = text.replace("- **Scope:** in-scope", "- **Scope:** out-of-scope")
        text = text.replace("- **Scope:** implement", "- **Scope:** out-of-scope")
        if "## Behavior / Algorithm" in text:
            parts = text.split("## Behavior / Algorithm")
            before = parts[0] + "## Behavior / Algorithm\n"
            rest = parts[1]
            next_heading = rest.find("\n## ")
            if next_heading == -1:
                next_heading = len(rest)
            text = before + "\n" + BEHAVIOR_NOTE + rest[next_heading:]
        text = text.replace(
            "Implement natively in the appropriate builtins module",
            "Not implemented in the core engine; returns `#N/A` without network or external calls",
        )
        text = text.replace(
            "Implemented in `src/functions/builtins-",
            "Not implemented in the core engine; registered as a stub that returns `#N/A`",
        )
        path.write_text(text, encoding="utf-8")
        print(f"Updated {path.relative_to(BASE)}")
