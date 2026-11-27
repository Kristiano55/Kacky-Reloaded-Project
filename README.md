# Kacky Reloaded Project

A live TAS tracker for **Kacky Reloaded** (Trackmania 2020): all 525 maps from KR1 (1/3) to KR7 (3/3).

- **Human world records** come from [Trackmania.io](https://trackmania.io/#/clubs/3074) (the KACKY club campaigns)
- **TAS runs** come from [TMTAS Exchange](https://tmtas.exchange): 1 request per refresh lists new uploads; only maps with new uploads are re-fetched (full sweep once a day)
- **Inputs:** every run's inputs are extracted from its replay (with [GBX.NET](https://github.com/BigBang1112/gbx-net)) into `data/inputs/<replayId>.txt`, in the same TM2020 format as the TMTAS Input Extractor (`<ms> accel 1`, `<ms> steer -52`, …). On the site: open a map → **⌨ Inputs** → Copy.

## How it works

```
scripts/update.mjs  ──► data/maps.json    525 maps (UID, author, author time, campaign)
                    ──► data/wr.json      WR time / holder / date per map UID
                    ──► data/tas.json     TAS runs per map UID
.github/workflows/update.yml  runs every 30 min (each run starts the next; cron as backup); commits and deploys only when records change
index.html + app.js           static site; opening a map also refreshes its TAS runs live
```

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

## Run locally

```bash
node scripts/update.mjs          # refresh WRs + TAS (takes ~15 min: Trackmania.io rate limits)
node scripts/update.mjs --maps   # also re-download the map list
npx serve .                      # open http://localhost:3000
```

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
