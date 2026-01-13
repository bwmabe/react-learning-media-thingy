# Frontend

This is a React application that displays media metadata fetched from the backend GraphQL server. It is built with Create React App and uses Apollo Client for data fetching.

## Setup

1.  Navigate to the `frontend` directory:
    ```sh
    cd frontend
    ```
2.  Install the dependencies:
    ```sh
    npm install
    ```

## Scripts

### Running the Development Server

To start the local development server, run:

```sh
npm start
```

This will open the application in your browser, typically at `http://localhost:3000`. The page will automatically reload as you make edits.

### Building for Production

To create a production-ready build of the application, run:

```sh
npm run build
```

This bundles the app into static files for deployment in the `build/` directory.

### Running Tests

To launch the test runner in interactive watch mode, execute:

```sh
npm test
```

## Connecting to the Backend

This application expects the backend GraphQL server to be running and available.

**IMPORTANT:** The GraphQL endpoint is currently hardcoded to `http://localhost:4000/` in `src/index.tsx`.

If your backend is running on a different address, you must update the `uri` in `frontend/src/index.tsx`:

```typescript
// in src/index.tsx
const client = new ApolloClient({
  link: new HttpLink({
    uri: "http://your-graphql-endpoint/", // <-- Change this line
  }),
  cache: new InMemoryCache(),
});
```

For a more flexible setup, consider using environment variables (e.g., `REACT_APP_GRAPHQL_URI`) to configure this endpoint.
