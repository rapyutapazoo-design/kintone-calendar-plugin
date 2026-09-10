/**
 * プラグイン ID の取得と、設定の安全な読み出し。
 *
 * kintone はプラグイン配下の JavaScript に限り `kintone.$PLUGIN_ID` を注入する。
 * これが唯一の公式手段であり、一覧画面・レコード詳細画面・設定画面のいずれでも
 * 同じ値が得られる。DOM やスクリプトの読み込み順序には一切依存しない。
 *
 * NOTE: `kintone.$PLUGIN_ID` というリテラルは scripts/build-plugin.mjs の
 * ビルド時アサーションで各バンドルに含まれることを検査している。
 * この参照を削除・間接化するとアサーションが失敗する。
 */

const LOG_PREFIX = "[kintone-calendar-plugin]";

/** プラグイン ID を返す。取得できない場合は空文字を返す。 */
export function getPluginId(): string {
  try {
    const id = kintone.$PLUGIN_ID;
    return typeof id === "string" ? id : "";
  } catch {
    return "";
  }
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
        "kintone.$PLUGIN_ID が未定義です（プラグインとして配信されていない可能性があります）。"
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
