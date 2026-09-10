import { Calendar, type EventClickArg, type EventContentArg, type EventInput } from "@fullcalendar/core";
import jaLocale from "@fullcalendar/core/locales/ja";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";

import type { KintoneApiClient } from "../data/fetch";
import { fetchRecordsInRange } from "../data/fetch";
import type { PluginConfig } from "../config/schema";
import { resolveCategoryValue, resolveEventColor } from "./color";
import { collectCategories, filterEventsByCategory, type CategoryFilterState } from "./categoryFilter";
import { recordsToEvents, type FieldTypeLookup } from "./toEvents";
import type { FieldSchemaLookup } from "../template/parse";
import { expandTemplate } from "../template/parse";
import { resolveTemplateString } from "../template/resolve";
import { getHolidayName, isHoliday } from "../holiday";
import { rangeWithLookback } from "../util/date";
import type { KintoneFieldValue } from "../util/typeGuards";
import { showCalendarError, showCalendarLoading, clearCalendarStatus, clearLoadingStatus } from "./status";

export interface CalendarRenderDeps {
  appId: number;
  config: PluginConfig;
  fieldSchema: FieldSchemaLookup;
  fieldType: FieldTypeLookup;
  layoutPreset: "desktop" | "mobile";
  api: KintoneApiClient;
  getViewCondition: () => string | null;
  onEventClick: (recordId: string, record: Record<string, KintoneFieldValue>, anchorEl: HTMLElement) => void;
  onFallbackToList?: () => void;
  /** 表示するカテゴリの絞り込み状態。省略時は全件表示。 */
  getVisibleCategories?: () => CategoryFilterState;
  /** 読み込まれたイベントに含まれるカテゴリを通知する（絞り込み UI の同期に使う）。 */
  onEventsLoaded?: (presentCategories: Set<string>) => void;
}

export function initCalendar(container: HTMLElement, deps: CalendarRenderDeps): Calendar {
  // 絞り込みの切り替えでサーバーへ再問い合わせしないよう、表示中の期間のイベントを保持する。
  let cacheKey = "";
  let cachedEvents: EventInput[] = [];

  const calendar = new Calendar(container, {
    plugins: [dayGridPlugin, interactionPlugin, listPlugin],
    locale: jaLocale,
    buttonText: { today: "今日" },
    // 既定の "auto" では時刻付きイベントが点＋時刻のリスト表示になる。
    // 常に帯（ブロック）で表示するため明示的に指定する。
    eventDisplay: "block",
    initialView: deps.config.display.initialView,
    firstDay: deps.config.display.firstDay,
    dayMaxEvents: deps.config.display.maxEventsPerDay,
    moreLinkText: (num: number) => `他 ${num}件`,
    height: "auto",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "",
    },
    events: (fetchInfo, successCallback, failureCallback) => {
      const key = `${fetchInfo.startStr}_${fetchInfo.endStr}`;

      // 絞り込み変更時の refetchEvents はキャッシュで応答し、通信を発生させない。
      if (key === cacheKey) {
        successCallback(filterByCategory(cachedEvents, deps));
        return;
      }

      loadEvents(deps, fetchInfo.start, fetchInfo.end)
        .then((events) => {
          cacheKey = key;
          cachedEvents = events;
          successCallback(filterByCategory(events, deps));
          // 絞り込み UI の同期は、このコールバックの外側で行う（再入を避けるため）。
          queueMicrotask(() => deps.onEventsLoaded?.(collectCategories(events)));
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error("[kintone-calendar-plugin] 予定の取得に失敗しました。", error);
          failureCallback(error as Error);
          showCalendarError(container, "予定の取得に失敗しました。", deps.onFallbackToList);
        });
    },
    loading: (isLoading) => {
      if (isLoading) {
        showCalendarLoading(container);
      } else {
        // エラー表示は残す（clearCalendarStatus を使うとエラーまで消える）。
        clearLoadingStatus(container);
      }
    },
    eventContent: (arg: EventContentArg) => buildEventContentNode(arg, deps),
    eventClick: (arg: EventClickArg) => {
      const recordId = String(arg.event.extendedProps["recordId"] ?? "");
      const record = arg.event.extendedProps["record"] as Record<string, KintoneFieldValue>;
      if (recordId) {
        deps.onEventClick(recordId, record, arg.el);
      }
    },
    dayHeaderDidMount: (arg) => {
      applyWeekdayClass(arg.el, arg.date, false);
    },
    dayCellDidMount: (arg) => {
      applyWeekdayClass(arg.el, arg.date, deps.config.display.showHolidays);

      if (!deps.config.display.showHolidays) return;
      const holidayName = getHolidayName(toLocalDateOnly(arg.date));
      if (!holidayName) return;
      arg.el.classList.add("kcp-holiday-cell");
      const frame = arg.el.querySelector(".fc-daygrid-day-top") ?? arg.el;
      const label = document.createElement("div");
      label.className = "kcp-holiday-label";
      label.textContent = holidayName;
      frame.appendChild(label);
    },
  });

  calendar.render();
  return calendar;
}

