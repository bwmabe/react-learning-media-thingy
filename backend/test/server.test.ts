
import { createServer } from "../src/server"
import request from "supertest"
import path from "path"
import { Server } from "http"
import sqlite3 from "sqlite3"
import express from "express"

let app: express.Express
let httpServer: Server
let db: sqlite3.Database

const testDbPath = path.resolve(__dirname, "../../test-data/test.db")

beforeAll(async () => {
  const server = await createServer(testDbPath)
  app = server.app
  httpServer = server.httpServer
  db = server.db
})

afterAll((done) => {
  db.close((err) => {
    if (err) {
      console.error(err.message)
    }
    httpServer.close(() => {
      done()
    })
  })
})

describe("GraphQL API", () => {
  it("should return all files", async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: "{ files { id title filename } }",
      })

    expect(response.status).toBe(200)
    expect(response.body.data.files.length).toBe(7)
    expect(response.body.data.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "img_8675",
          title: "Bunnies and Rabbits",
          filename: "images/8675-bunnysrabbits.jpg"
        })
      ])
    )
  })

  it("should filter files by title", async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: "{ files(filter: \"Big Buck Bunny\") { id title } }",
      })

    expect(response.status).toBe(200)
    expect(response.body.data.files.length).toBe(3)
    expect(response.body.data.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "vid_1080p",
          title: "Big Buck Bunny 1080p"
        })
      ])
    )
  })
})
