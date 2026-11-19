"""AKSI Q compiler front-end: source -> static analysis -> typed IR."""
from __future__ import annotations

from dataclasses import asdict, dataclass
import json

from aksi_analyze import AnalysisResult, analyze_source
from aksi_frontend import parse
from aksi_ir import IRModule, lower


@dataclass(frozen=True, slots=True)
class CompileResult:
    analysis: AnalysisResult
    ir: IRModule | None

    @property
    def ok(self) -> bool:
        return self.analysis.ok and self.ir is not None

    def to_dict(self) -> dict:
        return {
            "schema": "AKSI-Q-COMPILE/0.1",
            "ok": self.ok,
            "analysis": {
                "schema": self.analysis.schema,
                "diagnostics": [asdict(item) for item in self.analysis.diagnostics],
            },
            "ir": self.ir.to_dict() if self.ir is not None else None,
        }


def compile_source(source: str) -> CompileResult:
    """Compile source through all current static passes into prototype TIR.

    No executable bytecode is emitted yet. Unknown expression types remain
    explicit in the IR and are not silently treated as proven types.
    """
    analysis = analyze_source(source)
    if not analysis.ok:
        return CompileResult(analysis, None)
    return CompileResult(analysis, lower(parse(source)))


def compile_json(source: str) -> str:
    return json.dumps(compile_source(source).to_dict(), ensure_ascii=False, indent=2)
