/**
 * Google カレンダー追加ボタン。window.open ではなく実アンカー要素
 * (target="_blank" + rel="noopener noreferrer") として生成する。
 */
export function createGoogleCalendarLink(url: string, label = "Google カレンダーに追加"): HTMLAnchorElement {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.className = "kcp-google-button";
  anchor.textContent = label;
  return anchor;
}
