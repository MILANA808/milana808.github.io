from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def read(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def test_release_docs_exist_and_are_consistent():
    required = [
        "README.md",
        "START.md",
        "PRODUCT.md",
        "PLATFORM.md",
        "WHOLE-AKSI.md",
        "TEST.md",
        "about/index.html",
        "index.html",
    ]
    for path in required:
        assert (ROOT / path).is_file(), path

    readme = read("README.md")
    product = read("PRODUCT.md")
    about = read("about/index.html")
    assert "local-first" in readme
    assert "Proof" in readme
    assert "не доказывает истинность" in readme
    assert "Критерий готового релиза" in product
    assert "персональная local-first когнитивная система" in about


def test_docs_do_not_make_forbidden_product_claims():
    docs = "\n".join(
        read(name)
        for name in ["README.md", "START.md", "PRODUCT.md", "PLATFORM.md", "WHOLE-AKSI.md"]
    ).lower()
    assert "не заявляет" in docs
    assert "quantum supremacy" in docs
    assert "сознания" in docs


def test_main_runtime_assets_are_present():
    required = [
        "aksi-app.js",
        "aksi-core.js",
        "aksi-dkv.js",
        "aksi-auth.js",
        "aksi-backup.js",
        "aksi-brain.js",
    ]
    for path in required:
        assert (ROOT / path).is_file(), path


def test_index_has_no_old_product_positioning():
    html = read("index.html")
    assert '<html lang="ru">' in html
    assert 'АКСИ' in html
    assert 'Self · RWKV' not in html
