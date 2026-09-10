import { addDays, parseDateOnly } from "../util/date";

export interface GoogleEventInput {
  title: string;
  details: string;
  location: string;
  isAllDay: boolean;
  /** 終日: "YYYY-MM-DD"。時刻付き: ISO 8601 相当の文字列 or Date で解釈可能な文字列。 */
  start: string;
  /** 終日: "YYYY-MM-DD"（レコード上の終了日、+1 日補正はここで行う）。時刻付き: 終了日時。未指定時は start と同じ扱い。 */
  end: string | null;
  recordUrl?: string;
}

const GOOGLE_TEMPLATE_BASE = "https://calendar.google.com/calendar/render";
/** ブラウザの実質的な URL 長制限に対する安全マージン。 */
const MAX_URL_LENGTH = 1900;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** UTC の YYYYMMDDTHHmmssZ 形式にフォーマットする。 */
function formatUtcDateTime(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** YYYYMMDD 形式（ローカル日付、タイムゾーン変換なし）にフォーマットする。 */
function formatLocalDateOnly(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function buildDatesParam(input: GoogleEventInput): string {
  if (input.isAllDay) {
    const start = parseDateOnly(input.start);
    const endBase = input.end ? parseDateOnly(input.end) : start;
    const end = addDays(endBase, 1); // Google Calendar も終了日は排他的（翌日扱い）
    return `${formatLocalDateOnly(start)}/${formatLocalDateOnly(end)}`;
  }

  const start = new Date(input.start);
  const end = input.end ? new Date(input.end) : start;
  return `${formatUtcDateTime(start)}/${formatUtcDateTime(end)}`;
}

/**
 * Google カレンダーの単件予定作成テンプレート URL を生成する（認証不要）。
 * URL 長が超過する場合は details を安全に切り詰め、末尾にレコードへのリンクを残す。
 */
export function buildGoogleCalendarTemplateUrl(input: GoogleEventInput): string {
  const dates = buildDatesParam(input);

  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", input.title);
  params.set("dates", dates);
  if (input.location) params.set("location", input.location);

  let details = input.details;
  if (input.recordUrl && !details.includes(input.recordUrl)) {
    details = details ? `${details}\n\n${input.recordUrl}` : input.recordUrl;
  }
  params.set("details", details);

  let url = `${GOOGLE_TEMPLATE_BASE}?${params.toString()}`;

  if (url.length > MAX_URL_LENGTH && input.recordUrl) {
    // details を切り詰めつつ、レコードへのリンクだけは必ず残す。
    const linkSuffix = `\n\n${input.recordUrl}`;
    const overflow = url.length - MAX_URL_LENGTH;
    const currentDetailsEncoded = encodeURIComponent(details);
    const targetEncodedLength = Math.max(0, currentDetailsEncoded.length - overflow - encodeURIComponent(linkSuffix).length);

    // encodeURIComponent 後の長さで概算しつつ、元の details 文字列を安全に切り詰める。
    let truncated = details.replace(input.recordUrl, "").trimEnd();
    while (encodeURIComponent(truncated).length > targetEncodedLength && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    const finalDetails = `${truncated}…${linkSuffix}`;
    params.set("details", finalDetails);
    url = `${GOOGLE_TEMPLATE_BASE}?${params.toString()}`;
  }

  return url;
}
