/**
 * レーベンシュタイン距離 vs vwhtfrag スコア比較スクリプト
 *
 * 使い方: npx tsx src/compare-algorithms.ts
 */

import { normalizedScore } from "./levenshtein";
import { vwhtfragScore } from "./vwhtfrag";

interface TestCase {
  input: string;
  target: string;
  description: string;
}

const testCases: TestCase[] = [
  { input: "ロキソニン",     target: "ロキソニン",     description: "完全一致" },
  { input: "ブルゼニド",     target: "プルゼニド",     description: "濁点半濁点 (ブ→プ)" },
  { input: "エスゾビクロン", target: "エスゾピクロン", description: "濁点半濁点 (ビ→ピ)" },
  { input: "デバケン",       target: "デパケン",       description: "濁点半濁点 (バ→パ)" },
  { input: "ファモチワン",   target: "ファモチジン",   description: "類似文字 (ワ→ジ) + 濁点" },
  { input: "サイザル",       target: "ザイザル",       description: "位置入れ替え" },
];

function pad(s: string, width: number): string {
  const len = [...s].length;
  return s + " ".repeat(Math.max(0, width - len));
}

console.log("=".repeat(90));
console.log("  レーベンシュタイン距離 vs vwhtfrag スコア比較");
console.log("=".repeat(90));
console.log("");
console.log(
  `  ${pad("入力", 12)}  ${pad("対象", 12)}  ${pad("Levenshtein", 12)}  ${pad("vwhtfrag", 12)}  説明`
);
console.log("-".repeat(90));

for (const tc of testCases) {
  const levScore = normalizedScore(tc.input, tc.target);
  const vwScore = vwhtfragScore(tc.input, tc.target);

  console.log(
    `  ${pad(tc.input, 12)}  ${pad(tc.target, 12)}  ${pad(levScore.toFixed(4), 12)}  ${pad(vwScore.toFixed(4), 12)}  ${tc.description}`
  );
}

console.log("-".repeat(90));
