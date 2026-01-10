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

    await db.exec("DROP TABLE IF EXISTS items;")
    await db.exec(`
        CREATE TABLE items (
            id TEXT,
            user TEXT,
            service TEXT,
            title TEXT,
            substring TEXT,
            filename TEXT
        );
    `)

    const jsonFiles = await glob("**/*.json", { cwd: searchDir })

    for (const file of jsonFiles) {
        const filePath = path.join(searchDir, file)
        const fileContent = await fs.readFile(filePath, "utf-8")
        const data = JSON.parse(fileContent) as Partial<MediaMetadata>

        const id = data.id ?? ""
        const user = data.user ?? ""
        const service = data.service ?? ""
        const title = data.title ?? ""
        const substring = data.substring ?? ""
        const filename = file.replace(/\.json$/, "")
        
        console.log(`Ingesting: ${filename}`)

        await db.run(
            "INSERT INTO items (id, user, service, title, substring, filename) VALUES (?, ?, ?, ?, ?, ?)",
            [id, user, service, title, substring, filename]
        )
    }

    const result = await db.get("SELECT COUNT(*) as count FROM items")
    console.log(`Ingestion complete. Total items: ${result.count}`)

    await db.close()
}

main().catch(err => {
    console.error("Ingestion failed:", err)
    process.exit(1)
})
