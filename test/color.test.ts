import { describe, expect, it } from "vitest";
import { resolveEventColor } from "../src/core/render/color";
import type { ColorRuleConfig } from "../src/core/config/schema";

const colorRule: ColorRuleConfig = {
  categoryFieldCode: "category",
  mapping: [
    { value: "会議", backgroundColor: "#ff0000", textColor: "#ffffff" },
    { value: "作業", backgroundColor: "#00ff00", textColor: "#000000" },
  ],
  fallbackBackgroundColor: "#cccccc",
  fallbackTextColor: "#000000",
};

describe("resolveEventColor", () => {
  it("マッピングに一致する値は対応する色を返す", () => {
    const record = { category: { type: "DROP_DOWN", value: "会議" } };
    expect(resolveEventColor(record, colorRule)).toEqual({ backgroundColor: "#ff0000", textColor: "#ffffff" });
  });

  it("マッピングにない値はフォールバック色を返す", () => {
    const record = { category: { type: "DROP_DOWN", value: "未分類" } };
    expect(resolveEventColor(record, colorRule)).toEqual({
      backgroundColor: "#cccccc",
      textColor: "#000000",
    });
  });

  it("カテゴリフィールド未設定はフォールバック色を返す", () => {
    const record = { category: { type: "DROP_DOWN", value: "会議" } };
    const rule: ColorRuleConfig = { ...colorRule, categoryFieldCode: null };
    expect(resolveEventColor(record, rule)).toEqual({ backgroundColor: "#cccccc", textColor: "#000000" });
  });

  it("複数選択（チェックボックス）は先頭値を採用する", () => {
    const record = { category: { type: "CHECK_BOX", value: ["作業", "会議"] } };
    expect(resolveEventColor(record, colorRule)).toEqual({ backgroundColor: "#00ff00", textColor: "#000000" });
  });

  it("値が空配列の場合はフォールバック色を返す", () => {
    const record = { category: { type: "CHECK_BOX", value: [] } };
    expect(resolveEventColor(record, colorRule)).toEqual({ backgroundColor: "#cccccc", textColor: "#000000" });
  });
});
