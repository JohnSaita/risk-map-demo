## Purpose
Portfolio demo of a hierarchical disease transmission risk map. Only the risk
visualization is in scope. Synthetic risk values only; boundaries from geoBoundaries (see README for per-file licences).

## Core logic (must be preserved exactly)
- Zoom 0–3: country layer (gid0); 3–6: state layer (gid1); 6+: district layer (gid2) — `src/risk/zoomBands.ts`
- Only one admin layer visible at a time
- Missing district risk inherits from its state; missing state risk inherits from its country — `src/risk/resolveRisk.ts`
- Fallback values are visually marked as inherited (hatch layer in `src/map/addRiskLayers.ts`)

## Rules
- TypeScript, modular React components, no quick hacks
- Never commit real client data, names, or coordinates from client projects; nothing is copied from client code
- Mapbox token comes from VITE_MAPBOX_TOKEN in .env; never hard-code it
- No login, no backend, no paid APIs
- Every feature must work on a 400px-wide phone screen

## Done means
- `npm run build` and `npm test` pass with no errors
- Loads in under 3 seconds on the deployed URL
