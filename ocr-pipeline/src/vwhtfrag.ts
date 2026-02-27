/**
 * vwhtfrag（断片パターン指標）アルゴリズム
 *
 * 2つの文字列から重なりのない共通部分文字列（断片）を抽出し、
 * その長さ・位置に基づいてスコアを計算する。
 * 濁点・半濁点の同一視、類似文字のブリッジ機能を備える。
 */

// ---------------------------------------------------------------------------
// パラメータ
// ---------------------------------------------------------------------------
export interface VwhtfragParams {
  /** 中間部分の位置係数（先頭・末尾は常に 1.0） */
  A: number;
  /** 連続性ボーナスの減算値 */
  B: number;
  /** 類似文字自体の長さ加算（0 = ブリッジ専用） */
  C: number;
}

const DEFAULT_PARAMS: VwhtfragParams = {
  A: 0.45,
  B: 0.15,
  C: 0.00,
};

// ---------------------------------------------------------------------------
// 前処理: 濁点・半濁点の同一視
// ---------------------------------------------------------------------------

/**
 * 濁点・半濁点を除去して清音に統一するマップ。
 * カタカナのみ対応（入力は normalize.ts で正規化済みカタカナを想定）。
 */
const DAKUTEN_MAP: Record<string, string> = {};

// ガ行→カ行
const dakutenPairs: [string, string][] = [
  ["ガ", "カ"], ["ギ", "キ"], ["グ", "ク"], ["ゲ", "ケ"], ["ゴ", "コ"],
  // ザ行→サ行
  ["ザ", "サ"], ["ジ", "シ"], ["ズ", "ス"], ["ゼ", "セ"], ["ゾ", "ソ"],
  // ダ行→タ行
  ["ダ", "タ"], ["ヂ", "チ"], ["ヅ", "ツ"], ["デ", "テ"], ["ド", "ト"],
  // バ行・パ行→ハ行
  ["バ", "ハ"], ["ビ", "ヒ"], ["ブ", "フ"], ["ベ", "ヘ"], ["ボ", "ホ"],
  ["パ", "ハ"], ["ピ", "ヒ"], ["プ", "フ"], ["ペ", "ヘ"], ["ポ", "ホ"],
  // ヴ→ウ
  ["ヴ", "ウ"],
];

for (const [from, to] of dakutenPairs) {
  DAKUTEN_MAP[from] = to;
}

/** 濁点・半濁点を清音に統一 */
function stripDakuten(ch: string): string {
  return DAKUTEN_MAP[ch] ?? ch;
}

/** 文字列全体の濁点・半濁点を除去 */
function stripDakutenAll(s: string): string {
  return Array.from(s).map(stripDakuten).join("");
}

// ---------------------------------------------------------------------------
// 前処理: 類似文字ペア
// ---------------------------------------------------------------------------

/** 類似文字ペア（清音ベースで定義） */
const SIMILAR_PAIRS: [string, string][] = [
  ["シ", "ツ"],
  ["ソ", "ン"],
  ["ク", "ワ"],
  ["ク", "ケ"],
  ["コ", "ユ"],
  ["ナ", "メ"],
];

/** 清音化後の文字 → 類似文字集合 */
const SIMILAR_MAP = new Map<string, Set<string>>();
for (const [a, b] of SIMILAR_PAIRS) {
  if (!SIMILAR_MAP.has(a)) SIMILAR_MAP.set(a, new Set());
  if (!SIMILAR_MAP.has(b)) SIMILAR_MAP.set(b, new Set());
  SIMILAR_MAP.get(a)!.add(b);
  SIMILAR_MAP.get(b)!.add(a);
}

// ---------------------------------------------------------------------------
// 文字一致判定
// ---------------------------------------------------------------------------

enum MatchType {
  Exact,
  Dakuten,
  Similar,
  None,
}

/** 2文字を比較し、一致タイプを返す */
function charMatch(a: string, b: string): MatchType {
  if (a === b) return MatchType.Exact;
  const aN = stripDakuten(a);
  const bN = stripDakuten(b);
  if (aN === bN) return MatchType.Dakuten;
  const sim = SIMILAR_MAP.get(aN);
  if (sim && sim.has(bN)) return MatchType.Similar;
  return MatchType.None;
}

// ---------------------------------------------------------------------------
// 断片抽出（再帰的に最適な組み合わせを探索）
// ---------------------------------------------------------------------------

interface Fragment {
  /** s 側の開始位置 */
  si: number;
  /** t 側の開始位置 */
  ti: number;
  /** 一致長 */
  len: number;
  /** 類似文字を含むか（ブリッジ） */
  hasSimilar: boolean;
  /** 類似文字位置のリスト（fragment内のオフセット） */
  similarOffsets: number[];
}

/**
 * s[si..] と t[ti..] の位置から始まる最長共通部分文字列を検出。
 * 完全一致 > 濁点同一視 > 類似文字 の順で一致を拡張する。
 */
function findFragment(
  s: string[],
  t: string[],
  si: number,
  ti: number
): Fragment | null {
  let len = 0;
  let hasSimilar = false;
  const similarOffsets: number[] = [];

  while (si + len < s.length && ti + len < t.length) {
    const mt = charMatch(s[si + len], t[ti + len]);
    if (mt === MatchType.None) break;
    if (mt === MatchType.Similar) {
      hasSimilar = true;
      similarOffsets.push(len);
    }
    len++;
  }

  if (len === 0) return null;
  return { si, ti, len, hasSimilar, similarOffsets };
}

