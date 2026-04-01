# React Learning Media Thingy

This is a react app that displays media files. There's a GraphQL backend and a React frontend. 

I'm making this to get myself more familiar with React development. 

This is mostly "vibe coded" with Gemini, at least to start. 

I do know how to code, I just wanted to see what it could do and see if it could accelerate development.

I think it did?

## What the pieces do

There are a few parts to this project:

*   `frontend/`: This is the React app that you see in your browser. It's what you interact with.
*   `backend/`: This is a GraphQL server that the frontend talks to. It gets data from the database and sends it to the frontend.
*   `ingester/`: This is a script that reads your media files (the JSON ones) and puts them into a database so the backend can find them.

## Setup

### Prerequisites

- Node.js (v18+)
- npm

### Install dependencies

```bash
npm run install-all
```

This installs dependencies for the root, backend, frontend, and ingester all at once.

### Environment

The frontend needs to know where the backend is. Create a `.env` file in `frontend/`:

```
VITE_GRAPHQL_URI=http://localhost:4000/graphql
```

### Ingest test data

```bash
npm run ingest -- test-data/media test-data/test.db
```

### Run the dev server

```bash
npm run dev
```

This starts the backend on port 4000 and the frontend on port 3000 concurrently. Open http://localhost:3000 in your browser.

## Setting up with real data

### 1. Organise your media files

Put your images and videos in a directory of your choice. Subdirectories are fine — the ingester scans recursively.

```
/mnt/media/
  alice/
    holiday/
      photo1.jpg
      photo1.jpg.json
      photo2.jpg
      photo2.jpg.json
    videos/
      clip.mp4
      clip.mp4.json
  bob/
    ...
```

### 2. Create a JSON sidecar for each media file

For every media file, create a `.json` file with the same name alongside it. For example, `photo.jpg` gets a `photo.jpg.json`:

```json
{
    "id": "unique-id-here",
    "user": "alice",
    "service": "local",
    "title": "Summer Holiday",
    "substring": "A brief description of this file.",
    "published": "2024-06-15T14:30:00"
}
```

- **`id`** — must be unique across all files
- **`user`** — groups files on the landing page
- **`title`** — gallery name; all files with the same title appear together
- **`substring`** — a short description
- **`published`** — datetime in `YYYY-MM-DDTHH:MM:SS` format

### 3. Ingest your data

Run the ingester, passing your media root and a path for the database file:

```bash
npm run ingest -- /mnt/media /srv/media-thing/data.db
```

Use absolute paths. The ingester stores filenames relative to the media root you provide — **`MEDIA_PATH` must point to the same directory** when you run the server.

> **Warning:** The ingester drops and recreates the database every run. Running it again wipes all previous data.

### 4. Run the server

```bash
DATABASE_NAME=/srv/media-thing/data.db MEDIA_PATH=/mnt/media npm run dev
```

The frontend is at http://localhost:3000. From other machines on the network, use the server's IP address instead of `localhost`.

## Third-Party Content

The Big Buck Bunny video clips used for testing purposes in the `test-media` directory are from the Blender Foundation.
© copyright 2008, Blender Foundation / www.bigbuckbunny.org.
These clips are licensed under the [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/) license.

