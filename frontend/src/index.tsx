import React from "react"
import ReactDOM from "react-dom/client"
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client"
import { ApolloProvider } from "@apollo/client/react"
import { BrowserRouter } from "react-router-dom"

import { App } from "./App"

const client = new ApolloClient({
  link: new HttpLink({
    uri: import.meta.env.VITE_GRAPHQL_URI || "http://localhost:4000/graphql",
  }),
  cache: new InMemoryCache(),
})

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
)

root.render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>
)
