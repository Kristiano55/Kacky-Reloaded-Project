# Kacky Reloaded Project

A live TAS tracker for **Kacky Reloaded** (Trackmania 2020): all 525 maps from KR1 (1/3) to KR7 (3/3).

- **Human world records** come from [Trackmania.io](https://trackmania.io/#/clubs/3074) (the KACKY club campaigns)
- **TAS runs** come from [TMTAS Exchange](https://tmtas.exchange)
- **Inputs:** every run has a replay download. Drop the replay into the TMTAS [Input Extractor](https://tmtas.exchange/tools) to get its inputs.

## How it works

```
scripts/update.mjs  ──► data/maps.json    525 maps (UID, author, author time, campaign)
                    ──► data/wr.json      WR time / holder / date per map UID
                    ──► data/tas.json     TAS runs per map UID
.github/workflows/update.yml  runs it every 6 h, commits data, deploys GitHub Pages
index.html + app.js           static site; opening a map also refreshes its TAS runs live
```

## Adding a TAS run

Upload the replay to **[tmtas.exchange/upload](https://tmtas.exchange/upload)**. The site picks it up on the next refresh, or straight away when someone opens that map.

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
