import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { initDb } from "./db";
import { normalizeMedicineName } from "./normalize";

const dataDir = path.join(__dirname, "..");
const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".xlsx"));

if (files.length === 0) {
  console.error("No xlsx files found in project root.");
  process.exit(1);
}

const db = initDb();

const insert = db.prepare(
  "INSERT INTO medicines (generic_name, brand_name, normalized_generic, normalized_brand, category) VALUES (?, ?, ?, ?, ?)"
);

const insertMany = db.transaction(
  (
    rows: {
      generic_name: string;
      brand_name: string;
      normalized_generic: string;
      normalized_brand: string;
      category: string;
    }[]
  ) => {
    for (const row of rows) {
      insert.run(
        row.generic_name,
        row.brand_name,
        row.normalized_generic,
        row.normalized_brand,
        row.category
      );
    }
  }
);

// 既存データをクリアして再インポート
db.exec("DELETE FROM medicines");

let total = 0;

for (const file of files) {
  const wb = XLSX.readFile(path.join(dataDir, file));
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

    const mapped = rows.map((r) => {
      const genericName = r["成分名"] ?? "";
      const brandName = r["品名"] ?? "";
      return {
        generic_name: genericName,
        brand_name: brandName,
        normalized_generic: normalizeMedicineName(genericName),
        normalized_brand: normalizeMedicineName(brandName),
        category: r["区分"] ?? "",
      };
    });

    insertMany(mapped);
    total += mapped.length;
    console.log(`${file} / ${sheetName}: ${mapped.length} rows imported`);
  }
}

// 正規化結果のサンプル表示
console.log(`\nDone. Total: ${total} rows`);
console.log("\n=== 正規化サンプル ===");
const samples = db
  .prepare("SELECT brand_name, normalized_brand FROM medicines LIMIT 20")
  .all() as { brand_name: string; normalized_brand: string }[];
for (const s of samples) {
  console.log(`  ${s.brand_name}  →  ${s.normalized_brand}`);
}

db.close();
