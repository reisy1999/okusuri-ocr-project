import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "..", "medicines.db");

export function getDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  return db;
}

export function initDb(): Database.Database {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY,
      generic_name TEXT,
      brand_name TEXT,
      normalized_generic TEXT,
      normalized_brand TEXT,
      category TEXT
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_normalized_generic ON medicines(normalized_generic)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_normalized_brand ON medicines(normalized_brand)"
  );
  return db;
}