async function loadEvents(
  deps: CalendarRenderDeps,
  visibleStart: Date,
  visibleEnd: Date
): Promise<EventInput[]> {
  // FullCalendar が要求してきた表示範囲をそのまま使う。月を推定し直さないこと。
  const { from, to } = rangeWithLookback(visibleStart, visibleEnd);

  const result = await fetchRecordsInRange(deps.api, {
    appId: deps.appId,
    dateFieldCode: deps.config.dateMapping.startFieldCode,
    dateFieldType: deps.fieldType(deps.config.dateMapping.startFieldCode),
    from,
    to,
    extraCondition: deps.config.dataSource.extraQueryCondition,
    viewCondition: deps.config.dataSource.inheritViewCondition ? deps.getViewCondition() : null,
  });

  if (result.truncated) {
    // eslint-disable-next-line no-console
    console.warn(
      `[kintone-calendar-plugin] 取得件数が上限(${result.totalFetched}件)に達したため以降のレコードは表示されません。`
    );
  }

  const { events, excludedCount } = recordsToEvents(result.records, deps.config.dateMapping, deps.fieldType);

  if (excludedCount > 0) {
    // eslint-disable-next-line no-console
    console.info(`[kintone-calendar-plugin] 開始日時が空/不正なレコード ${excludedCount} 件を除外しました。`);
  }

  return events.map((event) => {
    const color = resolveEventColor(event.extendedProps.record, deps.config.colorRule);
    const category = resolveCategoryValue(event.extendedProps.record, deps.config.colorRule);
    return {
      id: event.id,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      backgroundColor: color.backgroundColor,
      textColor: color.textColor,
      extendedProps: { ...event.extendedProps, category },
    } satisfies EventInput;
  });
}

function buildEventContentNode(arg: EventContentArg, deps: CalendarRenderDeps): { domNodes: Node[] } {
  const record = arg.event.extendedProps["record"] as Record<string, KintoneFieldValue>;
  const templateString = resolveTemplateString(deps.config.bandTemplate, deps.layoutPreset);
  const { text } = expandTemplate(templateString, record, deps.fieldSchema);

  const wrapper = document.createElement("div");
  wrapper.className = "kcp-event";
  // XSS対策: innerHTML は使用せず textContent のみでレコード値を反映する。
  wrapper.textContent = text || arg.event.id;
  wrapper.title = text;

  return { domNodes: [wrapper] };
}

/**
 * 曜日・祝日に応じた文字色クラスを付与する。
 * 日曜と祝日は赤、土曜は青、平日は既定色とする。
 */
function applyWeekdayClass(el: HTMLElement, date: Date, considerHolidays: boolean): void {
  const dow = date.getDay();
  if (dow === 0 || (considerHolidays && isHoliday(toLocalDateOnly(date)))) {
    el.classList.add("kcp-day-sun");
  } else if (dow === 6) {
    el.classList.add("kcp-day-sat");
  }
}

/** 絞り込み状態に従って表示するイベントを選別する。 */
function filterByCategory(events: EventInput[], deps: CalendarRenderDeps): EventInput[] {
  return filterEventsByCategory(events, deps.getVisibleCategories?.() ?? { mode: "all" });
}

function toLocalDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
