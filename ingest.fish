#!/usr/bin/fish

if test (count $argv) -lt 2
	echo "Usage: ingest.fish <directory_to_search> <path_to_db>"
	exit 1
end

# Configuration
set SEARCH_DIR (realpath $argv[1])
set DB_PATH (realpath $argv[2])

# Initialize/Reset Database
sqlite3 $DB_PATH "DROP TABLE IF EXISTS items;"
sqlite3 $DB_PATH "CREATE TABLE items (
    id TEXT, 
    user TEXT, 
    service TEXT, 
    title TEXT, 
    substring TEXT, 
    filename TEXT
);"

echo "Database cleared. Scanning for files in $SEARCH_DIR..."
echo "using $DB_PATH"

pushd $SEARCH_DIR

# Find all JSON files recursively
for f in **/*.json
    # 1. Path Logic
    set rel_base_file (string replace ".json" "" $f)
    set esc_file (string  replace -a "'" "''" "$rel_base_file")
    echo $rel_base_file

    # 2. Extraction Logic (jq)
    set id (jq -r '.id // ""' $f)
    set user (jq -r '.user // ""' $f)
    set service (jq -r '.service // ""' $f)
    set title (jq -r '.title // ""' $f)
    set sub (jq -r '.substring // ""' $f)
    echo "end of jq block"

    # 3. SQL Escaping
    set escaped_title (string replace -a "'" "''" "$title")
    set escaped_user (string replace -a "'" "''" "$user")
    set escaped_sub (string replace -a "'" "''" "$sub")

    # 4. Database Insertion
    sqlite3 $DB_PATH "INSERT INTO items (id, user, service, title, substring, filename) \
    VALUES ('$id', '$escaped_user', '$service', '$escaped_title', '$escaped_sub', '$esc_file');"
end

echo "Ingestion complete. Total items: "(sqlite3 $DB_PATH "SELECT COUNT(*) FROM items;")
