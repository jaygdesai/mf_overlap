# MF Overlap — Mutual Fund Portfolio Overlap Analysis

Daily-updated portfolio overlap analysis for **~1,600 Indian mutual funds**, as a
website and an installable Android app.

- **Compare** any two funds: overlap %, common holdings side by side, unique
  holdings of each fund.
- **Heatmap**: pairwise overlap matrix for every fund category (Flexi Cap,
  Large Cap, ELSS, …).
- **Trends**: overlap history recorded every day, so you can see how the
  overlap between two funds changes over time.
- **Top overlaps**: the most-overlapping fund pairs today, filterable by
  category (with an option to hide index funds, which overlap by design).

**Overlap metric**: `overlap(A, B) = Σ min(weight in A, weight in B)` over all
instruments held by both funds — the standard "common portfolio" measure,
expressed in percent.

## How it works

```
Groww fund pages (full disclosed portfolios, ~1,600 direct-growth funds)
        │  GitHub Action, daily 08:00 IST
        ▼
pipeline/fetch_holdings.py  ──►  data/funds.json, data/holdings/latest.json
pipeline/compute_overlaps.py ──► data/overlaps/latest.json   (today's matrices)
                                 data/history/<category>.json (one entry per day)
        │  committed to the repo (the repo is the database)
        ▼
GitHub Pages  ◄── web/ (React SPA)          Android APK (Capacitor shell)
   serves app + data                          fetches data from the Pages URL,
                                              so it stays current without
                                              app updates
```

Fund portfolios are disclosed **monthly** by AMCs; the pipeline checks **daily**
and records an overlap data point per day, so the history shows exactly when
and by how much overlaps shifted after each new disclosure.

## One-time setup (after merging to `main`)

1. **Enable GitHub Pages**: repo → Settings → Pages → Source: **GitHub Actions**.
2. **Deploy the site**: Actions → *Deploy website* → Run workflow (also runs
   automatically on every push to `main`). The site appears at
   `https://jaygdesai.github.io/mf_overlap/`.
3. **Daily data**: the *Daily data refresh* workflow runs automatically at
   08:00 IST every day (you can also trigger it manually). It fetches all
   portfolios, recomputes overlaps, appends the day to history, commits, and
   redeploys the site.
4. **Android APK**: Actions → *Build Android APK* → Run workflow, then download
   the `mf-overlap-apk` artifact — or push a tag like `v1.0.0` to get the APK
   attached to a GitHub Release. Copy `mf-overlap.apk` to your phone and
   install it (allow "install from unknown sources"). The APK loads fresh data
   from the website on every launch, so you never need to rebuild it for data.

Seed data for 2026-06-11 (1,591 funds) is already committed, so the site works
immediately after the first deploy.

## Repository layout

| Path | Purpose |
|---|---|
| `pipeline/` | Python (stdlib-only) data fetcher + overlap computation |
| `data/` | Generated JSON — funds index, holdings snapshot, today's overlap matrices, per-category daily history |
| `web/` | React (Vite) single-page app |
| `web/android/` | Capacitor Android project wrapping the same app |
| `.github/workflows/` | `daily-data.yml`, `deploy-web.yml`, `build-apk.yml` |

## Local development

```bash
# data pipeline (no dependencies beyond Python 3.11+)
python pipeline/fetch_holdings.py --limit 100   # quick partial fetch
python pipeline/compute_overlaps.py

# web app
cd web
npm install
mkdir -p public && ln -sfn ../../data public/data   # expose data/ to the dev server
npm run dev

# android
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
```

## Notes & limits

- Holdings come from publicly served Groww fund pages (which republish the
  AMCs' monthly portfolio disclosures). If the source changes its page
  structure, only `pipeline/fetch_holdings.py` needs updating.
- A safety guard aborts the daily run (keeping yesterday's data) if fewer than
  800 funds fetch successfully, so a flaky day can't corrupt the dataset.
- Pairwise matrices and daily history are precomputed per category; history for
  categories with more than 80 funds (e.g. index funds) tracks the 80 largest
  by AUM to keep the repository size sane. Cross-category comparisons are
  computed instantly in the browser from the holdings snapshot.
- The Compare tab works across **any** two funds, including debt/hybrid funds
  (overlap is then over bonds/instruments, matched by name).
- This is an informational tool, not investment advice.
