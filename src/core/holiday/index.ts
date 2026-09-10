import { JAPAN_HOLIDAYS, type HolidayEntry } from "./data";

let holidayMap: Map<string, string> | null = null;

function getHolidayMap(): Map<string, string> {
  if (!holidayMap) {
    holidayMap = new Map(JAPAN_HOLIDAYS.map((h) => [h.date, h.name]));
  }
  return holidayMap;
}

/** "YYYY-MM-DD" 形式の日付文字列が祝日なら祝日名を返す。 */
export function getHolidayName(dateOnly: string): string | undefined {
  return getHolidayMap().get(dateOnly);
}

export function isHoliday(dateOnly: string): boolean {
  return getHolidayMap().has(dateOnly);
}

export type { HolidayEntry };
export { JAPAN_HOLIDAYS };
