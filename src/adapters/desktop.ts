import type { PluginConfig } from "../core/config/schema";
import { buildGoogleUrlFromRecord, type FieldTypeLookup } from "../core/google/fromRecord";
import { expandTemplate, type FieldSchemaLookup } from "../core/template/parse";
import { resolveTemplateString } from "../core/template/resolve";
import { buildCategoryText, buildDetailFields, buildPeriodText } from "../core/render/popoverContent";
import { showPopover } from "../core/render/popover";
import type { EnvironmentAdapter, EventClickContext } from "./types";

export interface DesktopAdapterDeps {
  config: PluginConfig;
  fieldSchema: FieldSchemaLookup;
  fieldType: FieldTypeLookup;
}

/**
 * 標準一覧テーブルの DOM 参照はこの1関数に集約する。
 * kintone の DOM 構造が変わった場合はここだけを直せばよい。
 * 参照が見つからない場合は null を返し、呼び出し側（viewToggle）が
 * カレンダー併置表示にフォールバックする。
 */
export function getStandardListElementDesktop(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(".recordlist-gaia") ??
    document.querySelector<HTMLElement>('[class*="recordlist-list"]')
  );
}

export function buildRecordDetailUrl(appId: number, recordId: string | number): string {
  return `/k/${appId}/show#record=${recordId}`;
}

export function createDesktopAdapter(deps: DesktopAdapterDeps): EnvironmentAdapter {
  return {
    kind: "desktop",

    getContainer(): HTMLElement | null {
      try {
        return kintone.app.getHeaderSpaceElement();
      } catch {
        return null;
      }
    },

    getRecordUrl(appId: number, recordId: string | number): string {
      return buildRecordDetailUrl(appId, recordId);
    },

    getQueryCondition(): string | null {
      try {
        return kintone.app.getQueryCondition();
      } catch {
        return null;
      }
    },

    layoutPreset(): "desktop" {
      return "desktop";
    },

    getStandardListElement: getStandardListElementDesktop,

    onEventClick(context: EventClickContext): void {
      const templateString = resolveTemplateString(deps.config.bandTemplate, "desktop");
      const bandText = expandTemplate(templateString, context.record, deps.fieldSchema).text;
      const periodText = buildPeriodText(context.record, deps.config.dateMapping);
      const categoryText = buildCategoryText(context.record, deps.config.colorRule);
      const detailFields = buildDetailFields(context.record, deps.config.bandTemplate.listFieldCodes, deps.fieldSchema);
      const recordUrl = buildRecordDetailUrl(context.appId, context.recordId);

      const googleUrl = deps.config.googleIntegration.enabled
        ? buildGoogleUrlFromRecord(
            context.record,
            deps.config.dateMapping,
            deps.config.googleIntegration,
            deps.fieldSchema,
            deps.fieldType,
            typeof window !== "undefined" ? new URL(recordUrl, window.location.origin).toString() : recordUrl
          )
        : null;

      showPopover(context.anchorElement, {
        bandText,
        detailFields,
        periodText,
        categoryText,
        openRecordUrl: recordUrl,
        googleUrl,
      });
    },
  };
}
