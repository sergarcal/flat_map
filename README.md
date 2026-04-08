# Flat Zones App

Lightweight map tool to draw preferred and non-preferred areas when evaluating flats.

## Features

- Interactive OpenStreetMap map (free).
- Draw/edit/delete polygon and circle zones from map controls.
- Label zones and assign intent (`good`, `avoid`, `neutral`) with color coding.
- Persist zones in `localStorage`.
- Check if a property coordinate falls inside any drawn zone.

## Stack

- React + Vite + TypeScript
- `react-leaflet` + `react-leaflet-draw` + Leaflet
- Turf (`@turf/helpers`, `@turf/boolean-point-in-polygon`)

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start:
   ```bash
   npm run dev
   ```

## Deploy to GitHub Pages

Set your repository name in `GITHUB_PAGES_REPO` before deploying:

```bash
export GITHUB_PAGES_REPO=pisos
npm run deploy
```

This builds with `--base=/${GITHUB_PAGES_REPO}/` and publishes `dist/` using `gh-pages`.

## Notes

- Circles are stored as polygon approximations + circle metadata (`center`, `radiusMeters`).
- Freehand drawing is intentionally out of v1 scope to keep the app simple.
# flat_map
