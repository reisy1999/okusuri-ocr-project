/**
 * レーベンシュタイン距離の自前実装
 * 後で重み付き編集距離に拡張可能な設計
 */

export interface EditCosts {
  insert: number;
  delete: number;
  replace: number;
}

const DEFAULT_COSTS: EditCosts = {
  insert: 1,
  delete: 1,
  replace: 1,
};

/**
 * 2つの文字列間のレーベンシュタイン距離を計算する
 * Wagner-Fischer アルゴリズム（動的計画法）
 */
export function levenshteinDistance(
  a: string,
  b: string,
  costs: EditCosts = DEFAULT_COSTS
): number {
  const m = a.length;
  const n = b.length;

  // 空文字列のケース
  if (m === 0) return n * costs.insert;
  if (n === 0) return m * costs.delete;

  // DP テーブル（メモリ節約のため2行のみ保持）
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) {
    prev[j] = j * costs.insert;
  }

  for (let i = 1; i <= m; i++) {
    curr[0] = i * costs.delete;

    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = Math.min(
          prev[j] + costs.delete,     // 削除
          curr[j - 1] + costs.insert,  // 挿入
          prev[j - 1] + costs.replace  // 置換
        );
      }
    }

    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/**
 * 正規化スコアを計算する
 * score = 1 - (距離 / max(入力文字列長, DB文字列長))
 */
export function normalizedScore(a: string, b: string, costs?: EditCosts): number {
  const dist = levenshteinDistance(a, b, costs);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1 - dist / maxLen;
}
