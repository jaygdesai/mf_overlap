"""Fetch portfolio holdings for all Indian mutual funds from Groww fund pages.

Each Groww fund page server-renders the fund's complete portfolio inside the
__NEXT_DATA__ JSON blob (props.pageProps.mfServerSideData). The fund universe
is enumerated from Groww's mutual fund sitemap (direct-growth plans).

Outputs (relative to repo root):
  data/funds.json            - fund index with metadata
  data/holdings/latest.json  - compact holdings snapshot for every fund
"""

import argparse
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"

SITEMAP_URL = "https://groww.in/mf-sitemap.xml"
FUND_URL = "https://groww.in/mutual-funds/{slug}"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
NEXT_DATA_RE = re.compile(r'__NEXT_DATA__"[^>]*>')
NON_FUND_SEGMENTS = ("category/", "amc/", "collection/", "filters")


def http_get(url: str, timeout: int = 30, retries: int = 3) -> str:
    last_err = None
    for attempt in range(retries):
        try:
            req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
            with urlopen(req, timeout=timeout) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as err:  # noqa: BLE001 - retry on any transport error
            last_err = err
            time.sleep(2 ** attempt)
    raise RuntimeError(f"GET {url} failed after {retries} attempts: {last_err}")


def list_fund_slugs() -> list[str]:
    xml = http_get(SITEMAP_URL)
    urls = re.findall(r"<loc>https://groww\.in/mutual-funds/([a-z0-9-]+)</loc>", xml)
    slugs = sorted({
        u for u in urls
        if not u.startswith(NON_FUND_SEGMENTS) and not u.endswith("-mutual-funds")
    })
    return slugs


def normalize_instrument_key(holding: dict) -> str:
    """Stable cross-fund key for an instrument."""
    sid = holding.get("stock_search_id")
    if sid:
        return sid
    name = (holding.get("company_name") or "").lower()
    name = re.sub(r"[^a-z0-9]+", "-", name).strip("-")
    return name or "unknown"


def parse_fund_page(html: str) -> dict | None:
    m = NEXT_DATA_RE.search(html)
    if not m:
        return None
    end = html.find("</script>", m.end())
    if end == -1:
        return None
    try:
        payload = json.loads(html[m.end():end])
        ssd = payload["props"]["pageProps"]["mfServerSideData"]
    except (json.JSONDecodeError, KeyError, TypeError):
        return None

    raw_holdings = ssd.get("holdings") or []
    holdings = []
    portfolio_date = None
    for h in raw_holdings:
        pct = h.get("corpus_per")
        if pct is None:
            continue
        portfolio_date = portfolio_date or (h.get("portfolio_date") or "")[:10]
        holdings.append([
            normalize_instrument_key(h),
            h.get("company_name") or "Unknown",
            h.get("sector_name") or "Other",
            h.get("nature_name") or "OTHER",
            round(float(pct), 4),
        ])
    if not holdings:
        return None

    return {
        "id": ssd.get("search_id"),
        "name": ssd.get("scheme_name") or ssd.get("fund_name"),
        "fund_house": ssd.get("fund_house"),
        "super_category": ssd.get("category") or "Other",
        "sub_category": ssd.get("sub_category") or "Other",
        "aum": ssd.get("aum"),
        "expense_ratio": ssd.get("expense_ratio"),
        "groww_rating": ssd.get("groww_rating"),
        "logo_url": ssd.get("logo_url"),
        "portfolio_date": portfolio_date,
        "holdings": holdings,
    }


def fetch_fund(slug: str) -> dict | None:
    html = http_get(FUND_URL.format(slug=slug))
    fund = parse_fund_page(html)
    if fund and not fund.get("id"):
        fund["id"] = slug
    return fund


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=0,
                        help="fetch only the first N funds (0 = all)")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--min-funds", type=int, default=800,
                        help="abort without writing output if fewer funds "
                             "than this were fetched (protects committed data "
                             "from a partially failed run)")
    args = parser.parse_args()

    slugs = list_fund_slugs()
    if args.limit:
        slugs = slugs[: args.limit]
    print(f"Fetching {len(slugs)} funds from Groww...", flush=True)

    funds: list[dict] = []
    failed: list[str] = []
    done = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(fetch_fund, slug): slug for slug in slugs}
        for fut in as_completed(futures):
            slug = futures[fut]
            done += 1
            try:
                fund = fut.result()
                if fund:
                    funds.append(fund)
            except Exception as err:  # noqa: BLE001
                failed.append(slug)
                print(f"  FAIL {slug}: {err}", flush=True)
            if done % 100 == 0:
                print(f"  {done}/{len(slugs)} pages, {len(funds)} with holdings",
                      flush=True)

    funds.sort(key=lambda f: f["id"])
    print(f"Done: {len(funds)} funds with holdings, {len(failed)} failures.")

    min_funds = args.min_funds if not args.limit else 0
    if len(funds) < min_funds:
        print(f"ERROR: only {len(funds)} funds fetched (< {min_funds}); "
              "keeping previous data.", file=sys.stderr)
        return 1

    index = [
        {
            "id": f["id"],
            "name": f["name"],
            "fh": f["fund_house"],
            "cat": f["super_category"],
            "sub": f["sub_category"],
            "aum": f["aum"],
            "er": f["expense_ratio"],
            "rating": f["groww_rating"],
            "logo": f["logo_url"],
            "pd": f["portfolio_date"],
        }
        for f in funds
    ]
    holdings = {f["id"]: {"pd": f["portfolio_date"], "h": f["holdings"]}
                for f in funds}

    (DATA_DIR / "holdings").mkdir(parents=True, exist_ok=True)
    with open(DATA_DIR / "funds.json", "w") as fp:
        json.dump(index, fp, separators=(",", ":"))
    with open(DATA_DIR / "holdings" / "latest.json", "w") as fp:
        json.dump(holdings, fp, separators=(",", ":"))
    print(f"Wrote data/funds.json ({len(index)} funds) and "
          f"data/holdings/latest.json")
    return 0 if funds else 1


if __name__ == "__main__":
    sys.exit(main())
