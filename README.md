# Kacky Reloaded Project

A live TAS tracker for **Kacky Reloaded** (Trackmania 2020): all 525 maps from KR1 (1/3) to KR7 (3/3).

- **Human world records** come from [Trackmania.io](https://trackmania.io/#/clubs/3074) (the KACKY club campaigns)
- **TAS runs** come from [TMTAS Exchange](https://tmtas.exchange): 1 request per refresh lists new uploads; only maps with new uploads are re-fetched (full sweep once a day)
- **Inputs:** every run's inputs are extracted from its replay (with [GBX.NET](https://github.com/BigBang1112/gbx-net)) into `data/inputs/<replayId>.txt`, in the same TM2020 format as the TMTAS Input Extractor (`<ms> accel 1`, `<ms> steer -52`, …). On the site: open a map → **⌨ Inputs** → Copy.

## How it works

```
Trackmania.io ──┐                               ┌──► data/*.json ──► website (GitHub Pages)
TMTAS Exchange ─┼─► scripts/update.mjs ─────────┤
Google Sheet ───┘   scripts/gsheet_sync.mjs     └──► data/inputs/*.txt   (tools/extract, GBX.NET)
                         ▲                                   │
       .github/workflows/update.yml, every 30 min            └──► deploy: scripts/build_pages.mjs (share pages, sheet feeds)
```

The data job commits only when a record actually changes; deploys run the checks and tests first.

## Project structure

| Path | What it is |
|---|---|
| `index.html`, `style.css` | The page shell and all styling |
| `js/main.js` | Entry point: loads data, wires controls, one click handler for the whole page (`data-action`, `data-player`) |
| `js/format.js` | Pure helpers (`fmt`, `fmtGap`, `esc`, `slug`, …), shared with the Node scripts |
| `js/embed.js` | Video link → embeddable player (YouTube, Twitch, Medal, Streamable, files) |
| `js/model.js` | Data model: build, filter and summarise maps (pure, unit-tested) |
| `js/store.js` | Shared browser state and constants |
| `js/router.js` | URL ⇄ state (`?ed=&view=&f=&sort=&q=`), map/profile pages as history steps (`#map-N`, `#player-X`) |
| `js/html.js` | Shared HTML pieces: player links, tags, video cards, copy buttons |
| `js/views/*.js` | One file per part of the page: overview, grid, latest, mapPage, playerPage, stats, videos |
| `scripts/update.mjs` | Fetches WRs (Trackmania.io, rate-limited, oldest first) and TAS runs (TMTAS, incremental) |
| `scripts/gsheet_sync.mjs` | Reads tags and videos from the Google Sheet |
| `scripts/build_pages.mjs` | Share pages `m/`, `p/` and the CSV feeds the sheet imports (deploy time, not committed) |
| `scripts/cache_bust.mjs` | Stamps every asset and module import with the commit at deploy |
| `scripts/lib/` | Pure script helpers (CSV, cache-busting), unit-tested |
| `tools/extract/` | C# (GBX.NET) TM2020 input extractor, same output format as the TMTAS Input Extractor |
| `tests/` | `node --test` unit and end-to-end tests (no dependencies) |

**Conventions**
- No build step and no dependencies for the site: plain ES modules.
- Anything from outside (names, links, sheet cells) goes through `esc()`; interactivity uses `data-action` attributes handled in `main.js`, never inline `onclick` with data in it.
- Logic that can be pure lives in `js/model.js`, `js/format.js` or `scripts/lib/` and gets a test.

## Development

```bash
npm test               # unit + end-to-end tests (Node 20+, no install needed)
npm run check          # syntax-check every JS file
npm run serve          # serve the site locally, open http://localhost:3000
npm run update         # refresh WRs + TAS runs (Trackmania.io is rate-limited: ~10 min)
npm run sync-sheet     # read tags/videos from the Google Sheet
npm run build          # build share pages and sheet feeds
```
Pull requests run `npm run check` and `npm test` (`.github/workflows/ci.yml`).

## Adding a TAS run

Upload the replay to **[tmtas.exchange/upload](https://tmtas.exchange/upload)**. The site picks it up on the next refresh, or straight away when someone opens that map.

## Tracker sheet (Google Sheets)

[Kacky Reloaded TAS Tracker](https://docs.google.com/spreadsheets/d/1sZ8D3ALu3Ex7AUxqpjJlUAXCA4NVRdZ8VCrsmqW4lvw/edit) (view-only link; editors are invited by the owner).

- **Maps tab:** WR / TAS columns import themselves from this site (`data/sheet_core.csv`, `data/sheet_extra.csv`, generated at deploy). People fill in **Cut**, **Rating**, **Video link** and **Video title**.
- **Compilations tab:** videos not tied to one map.
- **Main tab:** progress, per-edition time saved, cut counts, ratings and a runner leaderboard.
- Every 30 min the data job reads those columns (`scripts/gsheet_sync.mjs`, CSV export, no credentials) into `data/classify.json` and `data/videos.json`.
- A tag or video remembers which TAS it was added for. When a faster TAS replaces that run, it turns red in the sheet and the site stops showing it as current.

Score = average of Great 100 · Good 75 · Okay 50 · Meh 25.

## Share links

`/m/<map #>.html` and `/p/<player>.html` carry link-preview tags (thumbnail, WR vs TAS) for Discord and others, then redirect to the site. Use **🔗 Copy link** on a map or profile.

## Player profiles

Click any player name (map page, Stats tab) or go to `#player-<name>`: best TASes, time saved, cuts, ratings, per-edition breakdown, every run and any human WRs they hold.

## Campaign IDs (club 3074)

| | 1/3 | 2/3 | 3/3 |
|---|---|---|---|
| KR1 | 4398 | 4399 | 4400 |
| KR2 | 13182 | 13183 | 13184 |
| KR3 | 29580 | 29581 | 29583 |
| KR4 | 50111 | 50112 | 50113 |
| KR5 | 81240 | 81241 | 81242 |
| KR6 | 114976 | 114977 | 114978 |
| KR7 | 164289 | 164293 | 164294 |
