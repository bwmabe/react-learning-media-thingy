# Frontend

This is a React application that displays media metadata fetched from the backend GraphQL server. It is built with Create React App and uses Apollo Client for data fetching.

## Setup

Install the dependencies:
```sh
npm install
```

## Scripts

### Running the Development Server

To start the local development server, run:

```sh
npm start
```

This will open the application in your browser. By default, it runs on port `3000`.

To run the server on a different port, you can use the `PORT` environment variable.

**Example using command line:**
```sh
PORT=3001 npm start
```

Alternatively, you can add the `PORT` variable to a `.env` file in the `frontend` directory.

**Example `.env` file:**
```
PORT=3001
```

The application will automatically reload if you make changes to the code.

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

This application connects to the backend GraphQL server to fetch data. The endpoint for this server can be configured using an environment variable.

By default, it will attempt to connect to `http://localhost:4000`.

To configure a different endpoint, create a file named `.env` in the `frontend` directory. Add the `REACT_APP_GRAPHQL_URI` variable to this file, pointing to your backend's URL.

**Example `.env` file:**
```
REACT_APP_GRAPHQL_URI=http://localhost:8080
```

The backend server runs on port `4000` by default, but its port can be changed via the `PORT` environment variable, as described in the [backend's README](../backend/README.md). Make sure the URI you provide here matches the address of your running backend instance.
