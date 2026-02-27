import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export interface Medicine {
  id: number;
  generic_name: string;
  brand_name: string;
  normalized_generic: string;
  normalized_brand: string;
  category: string;
}

const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, "..", "medicines.db");

if (!fs.existsSync(DB_PATH)) {
  console.error(`medicines.db not found at ${DB_PATH}`);
  process.exit(1);
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
    db.pragma("journal_mode = WAL");
  }
  return db;
}

let cachedMedicines: Medicine[] | null = null;

export function getAllMedicines(): Medicine[] {
  if (!cachedMedicines) {
    const stmt = getDb().prepare(
      "SELECT id, generic_name, brand_name, normalized_generic, normalized_brand, category FROM medicines"
    );
    cachedMedicines = stmt.all() as Medicine[];
    console.log(`Loaded ${cachedMedicines.length} medicines from ${DB_PATH}`);
  }
  return cachedMedicines;
}
