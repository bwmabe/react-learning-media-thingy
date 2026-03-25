# Project Notes

## What this is

A React media browser app built to learn React development. Has a GraphQL backend and a React frontend. Started by "vibe coding" with Gemini to see how much it could accelerate development — conclusion from README: "I think it did?"

## Your notes (from README)

- Making this to get more familiar with React development
- Mostly vibe coded with Gemini to start
- You do know how to code, just wanted to see what it could do

## Things discussed in our first session

### Problems at the start
- **Video player was broken** — Video.js was failing silently. Root cause: React 18 runs `useEffect` twice in dev (StrictMode), which initialised the player then immediately disposed it, leaving a broken DOM node that couldn't be reinitialised.
- **No dark theme** — Everything was inline styles with hardcoded light colours (`#eee`, `#e0e0e0`, etc.)
- **Images didn't display** — Non-video files showed "Select a video file to play" instead of an image. The `isVideo` check had no `else` branch for images.
- **Layout** — Default 30/70 split with no styling. You said you don't know what you want yet and will find a design tool to mock it up first.

### Fixes made
- Replaced Video.js with a native `<video controls playsInline>` element
  - `playsInline` is important for iPad — without it Safari forces fullscreen on play
  - No more initialisation bugs, smaller bundle, native browser controls
- Added `isImage()` check and an `<img>` branch so images display
- Added Catppuccin Mocha theme via `App.css` with CSS custom properties
- Moved all inline styles to CSS classes

### Target devices
- Desktop computer
- 2017 iPad (Safari on iOS — needs `playsInline`, touch-friendly controls)

### Your preferences
- **Colour scheme:** Catppuccin Mocha for everything

## Known issues / things to revisit

### Architecture
- **GraphQL is overkill here.** One read-only query, no mutations, no subscriptions. A single REST endpoint (`GET /files?filter=...`) would be simpler and remove the Apollo dependency from the frontend. Worth discussing if you want to simplify, but it works fine as-is and is useful for learning Apollo/React.
- **Media path is hardcoded** in `backend/src/server.ts` line 57: `path.resolve(__dirname, "../../test-data/media")`. This is relative to the compiled JS output location, not configurable. Fine for dev, would need an env var for production.
- **The ingester is destructive** — it does `DROP TABLE IF EXISTS items` every run. Running it twice with different directories nukes the first ingest. No merge/append option.

### Frontend
- **`getMediaUrl` is fragile** — it splits `REACT_APP_GRAPHQL_URI` on `/graphql` to derive the backend host. If the env var isn't set it falls back to `localhost:4000`, which is fine in dev. But if the URI format changes this breaks silently.
- **No search UI** — the GraphQL `files(filter: String)` query supports title filtering but there's no search box in the frontend.
- **No routing** — single page, no React Router. Fine for now but will matter if you add more views.
- **Layout is a placeholder** — current layout is kept from the original structure, just restyled. You plan to mock up what you actually want in a design tool and bring it back.

### Data / schema
- The `FileMetadata` GraphQL type has `service` and `substring` fields that the frontend never uses.
- All GraphQL fields are nullable (`String` not `String!`) — could tighten this up.

## How to run

```bash
# Install everything
npm run install-all

# Start dev (backend + frontend concurrently)
npm run dev

# Or use the startup script (installs deps, runs ingester, starts both)
./start-dev.sh

# Ingest test data
npm run ingest -- test-data/media test-data/test.db
```

Backend runs on `localhost:4000`, frontend on `localhost:3000` (CRA default).
