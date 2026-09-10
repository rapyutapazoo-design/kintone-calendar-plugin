import type { FieldSchemaLookup } from "../template/parse";
import type { FieldTypeLookup } from "../render/toEvents";
import type { KintoneApiClient } from "./fetch";

export type { KintoneApiClient };

export interface FieldMeta {
  type: string;
  label: string;
  options?: Record<string, { label: string; index: string }>;
}

export type FieldMetaMap = Record<string, FieldMeta>;

/**
 * フィールド定義を取得する。
 * - runtime (プラグイン動作時): 本番フォーム /k/v1/app/form/fields.json
 * - 設定画面: プレビュー環境 /k/v1/preview/app/form/fields.json
 * フィールドコードのハードコードはここでは行わず、常に API から取得した結果のみを扱う。
 */
export async function fetchFieldMeta(
  api: KintoneApiClient,
  appId: number,
  usePreview: boolean
): Promise<FieldMetaMap> {
  const path = usePreview ? "/k/v1/preview/app/form/fields.json" : "/k/v1/app/form/fields.json";
  const response = (await api(path, "GET", { app: appId })) as {
    properties?: Record<string, { type: string; label: string; options?: FieldMeta["options"] }>;
  };

  const properties = response.properties ?? {};
  const result: FieldMetaMap = {};
  for (const [code, def] of Object.entries(properties)) {
    result[code] = { type: def.type, label: def.label, options: def.options };
  }
  return result;
}

export function createFieldSchemaLookup(meta: FieldMetaMap): FieldSchemaLookup {
  return (fieldCode: string) => {
    const entry = meta[fieldCode];
    return entry ? { type: entry.type, label: entry.label } : undefined;
  };
}

export function createFieldTypeLookup(meta: FieldMetaMap): FieldTypeLookup {
  return (fieldCode: string) => meta[fieldCode]?.type;
}

/** カレンダー/日時系フィールドの絞り込み（日付マッピング用の選択肢生成に使用） */
export const DATE_FIELD_TYPES = ["DATE", "DATETIME"];

/** カテゴリフィールドとして扱える選択肢型フィールド */
export const CATEGORY_FIELD_TYPES = ["DROP_DOWN", "RADIO_BUTTON", "CHECK_BOX", "MULTI_SELECT"];
