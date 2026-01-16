import { ApolloServer } from "@apollo/server"
import { expressMiddleware } from "@as-integrations/express4"
import express from "express"
import http from "http"
import cors from "cors"
import path from "path"
import sqlite3 from "sqlite3"
import { typeDefs } from "./schema"

interface FileMetadata {
  id: string
  user: string
  service: string
  title: string
  substring: string
  filename: string
}

export async function createServer(dbPath?: string): Promise<{
  app: express.Express
  httpServer: http.Server
  db: sqlite3.Database
}> {
  const app = express()
  const httpServer = http.createServer(app)
  
  const db = new sqlite3.Database(dbPath || process.env.DATABASE_NAME || "./metadata.db")
  
  const resolvers = {
    Query: {
      files: async (_parent: unknown, { filter }: { filter?: string }): Promise<FileMetadata[]> => {
        return new Promise((resolve, reject) => {
          const query = filter 
            ? "SELECT * FROM items WHERE title LIKE ?" 
            : "SELECT * FROM items"
          const params = filter ? [`%${filter}%`] : []
  
          db.all(query, params, (err, rows: FileMetadata[]) => {
            if (err) {
              console.error(err)
              reject(err)
            }
            resolve(rows)
          })
        })
      },
    },
  }
  
  const server = new ApolloServer({
      typeDefs,
      resolvers,
  })

  await server.start()
  
  const mediaPath = path.resolve(__dirname, "../../test-data/media")
  app.use("/static", express.static(mediaPath))
  
  app.use(
      "/graphql",
      cors<cors.CorsRequest>(),
      express.json(),
      expressMiddleware(server),
  )

  return { app, httpServer, db }
}

async function start() {
  const { httpServer } = await createServer()
  const port = (process.env.PORT && parseInt(process.env.PORT, 10)) || 4000

  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve))

  console.log(`Server ready at http://localhost:${port}/graphql`)
  console.log(`Media served from http://localhost:${port}/static/`)
}

if (require.main === module) {
    start()
}