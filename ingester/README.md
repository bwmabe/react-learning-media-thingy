# Ingester

This component is responsible for ingesting metadata from JSON files into a SQLite database. It scans a specified directory for `.json` files, parses them, and inserts the data into an `items` table in a SQLite database.

## Setup

1.  Navigate to the `ingester` directory:
    ```sh
    cd ingester
    ```
2.  Install the dependencies:
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
npm run ingest ./test/test-assets ./test.db
```

Alternatively, you can first build the project and then run the compiled JavaScript file directly:

```sh
npm run build
node dist/index.js ./test/test-assets ./test.db
```

## Testing

To run the Jest tests, execute:

```sh
npm test
```

This will run the tests defined in `test/index.test.ts`.
