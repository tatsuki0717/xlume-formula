#!/usr/bin/env python3
"""
Generate per-function design Markdown documents for xlume-formula.

Inputs:
  - FUNCTIONS-reference.md (canonical function list with category/priority tags)
  - HyperFormula metadata TS files (structural metadata only: names, types, signatures)
  - excel-functions-office-js.yml (official signatures)
  - /tmp/formulajs source (structural metadata only: names, types, signatures)
  - scripts/manual_specs.py (signatures for functions missing from the above)

Outputs:
  - docs/design/index.md
  - docs/design/README.md
  - docs/design/template.md
  - docs/design/functions/<category-slug>/<FunctionName>.md
"""

import os
import re
import json
import yaml
import html
from collections import OrderedDict, defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DESIGN_DIR = REPO_ROOT / 'docs' / 'design'
FUNC_DIR = DESIGN_DIR / 'functions'
REF_FILE = REPO_ROOT / 'FUNCTIONS-reference.md'
YAML_FILE = REPO_ROOT / 'excel-functions-office-js.yml'
HF_DIR = Path('/tmp/hyperformula/src/interpreter/functionMetadata/categories')
FJS_DIR = Path('/tmp/formulajs/src')

import manual_specs


def slugify_category(cat):
    """Turn a reference category heading into a filesystem directory slug."""
    cat = clean_category(cat)
    cat = cat.replace('&', 'and').replace('/', '-')
    return re.sub(r'[^\w\s-]', '', cat).strip().lower().replace(' ', '-')


def clean_category(cat):
    """Readable category name for metadata."""
    cat = re.sub(r'\s*\(.*?\)', '', cat)
    cat = re.sub(r'\s*\[[^\]]+\]', '', cat)
    cat = re.sub(r'\s*—.*', '', cat)
    return cat.strip()


def to_excel(method_name):
    """Convert Office.js camelCase method names to Excel function names."""
    name = method_name.split('(')[0]
    parts = name.split('_')
    out = []
    for p in parts:
        s = re.sub(r'(?<=[a-z0-9])([A-Z])|(?<=[A-Za-z])(?=[0-9])',
                   lambda m: ' ' + m.group(1) if m.group(1) else ' ', p)
        s = re.sub(r'\s+', ' ', s).strip()
        words = [w.upper() if w.isalpha() else w for w in s.split(' ')]
        out.append(''.join(words))
    return '.'.join(out)


# ---------------------------------------------------------------------------
# Reference parser
# ---------------------------------------------------------------------------

def parse_reference(path):
    """Parse FUNCTIONS-reference.md into a list of function records."""
    records = []
    seen = set()
    sections = OrderedDict()
    current = None
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            stripped = line.strip()
            if stripped.startswith('##'):
                current = stripped.lstrip('#').strip()
                sections[current] = []
            elif current and stripped.startswith('- ['):
                sections[current].append(stripped)

    for raw_cat, lines in sections.items():
        if '(' not in raw_cat or 'Coverage' in raw_cat:
            continue
        cat = clean_category(raw_cat)
        for line in lines:
            m = re.match(r'-\s+\[([\sx])\]\s+`([^`]+)`', line)
            if not m:
                continue
            check = m.group(1)
            name_raw = m.group(2)
            rest = line[m.end():].strip()
            # Extract all bracketed tags (e.g. [T1], [DA], [LAMBDA])
            tags = re.findall(r'\[([A-Z0-9]+)\]', rest)
            # Description is the remainder with tags removed and leading em-dash stripped
            desc = re.sub(r'\s*\[[A-Z0-9]+\]', '', rest).strip()
            desc = re.sub(r'^[—\-]\s*', '', desc).strip()

            if '→' in name_raw:
                parts = [p.strip().strip('`') for p in name_raw.split('→')]
                name = parts[0]
                alias_target = parts[1]
            else:
                name = name_raw
                alias_target = None

            if name in seen:
                continue
            seen.add(name)

            records.append({
                'name': name,
                'category': cat,
                'raw_category': raw_cat,
                'description': desc,
                'tags': tags,
                'checked': check.strip() == 'x',
                'alias_target': alias_target,
            })

    return records


# ---------------------------------------------------------------------------
# HyperFormula metadata parser
# ---------------------------------------------------------------------------

