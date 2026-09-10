import type { EnvironmentAdapter, EventClickContext } from "./types";

/**
 * 標準一覧テーブルの DOM 参照はこの1関数に集約する（モバイル版）。
 * kintone モバイルの DOM 構造が変わった場合はここだけを直せばよい。
 */
export function getStandardListElementMobile(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(".gaia-mobile-recordlist") ??
    document.querySelector<HTMLElement>('[class*="recordlist"]')
  );
}

export function buildRecordDetailUrlMobile(appId: number, recordId: string | number): string {
  return `/k/m/${appId}/show#record=${recordId}`;
}

export function createMobileAdapter(): EnvironmentAdapter {
  return {
    kind: "mobile",

    getContainer(): HTMLElement | null {
      try {
        return kintone.mobile.app.getHeaderSpaceElement();
      } catch {
        return null;
      }
    },

    getRecordUrl(appId: number, recordId: string | number): string {
      return buildRecordDetailUrlMobile(appId, recordId);
    },

    getQueryCondition(): string | null {
      try {
        // モバイル側の getQueryCondition は環境によって未実装のことがあるため
        // 存在チェックを行い、取得できない場合は null（設定側の絞込条件のみ使用）。
        const fn = kintone.mobile.app.getQueryCondition;
        return typeof fn === "function" ? fn.call(kintone.mobile.app) : null;
      } catch {
        return null;
      }
    },

    layoutPreset(): "mobile" {
      return "mobile";
    },

    getStandardListElement: getStandardListElementMobile,

    onEventClick(context: EventClickContext): void {
      // モバイルは帯タップで即レコード詳細へ遷移する（ポップオーバーなし）。
      window.location.href = buildRecordDetailUrlMobile(context.appId, context.recordId);
    },
  };
}