/**
 * s と t から重なりのない共通断片の集合を抽出する。
 * 全ての開始位置の組み合わせから断片を検出し、
 * 再帰的にスコアが最大化される組を選ぶ。
 */
function extractFragments(
  s: string[],
  t: string[],
  usedS: boolean[],
  usedT: boolean[],
  params: VwhtfragParams,
  sLen: number,
  tLen: number,
  memo: Map<string, Fragment[]>
): Fragment[] {
  // メモ化キー: usedS + usedT のビットパターン
  const key = usedS.map(b => b ? "1" : "0").join("") + "|" +
              usedT.map(b => b ? "1" : "0").join("");
  if (memo.has(key)) return memo.get(key)!;

  let bestFragments: Fragment[] = [];
  let bestScore = 0;

  for (let si = 0; si < s.length; si++) {
    if (usedS[si]) continue;
    for (let ti = 0; ti < t.length; ti++) {
      if (usedT[ti]) continue;

      const frag = findFragment(s, t, si, ti);
      if (!frag) continue;

      // 使用済み範囲と重なっていないか確認
      let overlap = false;
      for (let k = 0; k < frag.len; k++) {
        if (usedS[si + k] || usedT[ti + k]) {
          overlap = true;
          break;
        }
      }
      if (overlap) continue;

      // この断片を使用してマーク
      const newUsedS = [...usedS];
      const newUsedT = [...usedT];
      for (let k = 0; k < frag.len; k++) {
        newUsedS[si + k] = true;
        newUsedT[ti + k] = true;
      }

      // 再帰的に残りの断片を探索
      const rest = extractFragments(s, t, newUsedS, newUsedT, params, sLen, tLen, memo);
      const candidate = [frag, ...rest];
      const score = calcScoreFromFragments(candidate, sLen, tLen, params);

      if (score > bestScore) {
        bestScore = score;
        bestFragments = candidate;
      }
    }
  }

  memo.set(key, bestFragments);
  return bestFragments;
}

// ---------------------------------------------------------------------------
// スコア計算
// ---------------------------------------------------------------------------

/**
 * 断片の位置係数Aを決定する。
 * 断片が先頭（si===0 or ti===0）または末尾に接しているなら 1.0、
 * それ以外は params.A。
 */
function positionCoefficient(
  frag: Fragment,
  sLen: number,
  tLen: number,
  A: number
): number {
  // 先頭一致
  if (frag.si === 0 || frag.ti === 0) return 1.0;
  // 末尾一致
  if (frag.si + frag.len === sLen || frag.ti + frag.len === tLen) return 1.0;
  return A;
}

/**
 * 断片集合からスコアを計算する。
 * Score = Σ((effectiveLen - B) × posCoeff) / avgLen
 */
function calcScoreFromFragments(
  fragments: Fragment[],
  sLen: number,
  tLen: number,
  params: VwhtfragParams
): number {
  const avgLen = (sLen + tLen) / 2;
  if (avgLen === 0) return 1.0;

  let total = 0;

  for (const frag of fragments) {
    // 実効長: 類似文字部分は C で加算（デフォルト0 = カウントしない）
    const similarCount = frag.similarOffsets.length;
    const exactCount = frag.len - similarCount;
    const effectiveLen = exactCount + similarCount * params.C;

    const posCoeff = positionCoefficient(frag, sLen, tLen, params.A);
    const contribution = (effectiveLen - params.B) * posCoeff;
    if (contribution > 0) {
      total += contribution;
    }
  }

  return total / avgLen;
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

/**
 * vwhtfrag スコアを計算する。
 * @param s 入力文字列（正規化済みカタカナ）
 * @param t DB文字列（正規化済みカタカナ）
 * @param params チューニングパラメータ
 * @returns 0〜1+ のスコア（1.0 に近いほど類似）
 */
export function vwhtfragScore(
  s: string,
  t: string,
  params: VwhtfragParams = DEFAULT_PARAMS
): number {
  if (s === t) return 1.0;
  if (s.length === 0 || t.length === 0) return 0;

  const sArr = Array.from(s);
  const tArr = Array.from(t);

  // 同じ長さで全文字が完全一致 or 濁点同一視で一致 → 同一とみなす
  if (sArr.length === tArr.length) {
    let allDakutenMatch = true;
    for (let i = 0; i < sArr.length; i++) {
      const mt = charMatch(sArr[i], tArr[i]);
      if (mt === MatchType.None || mt === MatchType.Similar) {
        allDakutenMatch = false;
        break;
      }
    }
    if (allDakutenMatch) return 1.0;
  }

  const usedS = new Array<boolean>(sArr.length).fill(false);
  const usedT = new Array<boolean>(tArr.length).fill(false);

  const memo = new Map<string, Fragment[]>();
  const fragments = extractFragments(
    sArr, tArr, usedS, usedT, params, sArr.length, tArr.length, memo
  );

  return calcScoreFromFragments(fragments, sArr.length, tArr.length, params);
}
