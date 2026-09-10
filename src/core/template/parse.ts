import { isKintoneFieldValue, isPlainObject, type KintoneFieldValue } from "../util/typeGuards";

export interface FieldSchemaLookup {
  (fieldCode: string): { type: string; label: string } | undefined;
}

export interface TemplateExpandResult {
  text: string;
  /** テンプレート中に存在するがアプリに存在しないフィールドコード */
  unknownFieldCodes: string[];
}

const TOKEN_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;

/**
 * "{フィールドコード}" 記法のテンプレート文字列を展開する。
 * 戻り値は常にプレーンテキスト（HTML ではない）。呼び出し側は textContent 等の
 * 安全な経路で DOM に反映すること。
 */
export function expandTemplate(
  template: string,
  record: Record<string, KintoneFieldValue>,
  fieldSchema: FieldSchemaLookup
): TemplateExpandResult {
  const unknownFieldCodes: string[] = [];

  const text = template.replace(TOKEN_PATTERN, (_match, fieldCode: string) => {
    const schema = fieldSchema(fieldCode);
    const field = record[fieldCode];

    if (!schema || !isKintoneFieldValue(field)) {
      if (!unknownFieldCodes.includes(fieldCode)) {
        unknownFieldCodes.push(fieldCode);
      }
      return "";
    }

    return formatFieldValue(schema.type, field.value);
  });

  return { text, unknownFieldCodes };
}

function formatFieldValue(type: string, value: unknown): string {
  if (value === null || value === undefined) return "";

  switch (type) {
    case "USER_SELECT":
    case "ORGANIZATION_SELECT":
    case "GROUP_SELECT":
      return formatEntitySelect(value);
    case "CHECK_BOX":
    case "MULTI_SELECT":
      return Array.isArray(value) ? value.map(String).join("、") : String(value);
    case "NUMBER":
    case "CALC": {
      const num = Number(value);
      return Number.isFinite(num) ? num.toLocaleString("ja-JP") : String(value);
    }
    case "LINK":
      return String(value);
    default:
      if (Array.isArray(value)) return value.map(String).join("、");
      return String(value);
  }
}

function formatEntitySelect(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (isPlainObject(entry) && typeof entry.name === "string" ? entry.name : String(entry)))
      .join("、");
  }
  if (isPlainObject(value) && typeof value.name === "string") return value.name;
  return String(value);
}

/** 選択リストモードで指定された複数フィールドコードから、既定のテンプレート文字列を組み立てる。 */
export function buildTemplateFromFieldList(fieldCodes: string[]): string {
  return fieldCodes.map((code) => `{${code}}`).join(" / ");
}
