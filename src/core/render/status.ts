/**
 * カレンダー領域内のローディング/エラー表示。
 * API 失敗時はカレンダー領域内にエラーメッセージと一覧表示へのフォールバック導線を出す。
 */

const STATUS_CLASS = "kcp-status-overlay";
const LOADING_CLASS = "kcp-status-loading";

/** ローディング・エラーを問わず、表示中のステータスをすべて消す。 */
export function clearCalendarStatus(container: HTMLElement): void {
  for (const el of Array.from(container.querySelectorAll(`.${STATUS_CLASS}`))) {
    el.remove();
  }
}

/**
 * ローディング表示だけを消す。エラー表示は残す。
 *
 * FullCalendar は取得失敗時にも loading(false) を発火するため、ここで一律に
 * ステータスを消すとエラー表示が即座に消えてしまう（実際に、API エラーが
 * 画面にもコンソールにも残らない状態になっていた）。
 */
export function clearLoadingStatus(container: HTMLElement): void {
  for (const el of Array.from(container.querySelectorAll(`.${LOADING_CLASS}`))) {
    el.remove();
  }
}

export function showCalendarLoading(container: HTMLElement): void {
  clearCalendarStatus(container);
  const overlay = document.createElement("div");
  overlay.className = `${STATUS_CLASS} ${LOADING_CLASS}`;
  overlay.textContent = "読み込み中…";
  container.appendChild(overlay);
}

export function showCalendarError(container: HTMLElement, message: string, onFallbackToList?: () => void): void {
  clearCalendarStatus(container);
  const overlay = document.createElement("div");
  overlay.className = `${STATUS_CLASS} kcp-status-error`;

  const text = document.createElement("p");
  text.textContent = message;
  overlay.appendChild(text);

  if (onFallbackToList) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "kcp-status-fallback-button";
    button.textContent = "一覧表示に切り替える";
    button.addEventListener("click", onFallbackToList);
    overlay.appendChild(button);
  }

  container.appendChild(overlay);
}

/**
 * プラグイン ID や設定の読み出しそのものに失敗した場合の表示。
 * 「未設定」とは原因が異なるため、案内文を分けて切り分けやすくする。
 */
export function showPluginConfigLoadError(container: HTMLElement): void {
  clearCalendarStatus(container);
  const overlay = document.createElement("div");
  overlay.className = `${STATUS_CLASS} kcp-status-error`;
  const text = document.createElement("p");
  text.textContent =
    "カレンダープラグインの設定を読み込めませんでした。プラグインを再インポートするか、システム管理者にお問い合わせください。";
  overlay.appendChild(text);
  container.appendChild(overlay);
}

export function showConfigMissingNotice(container: HTMLElement): void {
  clearCalendarStatus(container);
  const overlay = document.createElement("div");
  overlay.className = `${STATUS_CLASS} kcp-status-error`;
  const text = document.createElement("p");
  text.textContent = "プラグイン設定が未完了です。アプリの設定画面からカレンダープラグインを設定してください。";
  overlay.appendChild(text);
  container.appendChild(overlay);
}
