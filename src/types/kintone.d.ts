/**
 * kintone JS/CSS カスタマイズ・プラグイン開発に必要な最小限のグローバル型定義。
 * @kintone/dts-gen 等の外部パッケージには依存せず、本プラグインが実際に使用する
 * API のみを宣言する。
 */

type KintoneEventHandler = (event: KintoneEvent) => KintoneEvent | false | void | Promise<KintoneEvent | void>;

interface KintoneEvent {
  appId: number;
  viewId?: number;
  viewName?: string;
  record?: Record<string, unknown>;
  records?: Record<string, unknown>[];
  [key: string]: unknown;
}

interface KintoneFieldSchema {
  type: string;
  code: string;
  label: string;
  options?: Record<string, { label: string; index: string }>;
  [key: string]: unknown;
}

interface KintoneFormFieldsResponse {
  properties: Record<string, KintoneFieldSchema>;
}

/** PC: 一覧画面 (kintone.app) */
interface KintoneAppApi {
  getId(): number | null;
  getQueryCondition(): string | null;
  getHeaderSpaceElement(): HTMLElement | null;
  record: KintoneAppRecordApi;
}

/** PC: レコード詳細画面 (kintone.app.record) */
interface KintoneAppRecordApi {
  getId(): number | null;
  getHeaderMenuSpaceElement?(): HTMLElement | null;
  getSpaceElement?(code: string): HTMLElement | null;
}

/** モバイル: 一覧画面 (kintone.mobile.app) */
interface KintoneMobileAppApi {
  getId(): number | null;
  getQueryCondition?(): string | null;
  getHeaderSpaceElement(): HTMLElement | null;
  record: KintoneMobileAppRecordApi;
}

/** モバイル: レコード詳細画面 (kintone.mobile.app.record) */
interface KintoneMobileAppRecordApi {
  getId(): number | null;
  getHeaderSpaceElement?(): HTMLElement | null;
}

interface KintoneProxyResponse {
  0: number;
  1: Record<string, string>;
  2: string;
}

interface KintonePluginApi {
  app: {
    getConfig(pluginId: string): Record<string, string>;
    setConfig(config: Record<string, string>, callback?: () => void): void;
  };
}

interface KintoneLoginUser {
  code: string;
  name: string;
  language?: string;
}

interface KintoneStatic {
  app: KintoneAppApi;
  mobile: {
    app: KintoneMobileAppApi;
  };
  /** 画面イベントの購読口。PC/モバイル/一覧/詳細を問わずこの単一の窓口を使う。 */
  events: {
    on(events: string | string[], handler: KintoneEventHandler): void;
  };
  plugin: KintonePluginApi;
  api: {
    (pathOrUrl: string, method: string, params: Record<string, unknown>): Promise<Record<string, unknown>>;
    url(path: string, detectGuestSpace?: boolean): string;
  };
  proxy(
    url: string,
    method: string,
    headers: Record<string, string>,
    data: Record<string, unknown>
  ): Promise<KintoneProxyResponse>;
  getLoginUser(): KintoneLoginUser;
  getRequestToken?(): string;
}

declare const kintone: KintoneStatic;
