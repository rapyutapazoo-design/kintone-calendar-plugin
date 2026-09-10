/**
 * 日付処理ユーティリティ（純粋関数のみ）。
 * FullCalendar の end は排他的（exclusive）である点、終日イベントは
 * 日付のみで時刻情報を持たない点に起因する off-by-one を避けるため、
 * 日付計算はすべてここに集約しテストでカバーする。
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** ローカル日付文字列 "YYYY-MM-DD" を Date（ローカル 0:00）に変換する。 */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** Date をローカル日付文字列 "YYYY-MM-DD" に変換する。 */
export function toDateOnlyString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 日付に日数を加算した新しい Date を返す（月末・年跨ぎも Date のロールオーバーに委ねる）。 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

export interface EventPeriodInput {
  /** kintone のフィールド type が DATE なら true（終日）、DATETIME なら false */
  isAllDay: boolean;
  /** 開始日時（DATE の場合は "YYYY-MM-DD"、DATETIME の場合は ISO 8601 相当） */
  start: string;
  /** 終了日時。存在しない場合は null（単日予定として扱う） */
  end: string | null;
}

export interface EventPeriod {
  start: Date;
  /** FullCalendar に渡す排他的End。終日イベントは常に +1 日補正済み。 */
  end: Date;
  allDay: boolean;
}

/**
 * kintone のレコード値から FullCalendar 用の期間（start/end）を算出する。
 * - 終日イベント: end はレコード上の終了日に対して +1 日した排他的End。
 *   終了日未設定（単日）の場合は開始日 +1 日を end とする。
 * - 時刻付きイベント: end はレコードの終了日時をそのまま使用（FullCalendar の
 *   時刻付きイベントの end は「その時刻ちょうどまで」で直感通りのため補正不要）。
 *   終了日時未設定の場合は end を持たせない（FullCalendar が開始時刻のみの
 *   点イベントとして扱う）。
 */
export function computeEventPeriod(input: EventPeriodInput): EventPeriod {
  if (input.isAllDay) {
    const start = parseDateOnly(input.start);
    const endBase = input.end ? parseDateOnly(input.end) : start;
    const end = addDays(endBase, 1);
    return { start, end, allDay: true };
  }

  const start = new Date(input.start);
  const end = input.end ? new Date(input.end) : new Date(start.getTime());
  return { start, end, allDay: false };
}

export function isSameOrAfter(a: Date, b: Date): boolean {
  return a.getTime() >= b.getTime();
}

export function startOfMonth(year: number, monthIndex0: number): Date {
  return new Date(year, monthIndex0, 1);
}

export function endOfMonthExclusive(year: number, monthIndex0: number): Date {
  return new Date(year, monthIndex0 + 1, 1);
}

/** 表示月の前後にバッファ(日数)を取った期間を返す。カレンダーグリッドが前後月にはみ出す分を吸収する。 */
export function bufferedMonthRange(year: number, monthIndex0: number, bufferDays = 7): { from: Date; to: Date } {
  const from = addDays(startOfMonth(year, monthIndex0), -bufferDays);
  const to = addDays(endOfMonthExclusive(year, monthIndex0), bufferDays);
  return { from, to };
}

export function toDateTimeIso(date: Date): string {
  return date.toISOString();
}

export const ONE_DAY_MS = MS_PER_DAY;
