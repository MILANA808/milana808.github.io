"""AKSI Q compiler front-end: one AST -> analysis -> canonical TIR."""
from __future__ import annotations

from dataclasses import asdict, dataclass
import json

from aksi_analyze import AnalysisDiagnostic, AnalysisResult, analyze_module
from aksi_frontend import parse
from aksi_ir import IRModule, lower, validate_tir


@dataclass(frozen=True, slots=True)
class CompileResult:
    analysis: AnalysisResult
    ir: IRModule | None

    @property
    def ok(self) -> bool:
        return self.analysis.ok and self.ir is not None

    def to_dict(self) -> dict:
        return {
            "schema": "AKSI-Q-COMPILE/0.2",
            "ok": self.ok,
            "analysis": {
                "schema": self.analysis.schema,
                "diagnostics": [asdict(item) for item in self.analysis.diagnostics],
                "inferred_types": dict(self.analysis.inferred_types),
            },
            "ir": self.ir.to_dict() if self.ir is not None else None,
        }


def compile_source(source: str) -> CompileResult:
    """Parse exactly once, analyze that AST, and lower the same tree to TIR.

    The current TIR is a versioned prototype, not yet a complete executable
    representation. Compilation stops before lowering when static passes fail.
    """
    module = parse(source)
    analysis = analyze_module(module)
    if not analysis.ok:
        return CompileResult(analysis, None)
    try:
        ir = lower(module, dict(analysis.inferred_types))
        validate_tir(ir)
    except (TypeError, ValueError) as exc:
        diagnostic = AnalysisDiagnostic(
            "lowering", "E_TIR_LOWERING", str(exc), 1, 1
        )
        failed = AnalysisResult(
            analysis.schema, (*analysis.diagnostics, diagnostic),
            analysis.inferred_types,
        )
        return CompileResult(failed, None)
    return CompileResult(analysis, ir)


def compile_json(source: str) -> str:
    return json.dumps(compile_source(source).to_dict(), ensure_ascii=False, indent=2)
