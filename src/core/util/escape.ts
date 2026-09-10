/**
 * XSS 対策ユーティリティ。
 * レコード値を DOM に流す箇所は textContent を原則とし、やむを得ず HTML 文字列を
 * 組み立てる場合（例: title 属性以外での挿入）は必ずこの escapeHtml を通す。
 * FullCalendar の eventContent は本プラグインでは常に DOM ノードを返す実装とし、
 * innerHTML 経路は作らない。
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 属性値としての利用を想定したエスケープ（escapeHtml と同一だが意図を明確にするための別名）。 */
export const escapeAttribute = escapeHtml;

/** テキストノードとして安全に追加するヘルパー。innerHTML を一切使用しない。 */
export function appendText(parent: HTMLElement, text: string): Text {
  const node = document.createTextNode(text);
  parent.appendChild(node);
  return node;
}
