/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";

import { buildRecordDetailUrlMobile, findMobileDetailInsertTarget } from "../src/adapters/mobile";

type MutableGlobal = typeof globalThis & { kintone?: unknown };
const g = globalThis as MutableGlobal;

afterEach(() => {
  delete g.kintone;
  document.body.innerHTML = "";
});

describe("buildRecordDetailUrlMobile", () => {
  /**
   * モバイルは `?record=` 形式。`#record=` を使うと kintone が
   * 「入力内容が正しくありません。(CB_VA01)」のエラー画面を返す（実機で確認済み）。
   */
  it("クエリ形式（?record=）の URL を生成する", () => {
    expect(buildRecordDetailUrlMobile(105, 1)).toBe("/k/m/105/show?record=1");
  });

  it("ハッシュ形式（#record=）は使わない", () => {
    expect(buildRecordDetailUrlMobile(105, 1)).not.toContain("#record=");
  });
});

describe("findMobileDetailInsertTarget", () => {
  function buildForm(): { layout: HTMLElement; field: HTMLElement } {
    const layout = document.createElement("div");
    layout.className = "layout-gaia";
    const row = document.createElement("div");
    row.className = "row-gaia";
    const field = document.createElement("div");
    field.className = "control-value-gaia";
    row.appendChild(field);
    layout.appendChild(row);
    document.body.appendChild(layout);
    return { layout, field };
  }

  it("基準フィールドから layout-gaia を辿って返す", () => {
    const { layout, field } = buildForm();
    g.kintone = { mobile: { app: { record: { getFieldElement: () => field } } } };
    expect(findMobileDetailInsertTarget("StartDateTime")).toBe(layout);
  });

  it("layout-gaia が無ければフィールドの親を返す", () => {
    const row = document.createElement("div");
    const field = document.createElement("div");
    row.appendChild(field);
    document.body.appendChild(row);
    g.kintone = { mobile: { app: { record: { getFieldElement: () => field } } } };
    expect(findMobileDetailInsertTarget("StartDateTime")).toBe(row);
  });

  it("フィールドが取得できなければ null を返す", () => {
    g.kintone = { mobile: { app: { record: { getFieldElement: () => null } } } };
    expect(findMobileDetailInsertTarget("StartDateTime")).toBeNull();
  });

  it("API 自体が存在しなくても例外を投げない", () => {
    g.kintone = { mobile: { app: { record: {} } } };
    expect(findMobileDetailInsertTarget("StartDateTime")).toBeNull();
  });
});
