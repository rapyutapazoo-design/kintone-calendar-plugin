import { createDesktopAdapter, buildRecordDetailUrl } from "../adapters/desktop";
import { loadPluginConfig } from "../core/config/load";
import { createFieldSchemaLookup, createFieldTypeLookup, fetchFieldMeta } from "../core/data/fields";
import { buildGoogleUrlFromRecord } from "../core/google/fromRecord";
import { createGoogleCalendarLink } from "../core/google/button";
import { initCalendar } from "../core/render/calendar";
import { buildLegend } from "../core/render/legend";
import { showConfigMissingNotice, showPluginConfigLoadError } from "../core/render/status";
import { setupViewToggle } from "../core/render/viewToggle";
import { readPluginConfig } from "../core/util/pluginId";
import { getApiClient } from "../core/util/kintoneApi";
import type { KintoneFieldValue } from "../core/util/typeGuards";

(() => {
  kintone.events.on(["app.record.index.show"], async (event: KintoneEvent) => {
    const appId = kintone.app.getId();
    if (appId === null) return event;

    const rootContainer = kintone.app.getHeaderSpaceElement();
    if (!rootContainer) return event;

    const rawConfig = readPluginConfig();
    if (!rawConfig) {
      showPluginConfigLoadError(rootContainer);
      return event;
    }

    const configResult = loadPluginConfig(rawConfig);
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

    const adapter = createDesktopAdapter({ config, fieldSchema, fieldType });

    const root = document.createElement("div");
    root.className = "kcp-root";

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
      root.appendChild(buildLegend(config.colorRule, false));
    }

    root.appendChild(calendarContainer);
    rootContainer.appendChild(root);

    initCalendar(calendarContainer, {
      appId,
      config,
      fieldSchema,
      fieldType,
      layoutPreset: "desktop",
      api: getApiClient(),
      getViewCondition: () => (config.dataSource.inheritViewCondition ? adapter.getQueryCondition() : null),
      onEventClick: (recordId, record, anchorEl) => {
        adapter.onEventClick({ recordId, appId, anchorElement: anchorEl, record });
      },
      onFallbackToList: () => toggle.setState("list"),
    });

    return event;
  });

  // Phase 3: レコード詳細画面 (PC) の Google カレンダー追加ボタン。
  kintone.events.on(["app.record.detail.show"], async (event: KintoneEvent) => {
    const appId = kintone.app.getId();
    if (appId === null || !event.record) return event;

    const rawConfig = readPluginConfig();
    if (!rawConfig) return event;

    const configResult = loadPluginConfig(rawConfig);
    if (!configResult.ok || !configResult.config.googleIntegration.enabled) return event;
    const config = configResult.config;
    if (!config.dateMapping.startFieldCode) return event;

    const menuSpace = kintone.app.record.getHeaderMenuSpaceElement?.();
    if (!menuSpace) return event;

    let fieldMeta;
    try {
      fieldMeta = await fetchFieldMeta(getApiClient(), appId, false);
    } catch {
      return event;
    }

    const fieldSchema = createFieldSchemaLookup(fieldMeta);
    const fieldType = createFieldTypeLookup(fieldMeta);
    const record = event.record as Record<string, KintoneFieldValue>;
    const recordId = kintone.app.record.getId();
    if (recordId === null) return event;

    const recordUrl = new URL(buildRecordDetailUrl(appId, recordId), window.location.origin).toString();
    const googleUrl = buildGoogleUrlFromRecord(
      record,
      config.dateMapping,
      config.googleIntegration,
      fieldSchema,
      fieldType,
      recordUrl
    );

    if (googleUrl) {
      menuSpace.appendChild(createGoogleCalendarLink(googleUrl));
    }

    return event;
  });
})();
