import type { ColorRuleConfig } from "../config/schema";
import { isKintoneFieldValue, type KintoneFieldValue } from "../util/typeGuards";

export interface ResolvedColor {
  backgroundColor: string;
  textColor: string;
}

/** マッピングに無い値・未設定値をまとめて表すセンチネル。 */
export const UNCATEGORIZED = "";

/**
 * レコードからカテゴリ値を取り出す。
 * 複数値（チェックボックス・複数選択）は先頭値を採用する。
 * カテゴリフィールド未設定・値が空の場合は UNCATEGORIZED を返す。
 */
export function resolveCategoryValue(
  record: Record<string, KintoneFieldValue>,
  colorRule: ColorRuleConfig
): string {
  if (!colorRule.categoryFieldCode) return UNCATEGORIZED;

  const field = record[colorRule.categoryFieldCode];
  if (!isKintoneFieldValue(field)) return UNCATEGORIZED;

  const rawValue = field.value;
  const firstValue = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  if (firstValue === undefined || firstValue === null || firstValue === "") return UNCATEGORIZED;

  return String(firstValue);
}

/**
 * カテゴリフィールド値から背景色・文字色を解決する。
 * 複数値（チェックボックス・複数選択）は先頭値を採用する。
 * 未設定値・マッピングにない値はフォールバック色を返す。
 */
export function resolveEventColor(
  record: Record<string, KintoneFieldValue>,
  colorRule: ColorRuleConfig
): ResolvedColor {
  const fallback: ResolvedColor = {
    backgroundColor: colorRule.fallbackBackgroundColor,
    textColor: colorRule.fallbackTextColor,
  };

  const stringValue = resolveCategoryValue(record, colorRule);
  if (stringValue === UNCATEGORIZED) return fallback;

  const entry = colorRule.mapping.find((m) => m.value === stringValue);
  if (!entry) return fallback;

  return { backgroundColor: entry.backgroundColor, textColor: entry.textColor };
}
