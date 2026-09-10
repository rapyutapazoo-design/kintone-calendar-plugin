export type Locale = "ja" | "en";

const dictionaries: Record<Locale, Record<string, string>> = {
  ja: {
    configNotReady: "プラグイン設定が未完了です。アプリの設定画面からカレンダープラグインを設定してください。",
    fetchError: "予定の取得に失敗しました。",
    loading: "読み込み中…",
    fallbackToList: "一覧表示に切り替える",
    toggleCalendar: "カレンダー",
    toggleList: "一覧",
    openRecord: "レコードを開く",
    close: "閉じる",
    addToGoogleCalendar: "Google カレンダーに追加",
    legend: "カテゴリ絞り込み",
    noEventsThisDay: "予定はありません",
    sectionDateMapping: "日付マッピング",
    sectionBandTemplate: "帯の表示内容",
    sectionColorRule: "色分け",
    sectionDisplay: "表示設定",
    sectionDataSource: "データ設定",
    sectionGoogle: "Google カレンダー連携",
    sectionPreview: "プレビュー",
    sectionImportExport: "設定のエクスポート／インポート",
    save: "保存",
    cancel: "キャンセル",
    saved: "設定を保存しました。",
  },
  en: {
    configNotReady: "Plugin configuration is incomplete. Please configure the calendar plugin from the app settings.",
    fetchError: "Failed to fetch events.",
    loading: "Loading…",
    fallbackToList: "Switch to list view",
    toggleCalendar: "Calendar",
    toggleList: "List",
    openRecord: "Open record",
    close: "Close",
    addToGoogleCalendar: "Add to Google Calendar",
    legend: "Category filter",
    noEventsThisDay: "No events",
    sectionDateMapping: "Date mapping",
    sectionBandTemplate: "Event label",
    sectionColorRule: "Color rules",
    sectionDisplay: "Display settings",
    sectionDataSource: "Data source",
    sectionGoogle: "Google Calendar integration",
    sectionPreview: "Preview",
    sectionImportExport: "Export / Import settings",
    save: "Save",
    cancel: "Cancel",
    saved: "Settings saved.",
  },
};

export function detectLocale(loginLanguage: string | undefined): Locale {
  return loginLanguage === "en" ? "en" : "ja";
}

export function translate(locale: Locale, key: string): string {
  return dictionaries[locale][key] ?? dictionaries.ja[key] ?? key;
}
