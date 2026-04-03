import { ApolloServer } from "@apollo/server"
import { expressMiddleware } from "@as-integrations/express4"
import express from "express"
import http from "http"
import cors from "cors"
import path from "path"
import fs from "fs"
import sqlite3 from "sqlite3"
import sharp from "sharp"
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
      files: (_parent: unknown, { filter }: { filter?: string }) =>
        dbAll<FileMetadata>(
          filter ? "SELECT * FROM items WHERE title LIKE ?" : "SELECT * FROM items",
          filter ? [`%${filter}%`] : []
        ),
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

  app.get("/thumb/*", async (req, res) => {
    const relPath = req.path.slice("/thumb/".length)
    const mediaFile = path.resolve(mediaPath, relPath)
    const cacheFile = path.resolve(thumbPath, relPath.replace(/\.[^.]+$/, ".jpg"))

    // Guard against path traversal
    if (!mediaFile.startsWith(mediaPath + path.sep) && mediaFile !== mediaPath) {
      return res.status(400).send("Invalid path")
    }

    if (fs.existsSync(cacheFile)) {
      res.setHeader("Content-Type", "image/jpeg")
      return res.sendFile(cacheFile)
    }

    if (!fs.existsSync(mediaFile)) {
      return res.status(404).send("Not found")
    }

    try {
      await fs.promises.mkdir(path.dirname(cacheFile), { recursive: true })
      await sharp(mediaFile).resize(400, 400, { fit: "cover" }).jpeg({ quality: 80 }).toFile(cacheFile)
      res.setHeader("Content-Type", "image/jpeg")
      res.sendFile(cacheFile)
    } catch (err) {
      console.error("Thumbnail generation failed:", err)
      res.status(500).send("Thumbnail generation failed")
    }
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