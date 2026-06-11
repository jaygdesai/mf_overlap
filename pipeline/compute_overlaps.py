"""Compute pairwise portfolio overlaps between mutual funds and maintain
day-by-day overlap history.

Overlap between fund A and fund B = sum over common instruments of
min(weight_in_A, weight_in_B), expressed in percent (0-100). This is the
standard "common portfolio" measure used for mutual fund overlap analysis.

Pairwise matrices are precomputed per category (same sub-category funds);
cross-category pairs are computed on demand in the web client from the
holdings snapshot.

Outputs (relative to repo root):
  data/overlaps/latest.json   - today's per-category matrices + top pairs
  data/history/<cat>.json     - append-only per-day triangles per category
  data/meta.json              - run metadata
Triangle convention (shared with the web client): for positions i < j within
a day's `idx` array, value index = j*(j-1)/2 + i.
"""

import datetime
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"

MIN_FUNDS_PER_CATEGORY = 2
# Daily history is kept for at most this many funds per category (largest by
# AUM) so that huge categories (e.g. 200+ index funds) don't balloon the repo.
MAX_HISTORY_FUNDS = 80


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def overlap_pct(weights_a: dict[str, float], weights_b: dict[str, float]) -> float:
    if len(weights_b) < len(weights_a):
        weights_a, weights_b = weights_b, weights_a
    total = 0.0
    for key, wa in weights_a.items():
        wb = weights_b.get(key)
        if wb is not None:
            total += min(wa, wb)
    return total


def triangle(values_by_pair, n):
    """Dense upper triangle as flat list: index for i<j is j*(j-1)/2 + i."""
    tri = []
    for j in range(n):
        for i in range(j):
            tri.append(values_by_pair(i, j))
    return tri


def main() -> int:
    today = datetime.date.today().isoformat()

    with open(DATA_DIR / "funds.json") as fp:
        funds = json.load(fp)
    with open(DATA_DIR / "holdings" / "latest.json") as fp:
        holdings = json.load(fp)

    weights: dict[str, dict[str, float]] = {}
    for fund_id, entry in holdings.items():
        w: dict[str, float] = {}
        for key, _name, _sector, _nature, pct in entry["h"]:
            w[key] = w.get(key, 0.0) + pct
        weights[fund_id] = w

    aum_by_id = {f["id"]: f.get("aum") or 0 for f in funds}
    categories: dict[str, dict] = {}
    for f in funds:
        if f["id"] not in weights:
            continue
        key = slugify(f"{f['cat']}-{f['sub']}")
        cat = categories.setdefault(
            key, {"name": f"{f['cat']} · {f['sub']}", "funds": []})
        cat["funds"].append(f["id"])

    latest = {"date": today, "categories": {}}
    all_pairs = []

    history_dir = DATA_DIR / "history"
    history_dir.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "overlaps").mkdir(parents=True, exist_ok=True)

    for key, cat in sorted(categories.items()):
        ids = sorted(cat["funds"])
        if len(ids) < MIN_FUNDS_PER_CATEGORY:
            continue
        n = len(ids)
        tri = triangle(
            lambda i, j: round(overlap_pct(weights[ids[i]], weights[ids[j]]), 2),
            n,
        )
        latest["categories"][key] = {"name": cat["name"], "funds": ids, "m": tri}

        for j in range(n):
            for i in range(j):
                all_pairs.append((tri[j * (j - 1) // 2 + i], ids[i], ids[j], key))

        # --- append to per-category history ---
        if len(ids) > MAX_HISTORY_FUNDS:
            hist_ids = sorted(
                sorted(ids, key=lambda fid: -aum_by_id[fid])[:MAX_HISTORY_FUNDS])
            hn = len(hist_ids)
            hist_tri = triangle(
                lambda i, j: round(
                    overlap_pct(weights[hist_ids[i]], weights[hist_ids[j]]), 1),
                hn,
            )
        else:
            hist_ids = ids
            hist_tri = [round(v, 1) for v in tri]

        hist_path = history_dir / f"{key}.json"
        if hist_path.exists():
            with open(hist_path) as fp:
                hist = json.load(fp)
        else:
            hist = {"name": cat["name"], "funds": [], "days": []}

        master = hist["funds"]
        pos = {fid: i for i, fid in enumerate(master)}
        for fid in hist_ids:
            if fid not in pos:
                pos[fid] = len(master)
                master.append(fid)
        idx = [pos[fid] for fid in hist_ids]  # sorted ids, order matches tri

        day_entry = {"d": today, "idx": idx, "t": hist_tri}
        hist["days"] = [d for d in hist["days"] if d["d"] != today]
        hist["days"].append(day_entry)
        hist["days"].sort(key=lambda d: d["d"])
        with open(hist_path, "w") as fp:
            json.dump(hist, fp, separators=(",", ":"))

    all_pairs.sort(reverse=True)
    latest["top"] = [
        {"a": a, "b": b, "v": v, "cat": key}
        for v, a, b, key in all_pairs[:200]
    ]

    with open(DATA_DIR / "overlaps" / "latest.json", "w") as fp:
        json.dump(latest, fp, separators=(",", ":"))

    meta = {
        "updated_at": datetime.datetime.now(datetime.timezone.utc)
        .strftime("%Y-%m-%dT%H:%M:%SZ"),
        "date": today,
        "funds": len(weights),
        "categories": len(latest["categories"]),
        "pairs": len(all_pairs),
    }
    with open(DATA_DIR / "meta.json", "w") as fp:
        json.dump(meta, fp, indent=1)

    print(f"Computed {len(all_pairs)} pairs across "
          f"{len(latest['categories'])} categories for {meta['funds']} funds.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
