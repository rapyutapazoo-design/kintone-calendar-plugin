/**
 * 実行中の <script> タグの src からプラグイン ID を抽出する。
 * kintone プラグインでは manifest.json の js に列挙されたファイルが
 * "https://{subdomain}.cybozu.com/k/api/1.0/plugin/{PLUGIN_ID}/{path}" 形式で
 * 配信されるため、末尾から2番目のパスセグメントがプラグイン ID になる。
 */
export function getPluginId(): string {
  try {
    const scripts = document.getElementsByTagName("script");
    const lastScript = scripts[scripts.length - 1];
    const src = lastScript?.src ?? "";
    const match = src.match(/\/([^/]+)\/[^/]+\.js(?:\?.*)?$/);
    return match?.[1] ?? "";
  } catch {
    return "";
  }
}
