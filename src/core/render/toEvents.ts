import type { DateMappingConfig } from "../config/schema";
import { computeEventPeriod } from "../util/date";
import { isKintoneFieldValue, isNonEmptyString, type KintoneFieldValue } from "../util/typeGuards";

export interface FieldTypeLookup {
  (fieldCode: string): string | undefined;
}

export interface CalendarEventInput {
  id: string;
  start: Date;
  end: Date;
  allDay: boolean;
  extendedProps: {
    recordId: string;
    record: Record<string, KintoneFieldValue>;
  };
}

export interface ToEventsResult {
  events: CalendarEventInput[];
  excludedCount: number;
}

const ALL_DAY_FIELD_TYPES = new Set(["DATE"]);

/**
 * kintone レコード配列を FullCalendar 用のイベント配列に変換する。
 * - 開始日時が空／不正なレコードは黙って除外し、件数のみ返す（呼び出し側で console に記録する）。
 * - 日付型(DATE)は終日、日時型(DATETIME)は時刻付きとして自動判定する。
 */
export function recordsToEvents(
  records: Record<string, KintoneFieldValue>[],
  dateMapping: DateMappingConfig,
  fieldType: FieldTypeLookup
): ToEventsResult {
  const events: CalendarEventInput[] = [];
  let excludedCount = 0;

  const startType = fieldType(dateMapping.startFieldCode);
  const isAllDay = startType ? ALL_DAY_FIELD_TYPES.has(startType) : true;

  for (const record of records) {
    const idField = record["$id"];
    const recordId = isKintoneFieldValue(idField) && isNonEmptyString(String(idField.value ?? ""))
      ? String(idField.value)
      : "";

    const startField = record[dateMapping.startFieldCode];
    const startValue = isKintoneFieldValue(startField) ? startField.value : undefined;

    if (!isNonEmptyString(startValue) || Number.isNaN(new Date(startValue).getTime())) {
      excludedCount += 1;
      continue;
    }

    let endValue: string | null = null;
    if (dateMapping.endFieldCode) {
      const endField = record[dateMapping.endFieldCode];
      const rawEnd = isKintoneFieldValue(endField) ? endField.value : undefined;
      if (isNonEmptyString(rawEnd) && !Number.isNaN(new Date(rawEnd).getTime())) {
        endValue = rawEnd;
      }
    }

    const period = computeEventPeriod({ isAllDay, start: startValue, end: endValue });

    events.push({
      id: recordId || `${startValue}-${events.length}`,
      start: period.start,
      end: period.end,
      allDay: period.allDay,
      extendedProps: {
        recordId,
        record,
      },
    });
  }

  return { events, excludedCount };
}
