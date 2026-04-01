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

## Getting started

### 1. Organise your media files

Put your images and videos in a directory of your choice, in whatever subdirectory structure you like.

### 2. Create a JSON sidecar for each file

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
- **`user`** — who the file belongs to; the landing page groups files by user
- **`title`** — the gallery name; all files with the same title appear together in a gallery
- **`substring`** — a short description
- **`published`** — datetime in `YYYY-MM-DDTHH:MM:SS` format

### 3. Ingest your data

```bash
npm run ingest -- /path/to/your/media your-data.db
```

### 4. Run with your data

```bash
DATABASE_NAME=$(pwd)/your-data.db MEDIA_PATH=/path/to/your/media npm run dev
```

## Third-Party Content

The Big Buck Bunny video clips used for testing purposes in the `test-media` directory are from the Blender Foundation.
© copyright 2008, Blender Foundation / www.bigbuckbunny.org.
These clips are licensed under the [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/) license.

