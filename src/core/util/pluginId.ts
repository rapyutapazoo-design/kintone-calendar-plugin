/**
 * プラグイン ID の取得と、設定の安全な読み出し。
 *
 * ## なぜモジュール先頭で「捕捉」する必要があるのか
 *
 * kintone はプラグイン配下の JavaScript を評価する直前に `kintone.$PLUGIN_ID` を
 * セットし、**評価が終わると削除する**（プラグイン同士が互いの ID を読めないようにするため）。
 * つまりこの変数は「スクリプト評価中だけ有効な一時変数」であり、
 * `await` を挟んだ後や、イベントハンドラの内部から参照しても既に undefined になっている。
 *
 * そのため ID はモジュールのトップレベル（＝スクリプト評価中）で同期的に捕捉し、
 * 以降はその値を使い回す必要がある。
 *
 * **この捕捉を関数呼び出しの中へ移動してはいけない。**
 * 実際に、非同期ハンドラ内から参照する実装に変更した際、
 * 「kintone.$PLUGIN_ID が未定義です」で全画面が停止する不具合が発生した。
 *
 * NOTE: `kintone.$PLUGIN_ID` というリテラルは scripts/build-plugin.mjs の
 * ビルド時アサーションで各バンドルに含まれることを検査している。
 */

const LOG_PREFIX = "[kintone-calendar-plugin]";

/** `pluginId=xxxx` 形式の文字列（URL・クエリ文字列）からプラグイン ID を抽出する。 */
function extractPluginIdFromQuery(source: string): string {
  const raw = source.match(/[?&]pluginId=([^&#]+)/)?.[1];
  return raw ? decodeURIComponent(raw) : "";
}

/**
 * プラグイン ID を解決する。
 *
 * 1. `kintone.$PLUGIN_ID`（公式手段。スクリプト評価中のみ有効）
 * 2. 実行中の `<script>` の src に含まれる `pluginId`（kintone は
 *    `.../download.do?pluginId=...&contentId=...` 形式でプラグインの JS を配信する）
 * 3. 画面 URL のクエリ `pluginId`（プラグイン設定画面で有効）
 *
 * 2・3 は 1 が失われた後でも機能するフォールバックであり、
 * 非同期処理の後から呼ばれた場合の保険として残している。
 */
export function resolvePluginId(): string {
  try {
    const id = kintone.$PLUGIN_ID;
    if (typeof id === "string" && id.length > 0) return id;
  } catch {
    /* kintone 自体が未定義の環境（テスト等）では次のフォールバックへ */
  }

  try {
    const currentScript = document.currentScript as HTMLScriptElement | null;
    const fromScript = extractPluginIdFromQuery(currentScript?.src ?? "");
    if (fromScript) return fromScript;
  } catch {
    /* document が無い環境では次のフォールバックへ */
  }

  try {
    const fromLocation = extractPluginIdFromQuery(window.location.search);
    if (fromLocation) return fromLocation;
  } catch {
    /* window が無い環境では諦める */
  }

  return "";
}

/**
 * スクリプト評価時に同期的に捕捉したプラグイン ID。
 * ここでの即時評価が本モジュールの要であり、遅延させてはならない（冒頭のコメント参照）。
 */
const CAPTURED_PLUGIN_ID = resolvePluginId();

/** 捕捉済みのプラグイン ID を返す。取得できていない場合は空文字。 */
export function getPluginId(): string {
  return CAPTURED_PLUGIN_ID || resolvePluginId();
}

/**
 * プラグイン設定を読み出す。
 * ID が取得できない場合や kintone 側が例外を投げた場合でも throw せず null を返し、
 * 呼び出し元が画面にエラーを提示できるようにする（無言で停止させない）。
 */
export function readPluginConfig(): Record<string, string> | null {
  const pluginId = getPluginId();
  if (!pluginId) {
    console.error(
      `${LOG_PREFIX} プラグイン ID を取得できませんでした。` +
        "kintone.$PLUGIN_ID・スクリプト URL・画面 URL のいずれからも取得できていません。"
    );
    return null;
  }

  try {
    return kintone.plugin.app.getConfig(pluginId);
  } catch (error) {
    console.error(`${LOG_PREFIX} プラグイン設定の読み出しに失敗しました。`, error);
    return null;
  }
}
