import type { ColorRuleConfig, DateMappingConfig } from "../config/schema";
import { expandTemplate, type FieldSchemaLookup } from "../template/parse";
import { isKintoneFieldValue, type KintoneFieldValue } from "../util/typeGuards";

/** ポップオーバーに表示する期間文字列（開始 〜 終了）を組み立てる。 */
export function buildPeriodText(
  record: Record<string, KintoneFieldValue>,
  dateMapping: DateMappingConfig
): string {
  const startField = record[dateMapping.startFieldCode];
  const startValue = isKintoneFieldValue(startField) ? String(startField.value ?? "") : "";

  let endValue = "";
  if (dateMapping.endFieldCode) {
    const endField = record[dateMapping.endFieldCode];
    endValue = isKintoneFieldValue(endField) ? String(endField.value ?? "") : "";
  }

  if (!startValue) return "";
  return endValue && endValue !== startValue ? `${startValue} 〜 ${endValue}` : startValue;
}

/** カテゴリフィールドの表示名を組み立てる（先頭値採用）。 */
export function buildCategoryText(
  record: Record<string, KintoneFieldValue>,
  colorRule: ColorRuleConfig
): string | null {
  if (!colorRule.categoryFieldCode) return null;
  const field = record[colorRule.categoryFieldCode];
  if (!isKintoneFieldValue(field)) return null;
  const value = Array.isArray(field.value) ? field.value[0] : field.value;
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

export interface DetailField {
  label: string;
  value: string;
}

/** 設定された詳細表示フィールド群をラベル付きで展開する。 */
export function buildDetailFields(
  record: Record<string, KintoneFieldValue>,
  fieldCodes: string[],
  fieldSchema: FieldSchemaLookup
): DetailField[] {
  return fieldCodes
    .map((code) => {
      const schema = fieldSchema(code);
      if (!schema) return null;
      const { text } = expandTemplate(`{${code}}`, record, fieldSchema);
      return { label: schema.label || code, value: text };
    })
    .filter((v): v is DetailField => v !== null);
}