def extract_balanced(text, start, open_ch='{', close_ch='}'):
    n = len(text)
    i = start
    assert text[i] == open_ch
    depth = 0
    in_string = None
    escape = False
    while i < n:
        c = text[i]
        if in_string:
            if escape:
                escape = False
            elif c == '\\':
                escape = True
            elif c == in_string:
                in_string = None
        else:
            if c in ('"', "'"):
                in_string = c
            elif c == open_ch:
                depth += 1
            elif c == close_ch:
                depth -= 1
                if depth == 0:
                    i += 1
                    break
        i += 1
    return i, text[start + 1:i - 1]


def parse_function_block(block):
    """Extract fields from a single HyperFormula function object literal."""
    result = {}
    m = re.search(r"category\s*:\s*'([^']*)'", block)
    if m:
        result['category'] = m.group(1)
    m = re.search(r"shortDescription\s*:\s*'((?:\\'|[^'])*)'", block)
    if m:
        result['shortDescription'] = m.group(1).replace("\\'", "'")

    params = []
    pattern = r"\{name\s*:\s*'((?:\\'|[^'])*)'\s*,\s*description\s*:\s*'((?:\\'|[^'])*)'\}"
    for pm in re.finditer(pattern, block):
        params.append({
            'name': pm.group(1).replace("\\'", "'"),
            'description': pm.group(2).replace("\\'", "'"),
        })
    if not params:
        for pm in re.finditer(r'\{name\s*:\s*"((?:\\"|[^"])*)"\s*,\s*description\s*:\s*"((?:\\"|[^"])*)"\}', block):
            params.append({
                'name': pm.group(1).replace('\\"', '"'),
                'description': pm.group(2).replace('\\"', '"'),
            })
    result['parameters'] = params

    examples = []
    m = re.search(r"examples\s*:\s*\[([^\[\]]*)\]", block, re.DOTALL)
    if m:
        arr = m.group(1)
        for em in re.finditer(r"'((?:\\'|[^'])*)'", arr):
            examples.append(em.group(1).replace("\\'", "'"))
        if not examples:
            for em in re.finditer(r'"((?:\\"|[^"])*)"', arr):
                examples.append(em.group(1).replace('\\"', '"'))
    result['examples'] = examples

    m = re.search(r"documentationUrl\s*:\s*'([^']*)'", block)
    if m:
        result['documentationUrl'] = m.group(1)
    return result


def parse_hyperformula_categories(base_dir):
    funcs = {}
    for fname in sorted(os.listdir(base_dir)):
        path = Path(base_dir) / fname
        if not path.is_file():
            continue
        text = path.read_text(encoding='utf-8')
        m = re.search(r'export const \w+: Record<string, FunctionDoc> = \{', text)
        if not m:
            continue
        start = m.end() - 1
        i = start + 1
        n = len(text)
        while i < n:
            while i < n and text[i] in ' \t\n\r,':
                i += 1
            if i >= n:
                break
            if text[i] == '}':
                break
            km = re.match(r"(?:['\"])?([A-Z][A-Z0-9._]*)(?:['\"])?\s*:\s*\{", text[i:])
            if not km:
                i += 1
                continue
            key = km.group(1)
            i += len(km.group(0)) - 1
            end, block = extract_balanced(text, i, '{', '}')
            funcs[key] = parse_function_block(block)
            i = end
    return funcs


# ---------------------------------------------------------------------------
# Office.js YAML parser
# ---------------------------------------------------------------------------

