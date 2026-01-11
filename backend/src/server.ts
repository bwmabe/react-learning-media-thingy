import { ApolloServer } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import sqlite3 from "sqlite3"
import { typeDefs } from "./schema"

const db = new sqlite3.Database("./metadata.db")

const resolvers = {
  Query: {
    files: async (_: any, { filter }: { filter?: string }) => {
      return new Promise((resolve, reject) => {
        const query = filter 
          ? "SELECT * FROM items WHERE title LIKE ?" 
          : "SELECT * FROM items"
        const params = filter ? [`%${filter}%`] : []

        db.all(query, params, (err, rows) => {
          if (err) reject(err)
          resolve(rows)
        })
      })
    },
  },
}

const server = new ApolloServer({ typeDefs, resolvers })

startStandaloneServer(server, { listen: { port: 4000 } })
  .then(({ url }) => console.log(`🚀 Server ready at ${url}`))
