# Backend

This component is a GraphQL server built with Apollo Server. It provides an API for querying media metadata from the SQLite database that is populated by the `ingester`.

## Setup

Install the dependencies:
```sh
npm install
```

## Configuration

The server is configured via environment variables:

|    Variable     |  Default Value  |
| --------------- | --------------- |
| `PORT`          |          `4000` |
| `DATABASE_NAME` | `./metadata.db` | 

## Building

```sh
npm run build
```

This will create a `dist` directory with the compiled JavaScript files.

## Running the Server

To start the server, run:

```sh
npm start
```

The server will typically be available at `http://localhost:4000` (or your configured port).

## Example GraphQL Queries

You can use a GraphQL client to send queries to the server's endpoint.

### Get all files

```graphql
query GetAllFiles {
  files {
    id
    title
    service
    user
    filename
  }
}
```

### Get files with a title filter

This query searches for items where the title contains the filter string.

```graphql
query GetFilteredFiles {
  files(filter: "Great") {
    id
    title
    service
    user
    filename
  }
}
```
