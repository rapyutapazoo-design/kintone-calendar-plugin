export type ToggleState = "calendar" | "list";

export interface ViewToggleDeps {
  appId: number;
  viewId: number | string;
  calendarContainer: HTMLElement;
  /** 標準一覧テーブルの DOM 参照。取得失敗時は null を返すこと（例外を投げない）。 */
  getStandardListElement: () => HTMLElement | null;
  defaultState: ToggleState;
  /** カレンダー表示のときだけ出す要素（カテゴリ絞り込みなど）。一覧表示では隠す。 */
  calendarOnlyElements?: HTMLElement[];
}

export interface ViewToggleHandle {
  element: HTMLElement;
  setState: (state: ToggleState) => void;
  getState: () => ToggleState;
}

function storageKey(appId: number, viewId: number | string): string {
  return `kcp:viewToggle:${appId}:${viewId}`;
}

/** localStorage の読み書きは環境によって例外を投げうるため必ず try/catch で保護する。 */
function readStoredState(appId: number, viewId: number | string): ToggleState | null {
  try {
    const value = window.localStorage.getItem(storageKey(appId, viewId));
    return value === "calendar" || value === "list" ? value : null;
  } catch {
    return null;
  }
}

function writeStoredState(appId: number, viewId: number | string, state: ToggleState): void {
  try {
    window.localStorage.setItem(storageKey(appId, viewId), state);
  } catch {
    // 保存できなくても機能停止させない
  }
}

/**
 * カレンダー ⇄ 標準一覧テーブル の切替トグルを構築する。
 * 標準一覧の DOM 参照はこの関数（getStandardListElement 呼び出し）に集約されており、
 * kintone の DOM 構造が変わった場合はアダプタ側の実装を直すだけで済む。
 *
 * カスタムビュー（HTML ビュー）には標準一覧テーブルが存在しない。その状態で一覧へ
 * 切り替えるとカレンダーだけが消えて画面が空白になり、「レコードが消えた」と
 * 誤解される。標準一覧が見つからない場合は一覧ボタンを無効化し、常にカレンダーを
 * 表示するフォールバックとする。
 */
export function setupViewToggle(deps: ViewToggleDeps): ViewToggleHandle {
  const stored = readStoredState(deps.appId, deps.viewId);
  let currentState: ToggleState = stored ?? deps.defaultState;

  const wrapper = document.createElement("div");
  wrapper.className = "kcp-view-toggle";
  wrapper.setAttribute("role", "group");
  wrapper.setAttribute("aria-label", "表示切替");

  const calendarButton = document.createElement("button");
  calendarButton.type = "button";
  calendarButton.className = "kcp-toggle-button kcp-toggle-calendar";
  calendarButton.textContent = "カレンダー";

  const listButton = document.createElement("button");
  listButton.type = "button";
  listButton.className = "kcp-toggle-button kcp-toggle-list";
  listButton.textContent = "一覧";

  wrapper.appendChild(calendarButton);
  wrapper.appendChild(listButton);

  function applyState(requested: ToggleState): void {
    const standardList = safeGetStandardListElement(deps.getStandardListElement);

    // 切り替え先の標準一覧が存在しない場合は一覧へ遷移させない（空白画面を防ぐ）。
    const state: ToggleState = requested === "list" && !standardList ? "calendar" : requested;
    currentState = state;

    calendarButton.classList.toggle("kcp-toggle-active", state === "calendar");
    calendarButton.setAttribute("aria-pressed", String(state === "calendar"));
    listButton.classList.toggle("kcp-toggle-active", state === "list");
    listButton.setAttribute("aria-pressed", String(state === "list"));

    listButton.disabled = !standardList;
    listButton.title = standardList
      ? ""
      : "このビューには標準の一覧表示がないため切り替えられません。標準のビューでご利用ください。";

    const showCalendar = state === "calendar";
    deps.calendarContainer.style.display = showCalendar ? "" : "none";
    for (const el of deps.calendarOnlyElements ?? []) {
      el.style.display = showCalendar ? "" : "none";
    }

    if (standardList) {
      standardList.style.display = showCalendar ? "none" : "";
    }
  }

  function setState(state: ToggleState): void {
    applyState(state);
    // 実際に適用された状態を保存する（一覧へ遷移できなかった場合は calendar が残る）。
    writeStoredState(deps.appId, deps.viewId, currentState);
  }

  calendarButton.addEventListener("click", () => setState("calendar"));
  listButton.addEventListener("click", () => setState("list"));

  applyState(currentState);

  return {
    element: wrapper,
    setState,
    getState: () => currentState,
  };
}

function safeGetStandardListElement(getter: () => HTMLElement | null): HTMLElement | null {
  try {
    return getter();
  } catch {
    return null;
  }
}
