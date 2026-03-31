import { exec } from "child_process"
import { promises as fs } from "fs"
import path from "path"
import { open } from "sqlite"
import sqlite3 from "sqlite3"
import util from "util"

const execPromise = util.promisify(exec)

describe("Ingester Script", () => {
  const testAssetsDir = path.resolve(__dirname, "../../test-data/media")
  const dbPath = path.resolve(__dirname, "test.db")
  const ingesterScriptPath = path.resolve(__dirname, "../dist/index.js")

  beforeAll(async () => {
    // Build the project before running tests
    await execPromise("npm run build", { cwd: path.resolve(__dirname, "..") })
  })

  // Before each test, delete the DB file if it exists
  beforeEach(async () => {
    try {
      await fs.unlink(dbPath)
    } catch (error) {
      if ((error as { code: string }).code !== "ENOENT") { // Ignore "file not found" error
        throw error
      }
    }
  })

  test("should ingest JSON files and store them in the database", async () => {
    // Run the ingester script
    const { stderr } = await execPromise(`node ${ingesterScriptPath} ${testAssetsDir} ${dbPath}`)

    // Check for errors
    expect(stderr).toBe("")

    // Open the newly created database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    const items = await db.all("SELECT * FROM items ORDER BY id")
    
    expect(items).toHaveLength(24)

    expect(items).toEqual(
      expect.arrayContaining([
        // originals
        expect.objectContaining({
            id: "img_8675",
            user: "photo_user",
            service: "local",
            title: "Bunnies and Rabbits",
            substring: "A picture of a bunny.",
            filename: path.join("images", "8675-bunnysrabbits.jpg")
        }),
        expect.objectContaining({
            id: "img_8090",
            user: "photo_user",
            service: "local",
            title: "Bunnies and Rabbits",
            substring: "Another picture of a bunny.",
            filename: path.join("images", "8090-bunnysrabbits.jpg")
        }),
        expect.objectContaining({
            id: "img_373691_s",
            user: "photo_user",
            service: "local",
            title: "White Rabbit in sub-directory",
            substring: "A white rabbit in a green field, but in a sub-directory.",
            filename: path.join("images", "rabbit-373691_1280.jpg")
        }),
        expect.objectContaining({
            id: "vid_1080p",
            user: "video_user",
            service: "local",
            title: "Big Buck Bunny 1080p",
            substring: "A trimmed clip of Big Buck Bunny in 1080p.",
            filename: "trimmed_big_buck_bunny_1080p_h264.mov"
        }),
        expect.objectContaining({
            id: "vid_640x360",
            user: "video_user",
            service: "local",
            title: "Big Buck Bunny 640x360",
            substring: "A trimmed clip of Big Buck Bunny in 640x360.",
            filename: path.join("videos", "trimmed_BigBuckBunny_640x360.m4v")
        }),
        expect.objectContaining({
            id: "vid_320x180",
            user: "video_user",
            service: "local",
            title: "Big Buck Bunny 320x180",
            substring: "A trimmed clip of Big Buck Bunny in 320x180.",
            filename: path.join("videos", "trimmed_BigBuckBunny_320x180.mp4")
        }),
        expect.objectContaining({
            id: "img_373691",
            user: "photo_user",
            service: "local",
            title: "White Rabbit",
            substring: "A white rabbit in a green field.",
            filename: "rabbit-373691_1280.jpg"
        }),
        // Cinnamon Spice (images only)
        expect.objectContaining({
            id: "csp_img_1",
            user: "cinnamon_user",
            service: "local",
            title: "Cinnamon Spice",
            substring: "Ground cinnamon spice in warm tones.",
            filename: "cinnamon_spice_1.jpg"
        }),
        expect.objectContaining({ id: "csp_img_6", title: "Cinnamon Spice", filename: "cinnamon_spice_6.jpg" }),
        // Cinnamon Swirl (videos only)
        expect.objectContaining({
            id: "csw_vid_1",
            user: "cinnamon_user",
            service: "local",
            title: "Cinnamon Swirl",
            substring: "A whirling pattern of cinnamon.",
            filename: "cinnamon_swirl_1.mp4"
        }),
        expect.objectContaining({ id: "csw_vid_4", title: "Cinnamon Swirl", filename: "cinnamon_swirl_4.mp4" }),
        // Cinnamon Roll (mixed)
        expect.objectContaining({
            id: "cr_img_1",
            user: "cinnamon_user",
            service: "local",
            title: "Cinnamon Roll",
            substring: "A sweet spiral of cinnamon and dough.",
            filename: "cinnamon_roll_1.jpg"
        }),
        expect.objectContaining({ id: "cr_img_4", title: "Cinnamon Roll", filename: "cinnamon_roll_4.jpg" }),
        expect.objectContaining({ id: "cr_vid_1", title: "Cinnamon Roll", filename: "cinnamon_roll_1.mp4" }),
        expect.objectContaining({ id: "cr_vid_3", title: "Cinnamon Roll", filename: "cinnamon_roll_3.mp4" }),
      ])
    )

    await db.close()
  })
})