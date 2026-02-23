import { getAllMedicines } from "./db";
import { normalizedScore } from "./levenshtein";
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
 */
export function findBestMatch(input: string): MatchResult {
  const medicines = getAllMedicines();
  const { normalized, prefix, suffix } = normalizeMedicineName(input);

  let bestScore = -1;
  let bestName = "";

  for (const med of medicines) {
    // normalized_generic とマッチング
    const gScore = normalizedScore(normalized, med.normalized_generic);
    if (gScore > bestScore) {
      bestScore = gScore;
      bestName = med.normalized_generic;
    }

    // normalized_brand とマッチング
    const bScore = normalizedScore(normalized, med.normalized_brand);
    if (bScore > bestScore) {
      bestScore = bScore;
      bestName = med.normalized_brand;
    }
  }

  const score = Math.round(bestScore * 100) / 100;

  return {
    input,
    best_match: prefix + bestName + suffix,
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
