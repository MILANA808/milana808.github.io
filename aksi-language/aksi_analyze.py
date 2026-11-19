"""Unified static-analysis entry point for the AKSI Q shared front-end."""
from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
import json
from pathlib import Path
import sys

from aksi_frontend import Node, ParseError, parse
from aksi_lexer import LexError
from aksi_resolver import resolve
from aksi_typechecker import check_with_types
from aksi_flowcheck import check as check_flow


@dataclass(frozen=True, slots=True)
class AnalysisDiagnostic:
    stage: str
    code: str
    message: str
    line: int
    column: int


@dataclass(frozen=True, slots=True)
class AnalysisResult:
    schema: str
    diagnostics: tuple[AnalysisDiagnostic, ...]
    inferred_types: tuple[tuple[str, str], ...] = ()

    @property
    def ok(self) -> bool:
        return not self.diagnostics


def analyze_module(module: Node) -> AnalysisResult:
    """Analyze an already-parsed module without reparsing source text."""
    if not isinstance(module, Node) or module.kind != "Module":
        raise TypeError("analyze_module() expects a Module AST node")
    resolved = resolve(module)
    typed = check_with_types(module)
    flow = check_flow(module)

    combined: list[AnalysisDiagnostic] = []
    seen: set[tuple[str, int, int]] = set()
    for stage, diagnostics in (("resolver", resolved), ("typechecker", typed.diagnostics), ("control_flow", flow)):
        for diagnostic in diagnostics:
            key = (diagnostic.code, diagnostic.line, diagnostic.column)
            if key in seen:
                continue
            seen.add(key)
            combined.append(AnalysisDiagnostic(
                stage, diagnostic.code, diagnostic.message,
                diagnostic.line, diagnostic.column,
            ))
    combined.sort(key=lambda item: (item.line, item.column, item.stage, item.code))
    return AnalysisResult("AKSI-Q-ANALYSIS/3", tuple(combined), typed.node_types)


def analyze_source(source: str) -> AnalysisResult:
    """Parse once, then resolve names, check types, and validate control flow."""
    return analyze_module(parse(source))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="AKSI Q static analyzer")
    parser.add_argument("file", type=Path, help="AKSI Q source file")
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    args = parser.parse_args(argv)
    try:
        source = args.file.read_text(encoding="utf-8")
        result = analyze_source(source)
    except (OSError, LexError, ParseError) as exc:
        print(f"AKSI Q analysis error: {exc}", file=sys.stderr)
        return 2

    if args.json:
        print(json.dumps({
            "schema": result.schema,
            "ok": result.ok,
            "inferred_types": dict(result.inferred_types),
            "diagnostics": [asdict(item) for item in result.diagnostics],
        }, ensure_ascii=False, indent=2))
    else:
        if result.ok:
            print("AKSI Q: no diagnostics from the current analysis passes.")
        for item in result.diagnostics:
            print(f"{item.line}:{item.column}: {item.stage} {item.code}: {item.message}")
    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
