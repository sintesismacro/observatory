"""Build the SINTESIS Observatory into dist/.

    python tools/build.py              # fetch the public sources, embed them, write dist/
    python tools/build.py --offline    # use the cached copies in data/cache/ (no network)

Sources, all public and read at build time so visitors' browsers make no outside requests:
- the Ledger's Atlas layers  (sintesismacro/ledger, main, atlas/nodes.yaml)
- the Ledger's scorecard     (sintesismacro/ledger, evidence, scorecard.json)
- the Collection             (sintesismacro/physical-ai-collection, main, collection.yaml)
- local data: data/trainer.json, data/canon.json, data/atlas_meta.json, data/site.json
"""

from __future__ import annotations

import json
import shutil
import sys
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SITE, DATA, DIST = ROOT / "site", ROOT / "data", ROOT / "dist"
CACHE = DATA / "cache"
RAW = "https://raw.githubusercontent.com"
SOURCES = {
    "nodes.yaml": f"{RAW}/sintesismacro/ledger/main/atlas/nodes.yaml",
    "scorecard.json": f"{RAW}/sintesismacro/ledger/evidence/scorecard.json",
    "collection.yaml": f"{RAW}/sintesismacro/physical-ai-collection/main/collection.yaml",
}


def fetch(name: str, offline: bool) -> str:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    if not offline:
        req = urllib.request.Request(SOURCES[name], headers={"User-Agent": "sintesis-observatory-build"})
        with urllib.request.urlopen(req, timeout=30) as r:  # noqa: S310 (fixed https URLs above)
            path.write_text(r.read().decode("utf-8"), encoding="utf-8")
    return path.read_text(encoding="utf-8")


def iso(v):
    return v.isoformat() if isinstance(v, date | datetime) else v


def atlas_rows(nodes: list[dict], card: dict) -> list[dict]:
    """Per-layer Becoming/Returning from the scorecard's atlas block, when the Ledger publishes one."""
    state = {r.get("id"): r for r in (card.get("atlas") or [])}
    out = []
    for n in nodes:
        s = state.get(n["id"], {})
        out.append({"id": n["id"], "label": n["label"], "phase": n["phase"],
                    "becoming": s.get("becoming"), "returning": s.get("returning")})
    return out


def main() -> int:
    offline = "--offline" in sys.argv
    nodes = yaml.safe_load(fetch("nodes.yaml", offline))["nodes"]
    card = json.loads(fetch("scorecard.json", offline))
    coll = yaml.safe_load(fetch("collection.yaml", offline))["entries"]
    site = json.loads((DATA / "site.json").read_text(encoding="utf-8"))
    payload = {
        "scorecard": card,
        "atlas": atlas_rows(nodes, card),
        "atlas_meta": json.loads((DATA / "atlas_meta.json").read_text(encoding="utf-8")),
        "trainer": json.loads((DATA / "trainer.json").read_text(encoding="utf-8")),
        "canon": json.loads((DATA / "canon.json").read_text(encoding="utf-8")),
        "collection": [
            {k: iso(e.get(k)) for k in ("name", "layer", "url", "licence", "does", "reading", "reason")} for e in coll
        ],
    }
    # Embedded as JSON inside <script type="application/json">: escape "</" so no tag can close early.
    blob = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    built = datetime.now(timezone.utc).strftime("%-d %B %Y")

    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(SITE, DIST)
    subs = {
        "{{DATA}}": blob,
        "{{BUILD_DATE}}": built,
        "{{LETTER_URL}}": site["letter_url"],
        "{{FIRST_FORECASTS}}": site["first_forecasts"],
    }
    for page in DIST.rglob("*.html"):
        text = page.read_text(encoding="utf-8")
        for k, v in subs.items():
            text = text.replace(k, v)
        if "{{" in text:
            raise SystemExit(f"unfilled placeholder in {page.relative_to(DIST)}")
        page.write_text(text, encoding="utf-8")
    (DIST / ".nojekyll").write_text("", encoding="utf-8")
    print(f"built dist/: {len(nodes)} layers, {len(coll)} projects, "
          f"{len(payload['trainer']['questions'])} questions, scorecard as of {card.get('as_of')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
