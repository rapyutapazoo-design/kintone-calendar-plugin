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

/**
 * モバイルのレコード詳細 URL。
 * PC は `#record=` だがモバイルは `?record=` 形式で、`#record=` を使うと
 * kintone が「入力内容が正しくありません。(CB_VA01)」のエラー画面を返す（実機で確認済み）。
 */
export function buildRecordDetailUrlMobile(appId: number, recordId: string | number): string {
  return `/k/m/${appId}/show?record=${recordId}`;
}

/**
 * モバイルのレコード詳細画面で、要素を差し込む位置を返す。
 * ヘッダースペース相当の API が無いため、基準フィールドの要素から
 * フォームのレイアウト要素を辿り、その先頭に差し込む。
 */
export function findMobileDetailInsertTarget(baseFieldCode: string): HTMLElement | null {
  try {
    const fieldEl = kintone.mobile.app.record.getFieldElement?.(baseFieldCode);
    if (!fieldEl) return null;

    let node: HTMLElement | null = fieldEl;
    for (let i = 0; i < 6 && node; i += 1) {
      if (node.classList.contains("layout-gaia")) return node;
      node = node.parentElement;
    }
    return fieldEl.parentElement;
  } catch {
    return null;
  }
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
