import type { ColorRuleConfig } from "../config/schema";
import { isKintoneFieldValue, type KintoneFieldValue } from "../util/typeGuards";

export interface ResolvedColor {
  backgroundColor: string;
  textColor: string;
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

  if (!colorRule.categoryFieldCode) return fallback;

  const field = record[colorRule.categoryFieldCode];
  if (!isKintoneFieldValue(field)) return fallback;

  const rawValue = field.value;
  const firstValue = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  if (firstValue === undefined || firstValue === null || firstValue === "") return fallback;

  const stringValue = String(firstValue);
  const entry = colorRule.mapping.find((m) => m.value === stringValue);
  if (!entry) return fallback;

  return { backgroundColor: entry.backgroundColor, textColor: entry.textColor };
}