def parse_office_js_yaml(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    out = {}
    for m in data.get('methods', []):
        excel_name = to_excel(m['name'])
        params = []
        for p in m.get('syntax', {}).get('parameters', []):
            type_str = p.get('type', '')
            optional = '?' in type_str or 'optional' in (p.get('description') or '').lower()
            params.append({
                'name': p.get('id', ''),
                'description': p.get('description', ''),
                'type': type_str,
                'optional': optional,
            })
        out[excel_name] = {
            'shortDescription': m.get('summary', ''),
            'parameters': params,
        }
    return out


# ---------------------------------------------------------------------------
# formula.js parser
# ---------------------------------------------------------------------------

def parse_formulajs(src_dir):
    funcs = {}
    for fname in os.listdir(src_dir):
        if not fname.endswith('.js'):
            continue
        cat = fname.replace('.js', '').replace('-', ' ').title()
        path = Path(src_dir) / fname
        text = path.read_text(encoding='utf-8')
        parts = re.split(r'(?=^export function \w+\()', text, flags=re.MULTILINE)
        for part in parts:
            m = re.match(r'export function (\w+)\(([^)]*)\)', part)
            if not m:
                continue
            name = m.group(1).upper()
            args = m.group(2)
            full_decl = 'export function ' + m.group(1) + '(' + args + ')'
            idx = text.find(full_decl)
            if idx == -1:
                continue
            before = text[:idx]
            jsdocs = re.findall(r'/\*\*\s*(.*?)\s*\*/', before, re.DOTALL)
            if not jsdocs:
                continue
            jsdoc = jsdocs[-1]
            summary = ''
            for line in jsdoc.split('\n'):
                line = line.strip().lstrip('*').strip()
                if line and not line.startswith('@'):
                    summary = line
                    break
            params = []
            for pm in re.finditer(r'^[^\S\n\r]*\*[^\S\n\r]*@param[^\S\n\r]*\{([^}]*)\}[^\S\n\r]+(\S+)[^\S\n\r]*(.*)$', jsdoc, re.MULTILINE):
                pname = pm.group(2).strip()
                optional = False
                if pname.startswith('[') and pname.endswith(']'):
                    optional = True
                    pname = pname[1:-1]
                params.append({
                    'type': pm.group(1).strip(),
                    'name': pname,
                    'description': pm.group(3).strip(),
                    'optional': optional,
                })
            funcs[name] = {
                'category': cat,
                'shortDescription': summary,
                'parameters': params,
                'examples': [],
            }
    return funcs


# ---------------------------------------------------------------------------
# Metadata merging
# ---------------------------------------------------------------------------

def infer_optional(param):
    if param.get('optional'):
        return True
    desc = param.get('description', '')
    d = desc.lower()
    if 'optional' in d or 'when omitted' in d or 'defaults to' in d:
        return True
    if 'default' in d or '(default)' in d:
        return True
    return False


def base_param_name(name):
    base = re.sub(r'\d+$', '', name).rstrip('_')
    if base.endswith('s') and len(base) > 1:
        base = base[:-1]
    if base in ('args',):
        base = 'arg'
    if not base:
        base = 'arg'
    return base


def is_variadic_param(param):
    """Guess whether this single parameter is the start of a repeated tail."""
    if param.get('repeat'):
        return True
    desc = (param.get('description') or '').lower()
    type_str = (param.get('type') or '').lower()
    name = param.get('name', '')

    # Type-level hints (Office.js rest/Array syntax)
    if '...' in type_str or 'array<' in type_str or 'array[]' in type_str:
        return True

    # Description-level hints
    if re.search(r'\d+\s+to\s+(?:253|255)', desc):
        return True
    if 'passed as additional arguments' in desc or 'additional arguments repeat' in desc:
        return True
    if 'further' in desc and 'additional' in desc:
        return True

    # Param name + wording hints (e.g. number1, text1, value1)
    if re.search(r'\d$', name):
        if 'additional' in desc or 'further' in desc or 'subsequent' in desc or 'optional' in desc:
            return True
    return False


def infer_type_from_description(desc):
    """Infer a simple type string from a parameter description when no explicit type is available."""
    if not desc:
        return 'any'
    d = desc.lower()
    types = []
    # Boolean: explicit logical/boolean terms, or TRUE/FALSE used as a flag (not part of a result clause)
    is_result_clause = re.search(r'\b(result|returned)\b', d) is not None
    if re.search(r'\b(boolean|logical)\b', d) or re.search(r'true or false|true/false', d):
        types.append('boolean')
    elif re.search(r'\b(true|false)\b', d) and not is_result_clause:
        types.append('boolean')
    if re.search(r'\b(text|string|characters?)\b', d):
        types.append('string')
    if re.search(r'\b(number|numeric|integer|digit|double|float)\b', d):
        types.append('number')
    if re.search(r'\b(range|array|cell reference|reference|matrix|vector|cells?)\b', d):
        types.append('range/array')
    return ' | '.join(types) if types else 'any'


def simplify_type(type_str):
    if not type_str:
        return 'any'
    s = html.unescape(type_str)

    def xref_repl(m):
        uid = m.group(1)
        if 'FunctionResult' in uid:
            return 'any'
        if 'Range' in uid:
            return 'range'
        return 'any'

    # Replace Office.js <xref> tags and generic markers with simple tokens
    s = re.sub(r'<xref\s+uid="([^"]+)"\s*/?>', xref_repl, s)
    s = s.replace('Excel.', '')
    s = s.replace('RangeReference', 'range')

    # Capture inner part of an Array<...> wrapper or use the whole string
    array_match = re.match(r'Array\s*<\s*(.*?)\s*>$', s)
    if array_match:
        inner = array_match.group(1)
    else:
        inner = s

    parts = [p.strip() for p in re.split(r'\s*\|\s*', inner) if p.strip()]
    normalized = []
    seen = set()
    for p in parts:
        p = p.lower()
        if 'range' in p or 'array' in p:
            p = 'range/array'
        elif p in ('number', 'string', 'boolean'):
            pass
        else:
            p = 'any'
        if p not in seen:
            seen.add(p)
            normalized.append(p)
    # Drop generic 'any' if more specific types are present
    if len(normalized) > 1 and 'any' in normalized:
        normalized.remove('any')
    return ' | '.join(normalized) if normalized else 'any'


def camel_to_snake(s):
    """Convert Office.js camelCase identifiers to Excel-style snake_case."""
    s = re.sub(r'(?<=[a-z0-9])([A-Z])', r'_\1', s)
    return s.lower().strip('_')


def score_param_name(name):
    """Prefer Excel-style, specific parameter names over generic ones."""
    if not name:
        return -100
    name = name.lower()
    if name in ('args', 'values', 'arguments', 'params', 'text'):
        return -10
    score = 0
    if '_' in name:
        score += 5
    if re.search(r'\d$', name):
        score += 3
    if len(name) > 2:
        score += 1
    return score


def choose_param_name(candidates):
    """Pick the best parameter name from candidate sources.

    The first candidate comes from the highest-priority source (manual). Use it
    unless it is a generic placeholder; otherwise score the remaining candidates.
    """
    candidates = [c for c in candidates if c]
    if not candidates:
        return ''
    if score_param_name(candidates[0]) >= 0:
        return candidates[0]
    unique = []
    for c in candidates:
        if c not in unique:
            unique.append(c)
    return max(unique, key=lambda n: (score_param_name(n), len(n)))


def merge_param_lists(name, manual_params, hf_params, yaml_params, fjs_params):
    """Combine parameter metadata from all sources, preferring the best parts.

    Name preference: manual, then Excel-style snake_case names from fjs/yaml, then hf.
    Description preference: manual > hf > yaml > fjs.
    Type preference: manual > yaml > fjs > hf.
    Optional/repeat preference: manual > yaml > fjs > hf.
    """
    max_len = max(
        len(p) for p in (manual_params or [], hf_params or [], yaml_params or [], fjs_params or [])
        if p
    ) if any((manual_params, hf_params, yaml_params, fjs_params)) else 0

    merged = []
    sources = {
        'manual': manual_params or [],
        'hf': hf_params or [],
        'yaml': yaml_params or [],
        'fjs': fjs_params or [],
    }

    for i in range(max_len):
        p = {}

        # Name candidates in source order (manual first, then fjs, yaml, hf)
        name_candidates = []
        if i < len(sources['manual']) and sources['manual'][i].get('name'):
            name_candidates.append(sources['manual'][i]['name'])
        if i < len(sources['fjs']) and sources['fjs'][i].get('name'):
            name_candidates.append(sources['fjs'][i]['name'])
        if i < len(sources['yaml']) and sources['yaml'][i].get('name'):
            name_candidates.append(camel_to_snake(sources['yaml'][i]['name']))
        if i < len(sources['hf']) and sources['hf'][i].get('name'):
            name_candidates.append(sources['hf'][i]['name'])
        p['name'] = choose_param_name(name_candidates)

        # Description: manual > yaml (avoid copying HyperFormula/formula.js prose)
        for src in ('manual', 'yaml'):
            if i < len(sources[src]):
                desc = sources[src][i].get('description', '')
                if desc:
                    p['description'] = desc
                    break
        else:
            p['description'] = ''

        # Type: manual > yaml > fjs > hf
        for src in ('manual', 'yaml', 'fjs', 'hf'):
            if i < len(sources[src]):
                typ = sources[src][i].get('type', '')
                if typ:
                    p['type'] = typ
                    break
        else:
            p['type'] = ''

        # Optional / repeat: manual > yaml > fjs > hf
        for src in ('manual', 'yaml', 'fjs', 'hf'):
            if i < len(sources[src]):
                opt = sources[src][i].get('optional')
                if opt is not None:
                    p['optional'] = opt
                    break
        else:
            p['optional'] = False

        for src in ('manual', 'yaml', 'fjs', 'hf'):
            if i < len(sources[src]):
                rep = sources[src][i].get('repeat')
                if rep:
                    p['repeat'] = rep
                    break

        merged.append(p)
    return merged


def merge_metadata(name, rec, hf, yaml_map, fjs_map, manual):
    """Build a single design spec for one Excel function name."""
    spec = {
        'name': name,
        'category': rec['category'],
        'raw_category': rec['raw_category'],
        'tags': rec['tags'],
        'checked': rec['checked'],
        'alias_target': rec['alias_target'],
        'shortDescription': rec['description'],
        'parameters': [],
        'examples': [],
        'scope': 'implement',
        'is_dynamic': False,
        'is_volatile': False,
        'is_lambda': False,
        'notes': '',
    }

    # Manual override
    manual_entry = manual.get(name)

    # Sources
    hf_entry = hf.get(name)
    yaml_entry = yaml_map.get(name)
    fjs_entry = fjs_map.get(name)

    # Short description: manual > yaml > reference line (avoid copying third-party prose)
    for entry in (manual_entry, yaml_entry):
        if entry and entry.get('shortDescription'):
            spec['shortDescription'] = entry['shortDescription']
            break

    # Parameters: merge per-position, choosing the best name/description/type/optional from all sources
    merged = merge_param_lists(
        name,
        manual_entry.get('parameters', []) if manual_entry else [],
        hf_entry.get('parameters', []) if hf_entry else [],
        yaml_entry.get('parameters', []) if yaml_entry else [],
        fjs_entry.get('parameters', []) if fjs_entry else [],
    )
    for p in merged:
        if is_variadic_param(p):
            p['repeat'] = True
    spec['parameters'] = merged

    # Examples: manual > yaml (avoid copying third-party examples)
    for entry in (manual_entry, yaml_entry):
        if entry and entry.get('examples'):
            spec['examples'] = entry['examples']
            break

    # Scope from tags
    tags_upper = [t.upper() for t in spec['tags']]
    if spec['alias_target']:
        spec['scope'] = 'alias'
    elif 'EXT' in tags_upper:
        spec['scope'] = 'out-of-scope'
    elif 'LAMBDA' in tags_upper:
        spec['scope'] = 'deferred'
        spec['is_lambda'] = True
    elif 'DA' in tags_upper:
        spec['scope'] = 'deferred'
        spec['is_dynamic'] = True

    # Manual flags (can override tag-derived scope and dynamic/lambda/volatile flags)
    if manual_entry:
        for key in ('scope', 'is_dynamic', 'is_volatile', 'is_lambda', 'notes'):
            if key in manual_entry:
                spec[key] = manual_entry[key]

    # Volatility flags
    if 'volatile' in spec['shortDescription'].lower() or name in ('TODAY', 'NOW', 'RAND', 'RANDBETWEEN', 'OFFSET', 'INDIRECT', 'INFO', 'CELL'):
        spec['is_volatile'] = True

    return spec


# ---------------------------------------------------------------------------
# Markdown rendering
# ---------------------------------------------------------------------------

def build_syntax(name, params):
    if not params:
        return f'={name}()'
    parts = []
    for i, p in enumerate(params):
        pname = p.get('name', '')
        if p.get('repeat'):
            base = base_param_name(pname)
            after = params[i + 1:]
            if after:
                after_parts = []
                for ap in after:
                    aname = ap.get('name', '')
                    if infer_optional(ap):
                        after_parts.append(f'[{aname}]')
                    else:
                        after_parts.append(aname)
                parts.append(f'{base}1, [{base}2, ...], {", ".join(after_parts)}')
            else:
                parts.append(f'{base}1, [{base}2], ...')
            break
        if infer_optional(p):
            parts.append(f'[{pname}]')
        else:
            parts.append(pname)
    return f'={name}({", ".join(parts)})'


def escape_md_cell(text):
    text = (text or '').replace('\n', ' ').replace('|', '\\|')
    return text


def render_args_table(params):
    if not params:
        return 'This function takes no arguments.'
    rows = ['| # | Name | Type | Required? | Description |', '|---|---|---|---|---|']
    for idx, p in enumerate(params, 1):
        req = 'No' if infer_optional(p) else 'Yes'
        typ = simplify_type(p.get('type', ''))
        if typ == 'any':
            typ = infer_type_from_description(p.get('description', ''))
        if p.get('repeat'):
            typ += ' (repeatable)'
        name = escape_md_cell(p.get('name', ''))
        typ = escape_md_cell(typ)
        desc = escape_md_cell(p.get('description', ''))
        rows.append(f'| {idx} | {name} | {typ} | {req} | {desc} |')
    return '\n'.join(rows)


def behavior_section(name, spec):
    scope = spec['scope']
    if scope == 'alias':
        target = spec['alias_target'] or name
        return (
            f"`{name}` is a compatibility alias for `{target}`.\n\n"
            f"Implementation strategy: validate argument order/count, then delegate to the implementation of `{target}`. "
            f"Return the same result and error types. If the modern function's signature differs only by naming, this is a thin wrapper."
        )
    if scope == 'out-of-scope':
        return (
            f"This function requires external data or runtime infrastructure (network, OLAP, pivot cache, XLL, RTD, etc.) "
            f"that is outside the scope of a pure worksheet calculation engine.\n\n"
            f"Stub implementation: return `#N/A` or `#VALUE!` with a message that the function is not supported."
        )
    if scope == 'deferred':
        extra = []
        if spec['is_lambda']:
            extra.append('Requires the LAMBDA/closures engine')
        if spec['is_dynamic']:
            extra.append('Requires dynamic-array / spill support')
        suffix = (' (' + ', '.join(extra) + ')' if extra else '')
        return (
            f"Implementation is deferred{suffix}.\n\n"
            f"High-level behavior: {spec['shortDescription']}\n\n"
            f"Detailed step-by-step algorithm, type coercion and edge-case handling will be added when this function is prioritized."
        )

    desc = spec['shortDescription']
    behavior = f"{desc}\n\nHigh-level algorithm:\n"
    if spec['parameters']:
        behavior += "1. Validate argument count and coerce each argument according to its documented type.\n"
        behavior += "2. Propagate any input errors (`#VALUE!`, `#NUM!`, etc.) before computation.\n"
        behavior += "3. Execute the core calculation described below.\n"
        behavior += "4. Apply final coercion to the documented return type and return the result.\n"
    else:
        behavior += "1. Execute the core calculation.\n2. Return the result.\n"
    behavior += "\nCore calculation:\n"
    behavior += f"> {desc}\n"
    if spec['notes']:
        behavior += f"\nNotes: {spec['notes']}"
    return behavior


def coercion_section(spec):
    return (
        "- Numbers provided as text are coerced to numeric values when the function expects a number.\n"
        "- Logical `TRUE`/`FALSE` coerce to `1`/`0` in numeric contexts and to `\"TRUE\"`/`\"FALSE\"` in text contexts.\n"
        "- Blank cells are treated as `0` in numeric contexts and as `\"\"` in text contexts, unless the function explicitly ignores blanks.\n"
        "- Errors in any argument propagate to the result, except where the function is explicitly designed to trap them (e.g., IFERROR, IFNA, AGGREGATE options).\n"
        "- Range/array arguments are evaluated element-wise or consumed as a whole depending on the function semantics."
    )


def error_section(spec):
    return (
        "| Error | When |\n|---|---|\n"
        "| `#VALUE!` | Argument type or count is invalid, or an argument cannot be coerced. |\n"
        "| `#NUM!` | A numeric argument is outside the allowed domain. |\n"
        "| `#DIV/0!` | Division by zero or an empty denominator. |\n"
        "| `#N/A` | Lookup/match not found or optional fallback triggered. |\n"
        "| `#REF!` | Invalid cell/range reference or out-of-bounds index. |\n"
        "| `#NAME?` | Function name not recognized. |\n"
        "| `#SPILL!` | Dynamic-array result cannot fit in the target range. |"
    )


def examples_section(name, spec):
    lines = ['## Examples']
    if spec['examples']:
        for ex in spec['examples']:
            lines.append(f'- `{ex}`')
    else:
        lines.append('TBD — add representative Excel examples during implementation.')
    if not spec['examples'] and spec['parameters']:
        # try to generate a skeleton
        parts = []
        for p in spec['parameters']:
            if infer_optional(p):
                continue
            if p.get('repeat'):
                parts.append('1, 2, 3')
                break
            else:
                parts.append('...')
        if parts:
            lines.append(f"\nSkeleton: `={name}({', '.join(parts)})`")
    return '\n'.join(lines)


def test_cases_section(spec):
    return (
        "| Input | Expected | Purpose |\n"
        "|---|---|---|\n"
        "| Normal inputs | Correct numeric/text result | Golden path |\n"
        "| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |\n"
        "| Blank/empty cells | Coerced `0` or `\"\"` as appropriate | Blank handling |\n"
        "| Text that cannot be coerced | `#VALUE!` | Error propagation |\n"
        "| Too few/too many arguments | `#VALUE!` | Arity validation |"
    )


def render_function_md(name, spec):
    lines = [f'# {name}', '']

    # Metadata
    cat = spec['category']
    tags = ', '.join(spec['tags']) if spec['tags'] else '—'
    scope = spec['scope']
    lines.append('## Metadata')
    lines.append(f'- **Category:** {cat}')
    lines.append(f'- **Priority tags:** {tags}')
    lines.append(f'- **Scope:** {scope}')
    volatile_str = 'Yes' if spec['is_volatile'] else 'No'
    lines.append(f'- **Volatile:** {volatile_str}')
    if spec['is_dynamic']:
        lines.append('- **Dynamic array:** Yes')
    if spec['is_lambda']:
        lines.append('- **LAMBDA support:** Yes')
    if spec['alias_target']:
        lines.append(f'- **Alias of:** `{spec["alias_target"]}`')
    lines.append('')

    # Description
    lines.append('## Description')
    lines.append(spec['shortDescription'] or 'No description available.')
    lines.append('')

    # Syntax
    syntax = build_syntax(name, spec['parameters'])
    lines.append('## Excel Syntax')
    lines.append(f'```excel\n{syntax}\n```')
    lines.append('')

    # Arguments
    lines.append('## Arguments')
    lines.append(render_args_table(spec['parameters']))
    lines.append('')

    # Returns
    lines.append('## Returns')
    ret_type = 'Dynamic array' if spec['is_dynamic'] else 'Scalar or array depending on arguments'
    lines.append(ret_type)
    lines.append('')

    # Behavior
    lines.append('## Behavior / Algorithm')
    lines.append(behavior_section(name, spec))
    lines.append('')

    # Coercion
    lines.append('## Type Coercion & Edge Cases')
    lines.append(coercion_section(spec))
    lines.append('')

    # Error handling
    lines.append('## Error Handling')
    lines.append(error_section(spec))
    lines.append('')

    # Examples
    lines.append(examples_section(name, spec))
    lines.append('')

    # Tests
    lines.append('## Test Cases')
    lines.append(test_cases_section(spec))
    lines.append('')

    # Implementation notes
    lines.append('## Implementation Notes')
    if scope == 'alias':
        lines.append(f'Implement as a thin wrapper/alias calling `{spec["alias_target"]}`; do not duplicate core logic.')
    elif scope == 'out-of-scope':
        lines.append('Return `#N/A` or `#VALUE!` unsupported. Do not attempt external network/OLAP calls.')
    elif scope == 'deferred':
        lines.append('Deferred until the underlying engine supports the required machinery (dynamic arrays and/or LAMBDA).')
    else:
        lines.append('Follow standard Excel semantics. Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture.')
    lines.append('')

    # References
    lines.append('## References')
    lines.append('- [Microsoft Excel function documentation](https://support.microsoft.com/en-us/office/excel-functions-by-category-5f91f4e9-7b42-46d2-9bd1-63f26a86c0eb)')
    if spec.get('documentationUrl'):
        lines.append(f'- [{spec["documentationUrl"]}]({spec["documentationUrl"]})')
    lines.append('')

    return '\n'.join(lines)


# ---------------------------------------------------------------------------
# Index / template / README
# ---------------------------------------------------------------------------

def render_index(records, specs):
    by_cat = OrderedDict()
    for r in records:
        cat = clean_category(r['raw_category'])
        by_cat.setdefault(cat, []).append(r['name'])

    lines = ['# xlume-formula function design index', '']
    lines.append('This index links to one design document per Excel worksheet function.')
    lines.append('')
    lines.append('| Category | Count | Notes |')
    lines.append('|---|---|---|')

    for cat in by_cat:
        lines.append(f'| {cat} | {len(by_cat[cat])} |  |')

    lines.append('')
    for cat, names in by_cat.items():
        slug = slugify_category(cat)
        lines.append(f'## {cat}')
        for name in sorted(names):
            spec = specs[name]
            scope = spec['scope']
            badge = ''
            if spec['alias_target']:
                badge = f' (alias → `{spec["alias_target"]}`)'
            elif scope == 'out-of-scope':
                badge = ' [out of scope]'
            elif scope == 'deferred':
                badge = ' [deferred]'
            lines.append(f'- [{name}](functions/{slug}/{name}.md){badge}')
        lines.append('')
    return '\n'.join(lines)


def render_readme():
    return '''# xlume-formula Design Docs

This directory contains per-function design documents for the Excel-compatible
formula engine.

- `index.md` — catalog of all functions with links.
- `template.md` — template for new design documents.
- `functions/<category>/<FunctionName>.md` — one detailed design per function.

## Design document scope

Each file records:

- Metadata (category, priority, scope, volatility)
- Description and Excel syntax
- Argument list with types and optionality
- Expected behavior / algorithm
- Type coercion and edge cases
- Error handling
- Examples and test-case patterns
- Implementation notes

## Scope values

- `implement` — a standard worksheet function we intend to implement.
- `alias` — legacy/compatibility name that delegates to a modern function.
- `deferred` — requires dynamic-array spill or LAMBDA/closures engine.
- `out-of-scope` — requires external data/services; stub to `#N/A`.

## Sources

- `FUNCTIONS-reference.md` — canonical function list and priority tags.
- `excel-functions-office-js.yml` — Office.js descriptions, signatures, and parameter metadata (MIT).
- `scripts/manual_specs.py` — manually authored signatures and algorithms for functions not covered above.
- HyperFormula / formula.js source metadata is used only for structural names/signatures when available locally; descriptions and examples are intentionally not copied from those sources.
'''


def render_template():
    return '''# <FunctionName>

## Metadata
- **Category:** <category>
- **Priority tags:** <T1/T2/T3/DA/LAMBDA/COMPAT/EXT>
- **Scope:** <implement | alias | deferred | out-of-scope>
- **Volatile:** Yes/No
- **Dynamic array:** Yes/No

## Description
<Short description>

## Excel Syntax
```excel
=<FunctionName>(arg1, [arg2], ...)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | arg1 | number | Yes | ... |

## Returns
<Return type / behavior>

## Behavior / Algorithm
<Step-by-step algorithm>

## Type Coercion & Edge Cases
- ...

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | ... |

## Examples
- `=<FunctionName>(1, 2, 3)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| ... | ... | ... |

## Implementation Notes
...

## References
- [Microsoft Excel function documentation](https://support.microsoft.com/en-us/office/excel-functions-by-category-5f91f4e9-7b42-46d2-9bd1-63f26a86c0eb)
'''


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    DESIGN_DIR.mkdir(parents=True, exist_ok=True)
    FUNC_DIR.mkdir(parents=True, exist_ok=True)

    records = parse_reference(REF_FILE)
    try:
        hf = parse_hyperformula_categories(HF_DIR) if HF_DIR.exists() else {}
    except FileNotFoundError:
        hf = {}
    yaml_map = parse_office_js_yaml(YAML_FILE)
    try:
        fjs_map = parse_formulajs(FJS_DIR) if FJS_DIR.exists() else {}
    except FileNotFoundError:
        fjs_map = {}
    manual = getattr(manual_specs, 'EXTRA_SPECS', {})

    specs = {}
    written = 0
    for rec in records:
        name = rec['name']
        spec = merge_metadata(name, rec, hf, yaml_map, fjs_map, manual)
        specs[name] = spec

        slug = slugify_category(rec['raw_category'])
        cat_dir = FUNC_DIR / slug
        cat_dir.mkdir(parents=True, exist_ok=True)
        md = render_function_md(name, spec)
        (cat_dir / f'{name}.md').write_text(md, encoding='utf-8')
        written += 1

    (DESIGN_DIR / 'index.md').write_text(render_index(records, specs), encoding='utf-8')
    (DESIGN_DIR / 'README.md').write_text(render_readme(), encoding='utf-8')
    (DESIGN_DIR / 'template.md').write_text(render_template(), encoding='utf-8')

    print(f'Generated {written} function design docs in {FUNC_DIR}')
    print(f'Total categories: {len({r["raw_category"] for r in records})}')

    # Summary JSON for debugging
    summary = defaultdict(lambda: {'count': 0, 'scopes': defaultdict(int)})
    for name, spec in specs.items():
        cat = spec['category']
        summary[cat]['count'] += 1
        summary[cat]['scopes'][spec['scope']] += 1
    (DESIGN_DIR / 'summary.json').write_text(
        json.dumps(dict(sorted(summary.items(), key=lambda x: x[0])), indent=2),
        encoding='utf-8'
    )


if __name__ == '__main__':
    main()
