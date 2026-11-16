# Sheet ⇄ repo sync runbook

Sheet: https://claude.ai/artifact/FobXT4XC1nimRxgjXPjan9 (Claude Sheets artifact, id `77e16e72-d7df-4ace-b699-8367c2cc5d8e`)

Direction:
- **repo → sheet:** WR / best TAS / gap / status / date / replay for maps whose data changed (Maps!D:H, K, M:O)
- **sheet → repo:** Cut + Rating tags (Maps!I:J) → `data/classify.json`; Videos tab → `data/videos.json`
- **Videos:** when a faster TAS replaces the run a video was added for, its link cell (Videos!E:F) is painted red; pasting a new link clears the red.

Steps:
1. `git pull` the repo (main).
2. Read the sheet (Claude Docs connector, `topic.sheets`): `readCells` Maps `I2:J526` and Videos `A2:F800`.
3. Write `sync/sheet.json`:
   `{"tags":{"<map # = row-1>":["<Cut or null>","<Rating or null>"],…}, "videos":[[<sheet row>,"<A: map #>","<E: link>","<F: title>","<D: runner>"],…]}`
   — only rows where Cut or Rating is set; only Videos rows with a link in column E. Map rows are 2–526 (A/D are formulas: use their values); compilations sit below row 529.
4. `node scripts/sheet_sync.mjs sync/sheet.json`
5. For each list in `sync/edits.json`, send one `applyEdits` with that list as `edits` (base = latest revision).
   These only touch data columns; Cut/Rating are written back unchanged, except they are cleared on maps whose best TAS changed (the tags described the old run).
6. If `data/classify.json`, `data/videos.json` or `sync/sheet_state.json` changed: commit and push to main (the push deploys the site).
