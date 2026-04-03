import { program } from "commander"
import { glob } from "glob"
import sqlite3 from "sqlite3"
import { open } from "sqlite"
import fs from "fs/promises"
import path from "path"
import sharp from "sharp"

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
    .option("--reset", "Delete the existing database before ingesting.")
    .option("--continue-on-error", "Skip invalid files instead of crashing; report them at the end.")
    .option("--thumb-dir <path>", "Directory to write generated thumbnails into.")
    .parse(process.argv)

  const [searchDir, dbPath] = program.args
  const { reset, continueOnError, thumbDir } = program.opts<{ reset: boolean; continueOnError: boolean; thumbDir?: string }>()

  if (reset) {
    try {
      await fs.unlink(dbPath)
      console.log(`Deleted existing database: ${dbPath}`)
    } catch (err) {
      if ((err as { code: string }).code !== "ENOENT") throw err
    }
  }

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
  const errors: { filename: string; error: string }[] = []
  let added = 0, updated = 0, skipped = 0

  // Read files in parallel batches to avoid saturating file descriptors
  const BATCH_SIZE = 64
  type FileResult =
    | { filename: string; mtime: number; data: Partial<MediaMetadata> }
    | { filename: string; skip: true }
    | { filename: string; error: string }

  const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".tiff", ".tif", ".bmp", ".avif"])
  const isImage = (filename: string) => IMAGE_EXTS.has(path.extname(filename).toLowerCase())

  async function generateThumb(filename: string): Promise<void> {
    if (!thumbDir || !isImage(filename)) return
    const src = path.resolve(searchDir, filename)
    const dest = path.resolve(thumbDir, filename.replace(/\.[^.]+$/, ".jpg"))
    try {
      await fs.access(dest)
      return // already exists
    } catch { /* not cached yet */ }
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await sharp(src).resize(400, 400, { fit: "cover" }).jpeg({ quality: 80 }).toFile(dest)
  }

  async function resolveMediaFilename(derivedFilename: string): Promise<string> {
    const mediaPath = path.join(searchDir, derivedFilename)
    try {
      await fs.access(mediaPath)
      return derivedFilename
    } catch {
      // File not found — look for another file with the same stem in the same directory
      const dir = path.dirname(derivedFilename)
      const stem = path.basename(derivedFilename, path.extname(derivedFilename))
      const entries = await fs.readdir(path.join(searchDir, dir))
      const matches = entries.filter(e =>
        path.basename(e, path.extname(e)) === stem &&
        e !== path.basename(derivedFilename) &&
        !e.endsWith(".json")
      )
      if (matches.length === 1) {
        const corrected = path.join(dir === "." ? "" : dir, matches[0])
        console.warn(`  Extension mismatch: ${derivedFilename} → ${corrected}`)
        return corrected
      }
      throw new Error(`Media file not found: ${mediaPath}`)
    }
  }

  async function processFile(file: string): Promise<FileResult> {
    const filePath = path.join(searchDir, file)

    try {
      const mtime = Math.floor((await fs.stat(filePath)).mtimeMs)
      const derivedFilename = file.replace(/\.json$/, "")

      // Use cached mtime check on the sidecar before doing heavier work
      if (existingMtimes.get(derivedFilename) === mtime) {
        return { filename: derivedFilename, skip: true }
      }

      const data = JSON.parse(await fs.readFile(filePath, "utf-8")) as Partial<MediaMetadata>
      const filename = await resolveMediaFilename(derivedFilename)
      return { filename, mtime, data }
    } catch (err) {
      const filename = file.replace(/\.json$/, "")
      if (!continueOnError) throw new Error(`Failed to process ${filePath}: ${(err as Error).message}`)
      return { filename, error: (err as Error).message }
    }
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

        if ("error" in result) {
          errors.push({ filename: result.filename, error: result.error })
          continue
        }

        const { filename, mtime, data } = result
        await stmt.run(
          data.id ?? "", data.user ?? "", data.service ?? "", data.title ?? "",
          data.substring ?? "", filename, data.published ?? "", mtime
        )

        if (existingMtimes.has(filename)) updated++
        else added++

        await generateThumb(filename).catch(err =>
          console.warn(`  Thumbnail failed for ${filename}: ${(err as Error).message}`)
        )
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

  if (errors.length > 0) {
    console.error(`\n${errors.length} file(s) failed:`)
    for (const { filename, error } of errors) {
      console.error(`  ${filename}: ${error}`)
    }
    process.exit(1)
  }

  await db.close()
}

main().catch(err => {
  console.error("Ingestion failed:", err)
  process.exit(1)
})
