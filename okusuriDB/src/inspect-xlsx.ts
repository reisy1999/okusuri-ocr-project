import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

const dataDir = path.join(__dirname, "..");
const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".xlsx"));

for (const file of files) {
  console.log(`\n=== ${file} ===`);
  const wb = XLSX.readFile(path.join(dataDir, file));
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    console.log(`  Sheet: "${sheetName}" (${rows.length} rows)`);
    if (rows.length > 0) {
      console.log(`  Columns: ${Object.keys(rows[0]).join(", ")}`);
      console.log(`  First 3 rows:`);
      rows.slice(0, 3).forEach((r, i) => console.log(`    [${i}]`, r));
    }
  }
}
