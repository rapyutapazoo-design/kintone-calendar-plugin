import { createMobileAdapter, buildRecordDetailUrlMobile } from "../adapters/mobile";
import { loadPluginConfig } from "../core/config/load";
import { createFieldSchemaLookup, createFieldTypeLookup, fetchFieldMeta } from "../core/data/fields";
import { buildGoogleUrlFromRecord } from "../core/google/fromRecord";
import { createGoogleCalendarLink } from "../core/google/button";
import { initCalendar } from "../core/render/calendar";
import { buildDayListPanel } from "../core/render/dayList";
import { buildLegend } from "../core/render/legend";
import { showConfigMissingNotice } from "../core/render/status";
import { resolveTemplateString } from "../core/template/resolve";
import { setupViewToggle } from "../core/render/viewToggle";
import { getApiClient } from "../core/util/kintoneApi";
import { getPluginId } from "../core/util/pluginId";
import type { KintoneFieldValue } from "../core/util/typeGuards";

const PLUGIN_ID = getPluginId();

(() => {
  kintone.events.on(["mobile.app.record.index.show"], async (event: KintoneEvent) => {
    const appId = kintone.mobile.app.getId();
    if (appId === null) return event;

    const rootContainer = kintone.mobile.app.getHeaderSpaceElement();
    if (!rootContainer) return event;

    const configResult = loadPluginConfig(kintone.plugin.app.getConfig(PLUGIN_ID));
    if (!configResult.ok) {
      showConfigMissingNotice(rootContainer);
      return event;
    }
    const config = configResult.config;

    if (!config.dateMapping.startFieldCode) {
      showConfigMissingNotice(rootContainer);
      return event;
    }

    let fieldMeta;
    try {
      fieldMeta = await fetchFieldMeta(getApiClient(), appId, false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[kintone-calendar-plugin] フィールド定義の取得に失敗しました。", error);
      return event;
    }

    const fieldSchema = createFieldSchemaLookup(fieldMeta);
    const fieldType = createFieldTypeLookup(fieldMeta);

    const adapter = createMobileAdapter();

    const root = document.createElement("div");
    root.className = "kcp-root kcp-root-mobile";

    const calendarContainer = document.createElement("div");
    calendarContainer.className = "kcp-calendar-container";

    const toggle = setupViewToggle({
      appId,
      viewId: event.viewId ?? "default",
      calendarContainer,
      getStandardListElement: adapter.getStandardListElement,
      defaultState: config.display.defaultToggleState,
    });

    root.appendChild(toggle.element);

    if (config.display.showLegend) {
      root.appendChild(buildLegend(config.colorRule, true));
    }

    root.appendChild(calendarContainer);

    const dayListContainer = document.createElement("div");
    dayListContainer.className = "kcp-day-list-container";
    root.appendChild(dayListContainer);

    rootContainer.appendChild(root);

    const calendar = initCalendar(calendarContainer, {
      appId,
      config,
      fieldSchema,
      fieldType,
      layoutPreset: "mobile",
      api: getApiClient(),
      getViewCondition: () => (config.dataSource.inheritViewCondition ? adapter.getQueryCondition() : null),
      onEventClick: (recordId, record, anchorEl) => {
        adapter.onEventClick({ recordId, appId, anchorElement: anchorEl, record });
      },
      onFallbackToList: () => toggle.setState("list"),
    });

    // dateClick は interaction プラグインが提供するコールバックオプション。
    calendar.setOption("dateClick", (arg: { date: Date }) => {
      const dayStart = new Date(arg.date);
      const dayEnd = new Date(arg.date);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const events = calendar
        .getEvents()
        .filter((ev) => ev.start && ev.start >= dayStart && ev.start < dayEnd);

      const templateString = resolveTemplateString(config.bandTemplate, "mobile");
      const dateLabel = `${arg.date.getFullYear()}/${arg.date.getMonth() + 1}/${arg.date.getDate()}`;

      while (dayListContainer.firstChild) dayListContainer.removeChild(dayListContainer.firstChild);
      dayListContainer.appendChild(
        buildDayListPanel(dateLabel, events, {
          fieldSchema,
          templateString,
          onSelect: (recordId, record, el) => adapter.onEventClick({ recordId, appId, anchorElement: el, record }),
        })
      );
    });

    return event;
  });

  // Phase 3: レコード詳細画面 (モバイル) の Google カレンダー追加ボタン。
  kintone.events.on(["mobile.app.record.detail.show"], async (event: KintoneEvent) => {
    const appId = kintone.mobile.app.getId();
    if (appId === null || !event.record) return event;

    const configResult = loadPluginConfig(kintone.plugin.app.getConfig(PLUGIN_ID));
    if (!configResult.ok || !configResult.config.googleIntegration.enabled) return event;
    const config = configResult.config;
    if (!config.dateMapping.startFieldCode) return event;

    const headerSpace = kintone.mobile.app.record.getHeaderSpaceElement?.();
    if (!headerSpace) return event;

    let fieldMeta;
    try {
      fieldMeta = await fetchFieldMeta(getApiClient(), appId, false);
    } catch {
      return event;
    }

    const fieldSchema = createFieldSchemaLookup(fieldMeta);
    const fieldType = createFieldTypeLookup(fieldMeta);
    const record = event.record as Record<string, KintoneFieldValue>;
    const recordId = kintone.mobile.app.record.getId();
    if (recordId === null) return event;

    const recordUrl = new URL(buildRecordDetailUrlMobile(appId, recordId), window.location.origin).toString();
    const googleUrl = buildGoogleUrlFromRecord(
      record,
      config.dateMapping,
      config.googleIntegration,
      fieldSchema,
      fieldType,
      recordUrl
    );

    if (googleUrl) {
      headerSpace.appendChild(createGoogleCalendarLink(googleUrl));
    }

    return event;
  });
})();
