export type ToggleState = "calendar" | "list";

export interface ViewToggleDeps {
  appId: number;
  viewId: number | string;
  calendarContainer: HTMLElement;
  /** 標準一覧テーブルの DOM 参照。取得失敗時は null を返すこと（例外を投げない）。 */
  getStandardListElement: () => HTMLElement | null;
  defaultState: ToggleState;
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
 * 参照が見つからない場合は一覧を隠さずカレンダーを併置表示するフォールバックとし、
 * 機能停止させない。
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

  function applyState(state: ToggleState): void {
    currentState = state;
    calendarButton.classList.toggle("kcp-toggle-active", state === "calendar");
    calendarButton.setAttribute("aria-pressed", String(state === "calendar"));
    listButton.classList.toggle("kcp-toggle-active", state === "list");
    listButton.setAttribute("aria-pressed", String(state === "list"));

    const standardList = safeGetStandardListElement(deps.getStandardListElement);

    if (state === "list") {
      deps.calendarContainer.style.display = "none";
      if (standardList) standardList.style.display = "";
    } else {
      deps.calendarContainer.style.display = "";
      if (standardList) {
        standardList.style.display = "none";
      }
      // standardList が取得できない場合は非表示化を諦め、カレンダーと併置表示する。
    }
  }

  function setState(state: ToggleState): void {
    applyState(state);
    writeStoredState(deps.appId, deps.viewId, state);
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
