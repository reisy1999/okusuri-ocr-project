import Database from "better-sqlite3";
import path from "path";

export interface Medicine {
  id: number;
  generic_name: string;
  brand_name: string;
  normalized_generic: string;
  normalized_brand: string;
  category: string;
}

const DB_PATH = path.resolve(__dirname, "..", "medicines.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
    db.pragma("journal_mode = WAL");
  }
  return db;
}

let cachedMedicines: Medicine[] | null = null;

/**
 * 全医薬品レコードを取得（起動時にキャッシュ）
 */
export function getAllMedicines(): Medicine[] {
  if (!cachedMedicines) {
    const stmt = getDb().prepare("SELECT id, generic_name, brand_name, normalized_generic, normalized_brand, category FROM medicines");
    cachedMedicines = stmt.all() as Medicine[];
  }
  return cachedMedicines;
}
