import { Calendar, type EventClickArg, type EventContentArg, type EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";

import type { KintoneApiClient } from "../data/fetch";
import { fetchRecordsInRange } from "../data/fetch";
import type { PluginConfig } from "../config/schema";
import { resolveEventColor } from "./color";
import { recordsToEvents, type FieldTypeLookup } from "./toEvents";
import type { FieldSchemaLookup } from "../template/parse";
import { expandTemplate } from "../template/parse";
import { resolveTemplateString } from "../template/resolve";
import { getHolidayName } from "../holiday";
import { bufferedMonthRange } from "../util/date";
import type { KintoneFieldValue } from "../util/typeGuards";
import { showCalendarError, showCalendarLoading, clearCalendarStatus } from "./status";

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
}

export function initCalendar(container: HTMLElement, deps: CalendarRenderDeps): Calendar {
  const calendar = new Calendar(container, {
    plugins: [dayGridPlugin, interactionPlugin, listPlugin],
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
      loadEvents(deps, fetchInfo.start).then(successCallback).catch((error) => {
        failureCallback(error as Error);
        showCalendarError(container, "予定の取得に失敗しました。", deps.onFallbackToList);
      });
    },
    loading: (isLoading) => {
      if (isLoading) {
        showCalendarLoading(container);
      } else {
        clearCalendarStatus(container);
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
    dayCellDidMount: (arg) => {
      if (!deps.config.display.showHolidays) return;
      const dateOnly = toLocalDateOnly(arg.date);
      const holidayName = getHolidayName(dateOnly);
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

async function loadEvents(deps: CalendarRenderDeps, visibleStart: Date): Promise<EventInput[]> {
  const { from, to } = bufferedMonthRange(visibleStart.getFullYear(), visibleStart.getMonth());

  const result = await fetchRecordsInRange(deps.api, {
    appId: deps.appId,
    dateFieldCode: deps.config.dateMapping.startFieldCode,
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
    return {
      id: event.id,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      backgroundColor: color.backgroundColor,
      textColor: color.textColor,
      extendedProps: event.extendedProps,
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

function toLocalDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
