/**
 * プラグイン設定のスキーマ定義。
 * schemaVersion を持たせることで将来のマイグレーションに備える。
 * フィールドコードのハードコードはここには存在しない（値は設定画面でユーザーが選択する）。
 */

export const CURRENT_SCHEMA_VERSION = 1;

export interface DateMappingConfig {
  /** 開始日時フィールドコード（必須） */
  startFieldCode: string;
  /** 終了日時フィールドコード（任意） */
  endFieldCode: string | null;
}

export interface BandTemplateConfig {
  /** 選択リスト or テンプレート文字列、どちらで編集していたかの UI ヒント（保存形式は template に一本化） */
  mode: "list" | "template";
  /** 展開後の PC 用テンプレート文字列。例: "{title} / {category}" */
  template: string;
  /** モバイル用テンプレート文字列。null の場合は template にフォールバック */
  mobileTemplate: string | null;
  /** mode === "list" のときに選択リストへ復元するためのフィールドコード列 */
  listFieldCodes: string[];
}

export interface ColorMappingEntry {
  value: string;
  backgroundColor: string;
  textColor: string;
}

export interface ColorRuleConfig {
  /** カテゴリフィールドコード。null の場合は色分けなし（フォールバック色のみ） */
  categoryFieldCode: string | null;
  mapping: ColorMappingEntry[];
  fallbackBackgroundColor: string;
  fallbackTextColor: string;
}

export interface DisplayConfig {
  initialView: "dayGridMonth";
  /** 0 = 日曜, 1 = 月曜 ... */
  firstDay: number;
  showHolidays: boolean;
  maxEventsPerDay: number;
  defaultToggleState: "calendar" | "list";
  showLegend: boolean;
}

export interface DataSourceConfig {
  /** 追加絞込条件（kintone クエリの一部、WHERE 句相当） */
  extraQueryCondition: string;
  /** 一覧ビューの絞込条件を引き継ぐか */
  inheritViewCondition: boolean;
}

export interface GoogleIntegrationConfig {
  enabled: boolean;
  titleTemplate: string;
  detailsTemplate: string;
  locationFieldCode: string | null;
  appendRecordLink: boolean;
}

export interface PluginConfig {
  schemaVersion: number;
  dateMapping: DateMappingConfig;
  bandTemplate: BandTemplateConfig;
  colorRule: ColorRuleConfig;
  display: DisplayConfig;
  dataSource: DataSourceConfig;
  googleIntegration: GoogleIntegrationConfig;
}

export function createDefaultConfig(): PluginConfig {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    dateMapping: {
      startFieldCode: "",
      endFieldCode: null,
    },
    bandTemplate: {
      mode: "list",
      // どのアプリにも存在しないフィールドコードを初期値にすると、設定したつもりで
      // 空文字が表示される無言の失敗を招くため、初期値は空にして保存前に必須チェックする。
      template: "",
      mobileTemplate: null,
      listFieldCodes: [],
    },
    colorRule: {
      categoryFieldCode: null,
      mapping: [],
      fallbackBackgroundColor: "#3788d8",
      fallbackTextColor: "#ffffff",
    },
    display: {
      initialView: "dayGridMonth",
      firstDay: 0,
      showHolidays: true,
      maxEventsPerDay: 4,
      defaultToggleState: "calendar",
      showLegend: true,
    },
    dataSource: {
      extraQueryCondition: "",
      inheritViewCondition: true,
    },
    googleIntegration: {
      enabled: true,
      titleTemplate: "",
      detailsTemplate: "",
      locationFieldCode: null,
      appendRecordLink: true,
    },
  };
}
