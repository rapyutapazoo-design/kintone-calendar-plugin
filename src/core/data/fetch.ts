import type { KintoneFieldValue } from "../util/typeGuards";

export interface KintoneApiClient {
  (pathOrUrl: string, method: string, params: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface FetchRecordsParams {
  appId: number;
  /** クエリの期間条件に使う日時フィールドコード（開始日時フィールド） */
  dateFieldCode: string;
  /** 期間の開始（含む） */
  from: Date;
  /** 期間の終了（含まない） */
  to: Date;
  /** 設定側の追加絞込条件（kintone クエリの断片、空文字可） */
  extraCondition: string;
  /** 一覧ビューの絞込条件（アダプタから取得できた場合のみ）。null で未使用。 */
  viewCondition: string | null;
}

export interface FetchRecordsResult {
  records: Record<string, KintoneFieldValue>[];
  /** 安全弁の上限に達し取得を打ち切った場合 true */
  truncated: boolean;
  totalFetched: number;
}

const PAGE_SIZE = 500;
/** 1ヶ月あたり100件未満想定のため、500件超過は異常系として警告のみ行い、
 *  暴走を防ぐための安全弁として最大件数を設ける。 */
const SAFETY_MAX_RECORDS = 2000;

function toDateTimeParam(date: Date): string {
  return date.toISOString();
}

function buildQuery(params: FetchRecordsParams): string {
  const conditions: string[] = [
    `${params.dateFieldCode} >= "${toDateTimeParam(params.from)}"`,
    `${params.dateFieldCode} < "${toDateTimeParam(params.to)}"`,
  ];
  if (params.extraCondition && params.extraCondition.trim() !== "") {
    conditions.push(`(${params.extraCondition.trim()})`);
  }
  if (params.viewCondition && params.viewCondition.trim() !== "") {
    conditions.push(`(${params.viewCondition.trim()})`);
  }
  return `${conditions.join(" and ")} order by ${params.dateFieldCode} asc`;
}

/**
 * 表示月の前後にバッファを取った期間でレコードを取得する。
 * limit 500 の単純取得を基本とし、超過分は offset ループで追加取得する。
 * SAFETY_MAX_RECORDS に達した場合は打ち切り、truncated: true を返す
 * （呼び出し側で警告表示を行うためのフェールセーフ）。
 */
export async function fetchRecordsInRange(
  api: KintoneApiClient,
  params: FetchRecordsParams
): Promise<FetchRecordsResult> {
  const baseQuery = buildQuery(params);
  const records: Record<string, KintoneFieldValue>[] = [];
  let offset = 0;
  let truncated = false;

  for (;;) {
    const query = `${baseQuery} limit ${PAGE_SIZE} offset ${offset}`;
    const response = (await api("/k/v1/records.json", "GET", {
      app: params.appId,
      query,
    })) as { records?: Record<string, KintoneFieldValue>[] };

    const page = response.records ?? [];
    records.push(...page);

    if (page.length < PAGE_SIZE) break;

    offset += PAGE_SIZE;

    if (records.length >= SAFETY_MAX_RECORDS) {
      truncated = true;
      break;
    }
  }

  return { records, truncated, totalFetched: records.length };
}
