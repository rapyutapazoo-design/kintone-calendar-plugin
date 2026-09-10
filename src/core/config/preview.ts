import type { FieldMetaMap } from "../data/fields";
import type { KintoneFieldValue } from "../util/typeGuards";

/**
 * 設定画面のリアルタイムプレビュー用に、フィールド定義からサンプルレコードを合成する。
 * 実際のレコードは参照しない（設定画面は preview フォーム定義のみを使う）。
 */
export function buildSampleRecord(fieldMeta: FieldMetaMap): Record<string, KintoneFieldValue> {
  const record: Record<string, KintoneFieldValue> = {};

  for (const [code, meta] of Object.entries(fieldMeta)) {
    record[code] = { type: meta.type, value: sampleValueFor(meta) };
  }

  return record;
}

function sampleValueFor(meta: FieldMetaMap[string]): unknown {
  switch (meta.type) {
    case "DATE":
      return "2026-04-10";
    case "DATETIME":
      return "2026-04-10T10:00:00Z";
    case "NUMBER":
    case "CALC":
      return 1234;
    case "CHECK_BOX":
    case "MULTI_SELECT": {
      const options = meta.options ? Object.keys(meta.options) : [];
      return options.slice(0, 2).length > 0 ? options.slice(0, 2) : ["サンプル1", "サンプル2"];
    }
    case "DROP_DOWN":
    case "RADIO_BUTTON": {
      const options = meta.options ? Object.keys(meta.options) : [];
      return options[0] ?? "サンプル";
    }
    case "USER_SELECT":
      return [{ code: "sample_user", name: "山田 太郎" }];
    case "LINK":
      return "https://example.com";
    default:
      return `${meta.label || "サンプル"}の値`;
  }
}
