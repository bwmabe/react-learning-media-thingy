# Ingester

This component is responsible for ingesting metadata from JSON files into a SQLite database. It scans a specified directory for `.json` files, parses them, and inserts the data into an `items` table in a SQLite database.

## JSON format

Each media file needs a sidecar `.json` file with the same name (e.g. `photo.jpg` → `photo.jpg.json`):

```json
{
    "id": "unique-id",
    "user": "alice",
    "service": "local",
    "title": "Gallery Name",
    "substring": "A short description.",
    "published": "2024-06-15T14:30:00"
}
```

Files with the same `title` are grouped into the same gallery. The `published` field should be in `YYYY-MM-DDTHH:MM:SS` format.

> **Note:** the ingester drops and recreates the `items` table on every run, so re-ingesting will wipe previous data.

## Setup

Install the dependencies:
```sh
npm install
```

## Building

To compile the TypeScript code, run:

```sh
npm run build
```

This will create a `dist` directory with the compiled JavaScript files.

## Running the Ingester

You can run the ingester using the `ingest` script, which uses `ts-node` for direct execution.

```sh
npm run ingest <directory_to_search> <path_to_db>
```

-   `<directory_to_search>`: The directory to search for JSON files.
-   `<path_to_db>`: The path to the SQLite database file to create or update.

**Example:**

```sh
npm run ingest ../test-data/media ./test.db
```

Alternatively, you can first build the project and then run the compiled JavaScript file directly:

```sh
npm run build
node dist/index.js ../test-data/media ./test.db
```

## Testing

To run the Jest tests, execute:

```sh
npm test
```

This will run the tests defined in `test/index.test.ts`.
