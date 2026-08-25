from pathlib import Path
import sys

# Make the repository root importable when pytest is launched from backend/.
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
