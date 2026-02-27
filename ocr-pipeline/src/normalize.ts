/**
 * 薬品名の正規化: 容量・剤形・メーカー名・数字を除去し、マッチング用の文字列を生成する
 *
 * 方針: 単位付き数字 → 剤形付き数字 → 剤形 → 括弧内 → 残った裸の数字 の順で除去。
 * DB側・クエリ側で同じ正規化を通すため、数字全除去でもマッチングに影響なし。
 */

export interface NormalizeResult {
  normalized: string;
  prefix: string;
  suffix: string;
}

// 全角→半角変換 (英数字)
function toHalfWidth(s: string): string {
  return s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
}

// 全角記号の半角化
function normalizeSymbols(s: string): string {
  return s
    .replace(/[「「]/g, "(")
    .replace(/[」」]/g, ")")
    .replace(/％/g, "%")
    .replace(/．/g, ".")
    .replace(/／/g, "/")
    .replace(/　/g, " ");
}

// 剤形リスト（長い順）
const FORM_WORDS = [
  // 長い複合語
  "眼科耳鼻科用液",
  "眼耳鼻科用液",
  "口腔内崩壊錠",
  "ドライシロップ",
  "眼科耳科用液",
  "眼科外用液",
  "吸入粉末剤",
  "点滴静注用",
  "吸入麻酔液",
  "眼粘弾剤",
  "眼灌流液",
  "耳科用液",
  "口腔用液",
  "溶解液",
  "うがい液",
  "点耳液",
  "粉末剤",
  "パップ剤",
  "灌流液",
  "洗眼液",
  "OD錠",
  "注射液",
  "注射用",
  "点滴静注",
  "吸入液",
  "吸入用",
  "内用液",
  "経口液",
  "点眼液",
  "点鼻液",
  "静注用",
  "貼付剤",
  "皮下注",
  "カプセル",
  "シロップ",
  "ローション",
  "クリーム",
  "テープ",
  "パッチ",
  "製剤",
  "静注",
  "筋注",
  "坐剤",
  "座薬",
  "軟膏",
  "ゲル",
  "吸入",
  "点眼",
  "点鼻",
  "点耳",
  "噴霧",
  "懸濁",
  "乳剤",
  "腸溶",
  "徐放",
  "配合",
  "細粒",
  "顆粒",
  "錠",
  "散",
  "注",
  "剤",
  "瓶",
  "用",
  "V",
  "pp",
];

// 長い順にソート済みで結合
const formAlt = FORM_WORDS.sort((a, b) => b.length - a.length).join("|");

// --- 除去パターン（順序が重要）---

// 1. 数字+単位 (例: 10mg, 0.5%, 2mg/mL)
const DOSE_PATTERN =
  /\d+\.?\d*\s*(?:mg|g|ml|l|%|μg|mcg|iu|単位|万単位)(?:\/\w+)?/gi;

// 2. 数字+剤形 (例: "坐剤４", "錠5mg" → 剤形の前後の数字)
const DOSE_FORM_PATTERN = new RegExp(
  `\\d+\\.?\\d*\\s*(?:${formAlt})|(?:${formAlt})\\s*\\d+\\.?\\d*`,
  "g"
);

// 3. 剤形単独 (上で数字付きが消えた後の残り)
const FORM_PATTERN = new RegExp(formAlt, "g");

// 4. メーカー名（括弧内）: 「サワイ」「日医工」(AFP)
const MAKER_PATTERN = /[(（「][^)）」]*[)）」]/g;

// 5. 「液」を除去 (液化・涙液は保持)
const LIQUID_PATTERN = /(?<!涙)液(?!化)/g;

// 6. 残った裸の数字 (寸法含む) と寸法区切りの×
const BARE_NUMBER_PATTERN = /[\d.]+(?:mm|cm)?/g;
const DIMENSION_SEP_PATTERN = /[×x]/gi;

// 7. 残った記号をすべて除去 (角括弧・スラッシュ・ハイフン等)
const SYMBOL_PATTERN = /[^a-zA-Zぁ-んァ-ヶー\u4E00-\u9FFF\u3400-\u4DBF]/g;

/**
 * マスク配列上でパターンに一致する箇所を除去済みとしてマークする。
 * パターンは「現在残っている文字列」に対して適用し、
 * マッチ位置を元文字列のインデックスに逆変換する。
 */
function applyPattern(
  prepared: string,
  mask: boolean[],
  pattern: RegExp
): void {
  // mask=true の文字だけで「現在の可視文字列」を組み立て、元indexへのマッピングを保持
  const visible: { char: string; origIdx: number }[] = [];
  for (let i = 0; i < prepared.length; i++) {
    if (mask[i]) visible.push({ char: prepared[i], origIdx: i });
  }
  const visibleStr = visible.map((v) => v.char).join("");

  // パターンを新規生成してlastIndexをリセット
  const p = new RegExp(pattern.source, pattern.flags);
  let m;
  while ((m = p.exec(visibleStr)) !== null) {
    for (let j = m.index; j < m.index + m[0].length; j++) {
      mask[visible[j].origIdx] = false;
    }
  }
}

export function normalizeMedicineName(raw: string): NormalizeResult {
  let s = raw.trim();
  if (!s) return { normalized: "", prefix: "", suffix: "" };

  s = toHalfWidth(s);
  s = normalizeSymbols(s);

  const prepared = s;
  const mask = new Array<boolean>(prepared.length).fill(true);

  applyPattern(prepared, mask, DOSE_PATTERN);
  applyPattern(prepared, mask, DOSE_FORM_PATTERN);
  applyPattern(prepared, mask, FORM_PATTERN);
  applyPattern(prepared, mask, MAKER_PATTERN);
  applyPattern(prepared, mask, LIQUID_PATTERN);
  applyPattern(prepared, mask, BARE_NUMBER_PATTERN);
  applyPattern(prepared, mask, DIMENSION_SEP_PATTERN);
  applyPattern(prepared, mask, SYMBOL_PATTERN);

  // コア部分の最初と最後の非空白文字位置を特定
  let firstKept = -1;
  let lastKept = -1;
  for (let i = 0; i < prepared.length; i++) {
    if (mask[i] && prepared[i].trim()) {
      if (firstKept === -1) firstKept = i;
      lastKept = i;
    }
  }

  // 全て除去された場合のフォールバック
  if (firstKept === -1) {
    return {
      normalized: toHalfWidth(raw.trim()).toLowerCase(),
      prefix: "",
      suffix: "",
    };
  }

  // prefix: コアより前で除去された文字
  let prefix = "";
  for (let i = 0; i < firstKept; i++) {
    if (!mask[i]) prefix += prepared[i];
  }

  // suffix: コアより後で除去された文字
  let suffix = "";
  for (let i = lastKept + 1; i < prepared.length; i++) {
    if (!mask[i]) suffix += prepared[i];
  }

  // core: mask=true の文字 → 空白除去 → lowercase
  let core = "";
  for (let i = 0; i < prepared.length; i++) {
    if (mask[i]) core += prepared[i];
  }
  core = core.replace(/\s+/g, "").toLowerCase();

  if (!core) {
    return {
      normalized: toHalfWidth(raw.trim()).toLowerCase(),
      prefix: "",
      suffix: "",
    };
  }

  return { normalized: core, prefix, suffix };
}
