import type { KintoneFieldValue } from "../core/util/typeGuards";

/**
 * PC / モバイルの環境差分を吸収するアダプタのインターフェース。
 * core 配下は本インターフェースのみに依存し、kintone の PC/モバイル API を直接叩かない。
 */
export interface EnvironmentAdapter {
  readonly kind: "desktop" | "mobile";
  /** カレンダーを描画するコンテナ要素を返す。取得できない場合は null。 */
  getContainer(): HTMLElement | null;
  /** レコード詳細画面への遷移 URL を生成する。 */
  getRecordUrl(appId: number, recordId: string | number): string;
  /** 一覧ビューの絞込条件を取得する。取得できない/存在しない環境では null。 */
  getQueryCondition(): string | null;
  /** 帯 (イベント) クリック時の挙動。 */
  onEventClick(context: EventClickContext): void;
  /** レイアウトプリセット名（帯テンプレート等の PC/モバイル切替に使用）。 */
  layoutPreset(): "desktop" | "mobile";
  /** 標準一覧テーブルの DOM 参照。取得できない場合は null（呼び出し側でフォールバック）。 */
  getStandardListElement(): HTMLElement | null;
}

export interface EventClickContext {
  recordId: string | number;
  appId: number;
  anchorElement: HTMLElement;
  record: Record<string, KintoneFieldValue>;
}
