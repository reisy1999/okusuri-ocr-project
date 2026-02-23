import { getDb } from "./db";
import { normalizeMedicineName } from "./normalize";

const db = getDb();

// テーブル情報
const count = db.prepare("SELECT COUNT(*) as cnt FROM medicines").get() as {
  cnt: number;
};
console.log(`Total records: ${count.cnt}`);

// カテゴリ別件数
const categories = db
  .prepare("SELECT category, COUNT(*) as cnt FROM medicines GROUP BY category")
  .all() as { category: string; cnt: number }[];
console.log("\nCategory counts:");
for (const c of categories) {
  console.log(`  ${c.category}: ${c.cnt}`);
}

// サンプル検索: normalized_brand で部分一致
const keyword = "フェンタニル";
const normalizedKeyword = normalizeMedicineName(keyword);
console.log(`\nSearch "${keyword}" → normalized: "${normalizedKeyword}"`);

const results = db
  .prepare("SELECT * FROM medicines WHERE normalized_brand LIKE ?")
  .all(`%${normalizedKeyword}%`) as {
  id: number;
  generic_name: string;
  brand_name: string;
  normalized_generic: string;
  normalized_brand: string;
  category: string;
}[];
console.log(`${results.length} hits`);
for (const r of results.slice(0, 5)) {
  console.log(
    `  [${r.id}] ${r.brand_name} (${r.normalized_brand}) - ${r.category}`
  );
}

db.close();
