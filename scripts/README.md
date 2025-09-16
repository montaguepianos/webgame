# Asset generation scripts

This repo ships procedurally generated placeholder art and audio assets for Melody Dash. The
scripts live alongside the raw generators so new variants can be produced without external
tooling.

- `pnpm generate:art` – rebuilds the sprite atlas (`assets/atlas/workshop_atlas.png`) plus the
  parallax background layers and UI textures. Images are created with `pngjs` and saved directly to
  the `assets/atlas/` folder.
- `pnpm generate:audio` – regenerates the piano note samples and public-domain music loops
  (`assets/audio/notes` and `assets/music`). Requires `ffmpeg` in the PATH.

Both commands overwrite the existing assets in-place. Commit new outputs alongside updated JSON
metadata if you tweak palettes or song selections.
