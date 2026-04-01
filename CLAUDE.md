# media-thing

A React media browser. The owner is learning React — keep changes legible and avoid over-engineering.

## Running the project

```bash
npm run dev            # start backend (port 4000) + frontend (port 3000) concurrently
./start-dev.sh         # same, but also installs deps first
npm run install-all    # install all workspace deps
```

Ingest test data:
```bash
npm run ingest -- test-data/media test-data/test.db
```

Backend expects `DATABASE_NAME` env var pointing to the SQLite file. Falls back to `./metadata.db`.

## Project structure

```
frontend/   React app (Create React App, TypeScript)
backend/    Apollo Server + Express + SQLite
ingester/   CLI script that reads JSON metadata files and populates the DB
test-data/  Sample media files and test DB
```

## Key gotchas

- **Media path is hardcoded** in `backend/src/server.ts` — serves from `../../test-data/media` relative to compiled output. Don't move media files without updating this.
- **Ingester is incremental** — reruns on the same directory only process new or modified files (tracked via sidecar mtime). Running it on a different directory will add those files but won't remove the old ones — you'd need to delete the DB and start fresh.
- **`getMediaUrl` in `App.tsx`** splits `VITE_GRAPHQL_URI` on `/graphql` to derive the backend host. Keep that env var in the standard format (`http://host:port/graphql`) or this breaks. When using the Vite proxy, set it to `/graphql` (relative).

## Styling

- Use `App.css` with CSS custom properties — do **not** go back to inline styles.
- Colour scheme is **Catppuccin Mocha**. The full palette is already defined as `--ctp-*` variables in `App.css`. Use those variables; don't hardcode hex colours.

## Code style

- TypeScript throughout; no `any` unless truly unavoidable.
- 2-space indentation.
- Functional React components only.
- Keep components small. If a component is getting long, ask before splitting it — the owner wants to understand the changes.
