import { program } from "commander"
import { glob } from "glob"
import sqlite3 from "sqlite3"
import { open } from "sqlite"
import fs from "fs/promises"
import path from "path"

interface MediaMetadata {
  id: string;
  user: string;
  service: string;
  title: string;
  substring: string;
  published: string;
}

async function main() {
  program
    .argument("<directory_to_search>", "The directory to search for JSON files.")
    .argument("<path_to_db>", "The path to the SQLite database file.")
    .parse(process.argv)

  const [searchDir, dbPath] = program.args

  console.log(`Using database at: ${dbPath}`)
  console.log(`Scanning for files in: ${searchDir}`)

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  })

  await db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      user TEXT,
      service TEXT,
      title TEXT,
      substring TEXT,
      filename TEXT,
      published TEXT,
      sidecar_mtime INTEGER
    )
  `)

  // Migrate old schema if needed
  const cols = await db.all<Array<{ name: string; pk: number }>>("PRAGMA table_info(items)")
  const idPk = cols.find(c => c.name === "id")?.pk ?? 1
  const hasMtime = cols.some(c => c.name === "sidecar_mtime")

  if (idPk === 0) {
    console.log("Migrating database schema (adding primary key)...")
    await db.exec("ALTER TABLE items RENAME TO items_old")
    await db.exec(`
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        user TEXT,
        service TEXT,
        title TEXT,
        substring TEXT,
        filename TEXT,
        published TEXT,
        sidecar_mtime INTEGER
      )
    `)
    await db.exec(
      "INSERT OR REPLACE INTO items (id, user, service, title, substring, filename, published) " +
      "SELECT id, user, service, title, substring, filename, published FROM items_old"
    )
    await db.exec("DROP TABLE items_old")
  } else if (!hasMtime) {
    await db.exec("ALTER TABLE items ADD COLUMN sidecar_mtime INTEGER")
  }

  // Load existing entries for incremental comparison
  const existing = await db.all<Array<{ filename: string; sidecar_mtime: number | null }>>(
    "SELECT filename, sidecar_mtime FROM items"
  )
  const existingMtimes = new Map(existing.map(r => [r.filename, r.sidecar_mtime]))

  const jsonFiles = await glob("**/*.json", { cwd: searchDir })
  const scannedFilenames = new Set<string>()
  let added = 0, updated = 0, skipped = 0

  // Read files in parallel batches to avoid saturating file descriptors
  const BATCH_SIZE = 64
  type FileResult = { filename: string; mtime: number; data: Partial<MediaMetadata> } | { filename: string; skip: true }

  async function processFile(file: string): Promise<FileResult> {
    const filename = file.replace(/\.json$/, "")
    const filePath = path.join(searchDir, file)
    const mtime = Math.floor((await fs.stat(filePath)).mtimeMs)

    if (existingMtimes.get(filename) === mtime) {
      return { filename, skip: true }
    }

    const data = JSON.parse(await fs.readFile(filePath, "utf-8")) as Partial<MediaMetadata>
    return { filename, mtime, data }
  }

  const stmt = await db.prepare(
    "INSERT OR REPLACE INTO items (id, user, service, title, substring, filename, published, sidecar_mtime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  )

  await db.run("BEGIN")
  try {
    for (let i = 0; i < jsonFiles.length; i += BATCH_SIZE) {
      const batch = jsonFiles.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(batch.map(processFile))

      for (const result of results) {
        scannedFilenames.add(result.filename)

        if ("skip" in result) {
          skipped++
          continue
        }

        const { filename, mtime, data } = result
        await stmt.run(
          data.id ?? "", data.user ?? "", data.service ?? "", data.title ?? "",
          data.substring ?? "", filename, data.published ?? "", mtime
        )

        if (existingMtimes.has(filename)) updated++
        else added++
      }
    }
    await db.run("COMMIT")
  } catch (err) {
    await db.run("ROLLBACK")
    throw err
  }

  await stmt.finalize()

  // Remove entries for files that no longer exist on disk
  const toDelete = [...existingMtimes.keys()].filter(f => !scannedFilenames.has(f))
  if (toDelete.length > 0) {
    await db.run("BEGIN")
    for (const filename of toDelete) {
      await db.run("DELETE FROM items WHERE filename = ?", filename)
    }
    await db.run("COMMIT")
    console.log(`Removed ${toDelete.length} stale entries`)
  }

  const result = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM items")
  console.log(`Done: ${added} added, ${updated} updated, ${skipped} skipped. Total: ${result?.count}`)

  await db.close()
}

main().catch(err => {
  console.error("Ingestion failed:", err)
  process.exit(1)
})
