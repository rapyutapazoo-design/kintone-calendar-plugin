/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";

import { setupViewToggle } from "../src/core/render/viewToggle";

/**
 * カスタムビュー（HTML ビュー）には標準一覧テーブルが存在しない。
 * その状態で一覧へ切り替えるとカレンダーだけが消えて画面が空白になり、
 * 「レコードが消えた」と誤解される（実機で発生）。
 */
function setupDom() {
  document.body.innerHTML = "";
  const calendarContainer = document.createElement("div");
  const filter = document.createElement("div");
  document.body.append(calendarContainer, filter);
  return { calendarContainer, filter };
}

function buttons(el: HTMLElement) {
  const all = [...el.querySelectorAll("button")];
  return {
    calendar: all.find((b) => b.textContent === "カレンダー")!,
    list: all.find((b) => b.textContent === "一覧")! as HTMLButtonElement,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("setupViewToggle（標準一覧が存在する場合）", () => {
  it("一覧に切り替えるとカレンダーと絞り込みを隠し、標準一覧を出す", () => {
    const { calendarContainer, filter } = setupDom();
    const standardList = document.createElement("div");
    document.body.appendChild(standardList);

    const toggle = setupViewToggle({
      appId: 1,
      viewId: "v",
      calendarContainer,
      getStandardListElement: () => standardList,
      defaultState: "calendar",
      calendarOnlyElements: [filter],
    });

    buttons(toggle.element).list.click();

    expect(toggle.getState()).toBe("list");
    expect(calendarContainer.style.display).toBe("none");
    expect(filter.style.display).toBe("none");
    expect(standardList.style.display).toBe("");
    expect(window.localStorage.getItem("kcp:viewToggle:1:v")).toBe("list");
  });

  it("カレンダーに戻すと標準一覧を隠す", () => {
    const { calendarContainer, filter } = setupDom();
    const standardList = document.createElement("div");
    document.body.appendChild(standardList);

    const toggle = setupViewToggle({
      appId: 1,
      viewId: "v",
      calendarContainer,
      getStandardListElement: () => standardList,
      defaultState: "calendar",
      calendarOnlyElements: [filter],
    });

    buttons(toggle.element).list.click();
    buttons(toggle.element).calendar.click();

    expect(toggle.getState()).toBe("calendar");
    expect(calendarContainer.style.display).toBe("");
    expect(filter.style.display).toBe("");
    expect(standardList.style.display).toBe("none");
  });
});

describe("setupViewToggle（標準一覧が存在しない場合＝カスタムビュー）", () => {
  it("一覧ボタンを無効化し、理由を title で示す", () => {
    const { calendarContainer } = setupDom();
    const toggle = setupViewToggle({
      appId: 1,
      viewId: "custom",
      calendarContainer,
      getStandardListElement: () => null,
      defaultState: "calendar",
    });

    const { list } = buttons(toggle.element);
    expect(list.disabled).toBe(true);
    expect(list.title).toContain("標準の一覧表示がない");
  });

  it("一覧へ切り替えようとしてもカレンダー表示を維持し、空白にしない", () => {
    const { calendarContainer, filter } = setupDom();
    const toggle = setupViewToggle({
      appId: 1,
      viewId: "custom",
      calendarContainer,
      getStandardListElement: () => null,
      defaultState: "calendar",
      calendarOnlyElements: [filter],
    });

    toggle.setState("list");

    expect(toggle.getState()).toBe("calendar");
    expect(calendarContainer.style.display).toBe("");
    expect(filter.style.display).toBe("");
    expect(window.localStorage.getItem("kcp:viewToggle:1:custom")).toBe("calendar");
  });

  it("以前に list が保存されていてもカレンダーで復帰する", () => {
    window.localStorage.setItem("kcp:viewToggle:1:custom", "list");
    const { calendarContainer } = setupDom();
    const toggle = setupViewToggle({
      appId: 1,
      viewId: "custom",
      calendarContainer,
      getStandardListElement: () => null,
      defaultState: "calendar",
    });

    expect(toggle.getState()).toBe("calendar");
    expect(calendarContainer.style.display).toBe("");
  });
});
