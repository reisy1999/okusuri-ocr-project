/**
 * 薬品名の正規化: 容量・剤形・メーカー名を除去し、マッチング用の文字列を生成する
 *
 * 方針: 誤除去を避けるため「裸の数字を全消し」はしない。
 * 消すのは「数字+単位」「数字+剤形」「括弧内」のみ。
 */

// 全角→半角変換 (英数字・記号)
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
  "口腔内崩壊錠",
  "ドライシロップ",
  "吸入粉末剤",
  "点滴静注用",
  "吸入麻酔液",
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
];

// 長い順にソート済みで結合
const formAlt = FORM_WORDS.sort((a, b) => b.length - a.length).join("|");

// --- 除去パターン（順序が重要）---

// 1. 数字+単位 (例: 10mg, 0.5%, 2mg/mL)
const DOSE_PATTERN =
  /\d+\.?\d*\s*(?:mg|g|ml|l|%|μg|mcg|iu|単位|万単位)(?:\/\w+)?/gi;

// 2. 数字+剤形 (例: "坐剤４", "錠5mg" → 剤形の前後の数字)
//    「数字＋剤形」または「剤形＋数字」を一括除去
const DOSE_FORM_PATTERN = new RegExp(
  `\\d+\\.?\\d*\\s*(?:${formAlt})|(?:${formAlt})\\s*\\d+\\.?\\d*`,
  "g"
);

// 3. 剤形単独 (上で数字付きが消えた後の残り)
const FORM_PATTERN = new RegExp(formAlt, "g");

// 4. メーカー名（括弧内）: 「サワイ」「日医工」(AFP)
const MAKER_PATTERN = /[(（「][^)）」]*[)）」]/g;

export function normalizeMedicineName(raw: string): string {
  let s = raw.trim();
  if (!s) return "";

  s = toHalfWidth(s);
  s = normalizeSymbols(s);

  s = s.replace(DOSE_PATTERN, "");      // 数字+単位を除去
  s = s.replace(DOSE_FORM_PATTERN, ""); // 数字+剤形を除去
  s = s.replace(FORM_PATTERN, "");      // 残った剤形を除去
  s = s.replace(MAKER_PATTERN, "");     // 括弧内を除去
  s = s.replace(/\s+/g, "");            // 空白除去
  s = s.toLowerCase();

  // 正規化で空になった場合は元の値をフォールバック
  if (!s) {
    s = toHalfWidth(raw.trim()).toLowerCase();
  }

  return s;
}
