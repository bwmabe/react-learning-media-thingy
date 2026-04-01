import { createServer } from "../src/server"
import path from "path"
import { Server } from "http"
import sqlite3 from "sqlite3"

let baseUrl: string
let httpServer: Server
let db: sqlite3.Database

const testDbPath = path.resolve(__dirname, "../../test-data/test.db")

beforeAll(async () => {
  const server = await createServer(testDbPath)
  httpServer = server.httpServer
  db = server.db

  await new Promise<void>((resolve) => httpServer.listen(0, resolve))
  const port = (httpServer.address() as { port: number }).port
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll((done) => {
  db.close((err) => {
    if (err) console.error(err.message)
    httpServer.close(() => done())
  })
})

async function gql(query: string) {
  const res = await fetch(`${baseUrl}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })
  return res.json() as Promise<{ data: Record<string, unknown> }>
}

describe("GraphQL API", () => {
  it("should return all files", async () => {
    const { data } = await gql("{ files { id title filename } }")
    const files = data.files as { id: string; title: string; filename: string }[]

    expect(files.length).toBe(24)
    expect(files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "img_8675",
          title: "Bunnies and Rabbits",
          filename: "images/8675-bunnysrabbits.jpg",
        }),
      ])
    )
  })

  it("should filter files by title", async () => {
    const { data } = await gql('{ files(filter: "Big Buck Bunny") { id title } }')
    const files = data.files as { id: string; title: string }[]

    expect(files.length).toBe(3)
    expect(files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "vid_1080p",
          title: "Big Buck Bunny 1080p",
        }),
      ])
    )
  })
})
