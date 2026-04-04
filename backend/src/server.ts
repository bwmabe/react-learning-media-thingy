import { ApolloServer } from "@apollo/server"
import { expressMiddleware } from "@as-integrations/express4"
import express from "express"
import http from "http"
import cors from "cors"
import path from "path"
import fs from "fs"
import sqlite3 from "sqlite3"
import { typeDefs } from "./schema"

interface FileMetadata {
  id: string
  user: string
  service: string
  title: string
  substring: string
  filename: string
  published: string
}

export async function createServer(dbPath?: string): Promise<{
  app: express.Express
  httpServer: http.Server
  db: sqlite3.Database
}> {
  const app = express()
  const httpServer = http.createServer(app)
  
  const db = new sqlite3.Database(dbPath || process.env.DATABASE_NAME || "./metadata.db")

  await new Promise<void>((resolve, reject) =>
    db.run(
      "CREATE TABLE IF NOT EXISTS thumbs (user TEXT PRIMARY KEY, filename TEXT NOT NULL)",
      err => err ? reject(err) : resolve()
    )
  )

  const dbAll = <T>(query: string, params: unknown[] = []): Promise<T[]> =>
    new Promise((resolve, reject) =>
      db.all(query, params, (err, rows) => err ? reject(err) : resolve(rows as T[]))
    )

  const dbRun = (query: string, params: unknown[] = []): Promise<void> =>
    new Promise((resolve, reject) =>
      db.run(query, params, err => err ? reject(err) : resolve())
    )

  const resolvers = {
    Query: {
      users: () =>
        dbAll<{ user: string }>("SELECT DISTINCT user FROM items ORDER BY user")
          .then(rows => rows.map(r => r.user)),
      userPreview: async (_parent: unknown, { user }: { user: string }) => {
        const rows = await dbAll<{ filename: string }>(
          `SELECT filename FROM items WHERE user = ? AND (
            filename LIKE '%.jpg' OR filename LIKE '%.jpeg' OR
            filename LIKE '%.png' OR filename LIKE '%.webp' OR
            filename LIKE '%.heic' OR filename LIKE '%.avif'
          ) LIMIT 1`,
          [user]
        )
        return rows[0]?.filename ?? null
      },
      files: (_parent: unknown, { filter, user }: { filter?: string; user?: string }) => {
        const conditions: string[] = []
        const params: string[] = []
        if (filter) { conditions.push("title LIKE ?"); params.push(`%${filter}%`) }
        if (user) { conditions.push("user = ?"); params.push(user) }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
        return dbAll<FileMetadata>(`SELECT * FROM items ${where}`, params)
      },
      thumbs: () => dbAll<{ user: string; filename: string }>("SELECT user, filename FROM thumbs"),
    },
    Mutation: {
      setThumb: async (_parent: unknown, { user, filename }: { user: string; filename: string }) => {
        await dbRun("INSERT OR REPLACE INTO thumbs (user, filename) VALUES (?, ?)", [user, filename])
        return { user, filename }
      },
    },
  }
  
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    csrfPrevention: false,
  })

  await server.start()

  const mediaPath = process.env.MEDIA_PATH || path.resolve(__dirname, "../../test-data/media")
  const thumbPath = process.env.THUMB_PATH || path.resolve(__dirname, "../../thumbnails")
  app.use("/static", express.static(mediaPath))

  app.get("/thumb/*", (req, res) => {
    const relPath = req.path.slice("/thumb/".length)
      .split("/").map(decodeURIComponent).join("/")
    const cacheFile = path.resolve(thumbPath, relPath.replace(/\.[^.]+$/, ".jpg"))

    // Guard against path traversal
    if (!cacheFile.startsWith(thumbPath + path.sep) && cacheFile !== thumbPath) {
      return res.status(400).send("Invalid path")
    }

    if (!fs.existsSync(cacheFile)) {
      return res.status(404).send("Not found")
    }

    res.setHeader("Content-Type", "image/jpeg")
    res.sendFile(cacheFile)
  })

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