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

## Usage

### Ingesting Data

To ingest data into the application, you can use the TypeScript-based ingester. Before running, make sure you have installed the dependencies in the `ingester` directory:

```bash
npm --prefix ingester/ install
```

Then, you can run the ingester script with the following command, replacing `<directory_to_search>` with the path to your JSON files and `<path_to_db>` with the desired database file path.

**Example:**

```bash
npm --prefix ingester/ run ingest -- <directory_to_search> <path_to_db>
```

For example, to search for files in a directory named `my_media` and use a database file named `media.db`, you would run:

```bash
npm --prefix ingester/ run ingest -- my_media media.db
```

## Third-Party Content

The Big Buck Bunny video clips used for testing purposes in the `test-media` directory are from the Blender Foundation.
© copyright 2008, Blender Foundation / www.bigbuckbunny.org.
These clips are licensed under the [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/) license.

