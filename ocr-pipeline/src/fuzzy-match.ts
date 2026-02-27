import { getAllMedicines } from "./db";
import { vwhtfragScore } from "./vwhtfrag";
import { normalizeMedicineName } from "./normalize";

export interface MatchResult {
  input: string;
  best_match: string;
  score: number;
  status: "unmodified" | "modified" | "no_match";
}

// しきい値（後で調整する）
const THRESHOLD_UNMODIFIED = 0.85;
const THRESHOLD_MODIFIED = 0.5;

function determineStatus(score: number): MatchResult["status"] {
  if (score >= THRESHOLD_UNMODIFIED) return "unmodified";
  if (score >= THRESHOLD_MODIFIED) return "modified";
  return "no_match";
}

/**
 * 入力文字列に対して医薬品マスタから最もスコアの高い候補を返す
 *
 * 比較: normalizeMedicineName で剥いた文字列同士を vwhtfrag で比較
 * 表示: DB の元の generic_name / brand_name をそのまま返す
 */
export function findBestMatch(input: string): MatchResult {
  const medicines = getAllMedicines();
  const { normalized } = normalizeMedicineName(input);

  let bestScore = -1;
  let bestDisplayName = "";

  for (const med of medicines) {
    // normalized_generic とマッチング（比較用）→ 表示は generic_name
    const gScore = vwhtfragScore(normalized, med.normalized_generic);
    if (gScore > bestScore) {
      bestScore = gScore;
      bestDisplayName = med.generic_name;
    }

    // normalized_brand とマッチング（比較用）→ 表示は brand_name
    const bScore = vwhtfragScore(normalized, med.normalized_brand);
    if (bScore > bestScore) {
      bestScore = bScore;
      bestDisplayName = med.brand_name;
    }
  }

  const score = Math.round(bestScore * 100) / 100;

  return {
    input,
    best_match: bestDisplayName,
    score,
    status: determineStatus(score),
  };
}

/**
 * 複数の薬品名候補に対してファジーマッチングを実行
 */
export function fuzzyMatchAll(drugs: string[]): MatchResult[] {
  return drugs.map(findBestMatch);
}
