# Ingester

This component is responsible for ingesting metadata from JSON sidecar files into a SQLite database. It scans a directory recursively for `.json` files and upserts the data into an `items` table. Re-running on the same directory is incremental — only new or modified files are processed.

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

> **Note:** the sidecar schema is not controlled by this project — real sidecars may have more or fewer fields. The fields above are the ones this app uses; others are ignored.

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

```sh
npm run ingest <directory_to_search> <path_to_db> [options]
```

| Argument | Description |
| --- | --- |
| `<directory_to_search>` | Directory to scan recursively for `.json` sidecar files |
| `<path_to_db>` | Path to the SQLite database file (created if it doesn't exist) |

| Option | Description |
| --- | --- |
| `--reset` | Delete the existing database before ingesting (full re-ingest) |
| `--continue-on-error` | Skip invalid files instead of crashing; report failures at the end |

**Examples:**

```sh
# Incremental update
npm run ingest ../test-data/media ./test.db

# Full re-ingest from scratch
npm run ingest ../test-data/media ./test.db --reset

# Power through bad files and report them at the end
npm run ingest ../test-data/media ./test.db --continue-on-error
```

When a file fails without `--continue-on-error`, the error message includes the full file path so you can find the offending sidecar. With `--continue-on-error`, all failures are listed after the run and the process exits with code 1.

## Testing

To run the Jest tests, execute:

```sh
npm test
```

This will run the tests defined in `test/index.test.ts`.
