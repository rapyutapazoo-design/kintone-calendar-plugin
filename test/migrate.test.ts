import { describe, expect, it } from "vitest";
import { migrateConfig } from "../src/core/config/migrate";
import { CURRENT_SCHEMA_VERSION, createDefaultConfig } from "../src/core/config/schema";

describe("migrateConfig", () => {
  it("null/未定義はデフォルト設定になる", () => {
    expect(migrateConfig(null)).toEqual(createDefaultConfig());
    expect(migrateConfig(undefined)).toEqual(createDefaultConfig());
  });

  it("空オブジェクトはデフォルト値で補完される", () => {
    const result = migrateConfig({});
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.dateMapping.startFieldCode).toBe("");
    expect(result.display.firstDay).toBe(0);
  });

  it("schemaVersion が無い古い設定（初版より前）も安全に読み込める", () => {
    const legacy = { dateMapping: { startFieldCode: "start_date", endFieldCode: null } };
    const result = migrateConfig(legacy);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.dateMapping.startFieldCode).toBe("start_date");
  });

  it("既存の設定値は保持しつつ、欠けているキーのみデフォルト値で補われる", () => {
    const partial = {
      schemaVersion: 1,
      dateMapping: { startFieldCode: "start", endFieldCode: "end" },
      colorRule: { categoryFieldCode: "cat", mapping: [{ value: "A", backgroundColor: "#111111", textColor: "#fff" }] },
    };
    const result = migrateConfig(partial);
    expect(result.dateMapping).toEqual({ startFieldCode: "start", endFieldCode: "end" });
    expect(result.colorRule.categoryFieldCode).toBe("cat");
    expect(result.colorRule.mapping).toHaveLength(1);
    expect(result.colorRule.fallbackBackgroundColor).toBe("#3788d8"); // デフォルト値で補完
    expect(result.display).toEqual(createDefaultConfig().display); // 欠けているブロックは丸ごとデフォルト
  });

  it("未来の schemaVersion でも既知キーを安全にマージして読み込む", () => {
    const future = { schemaVersion: 999, dateMapping: { startFieldCode: "x", endFieldCode: null } };
    const result = migrateConfig(future);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.dateMapping.startFieldCode).toBe("x");
  });

  it("不正な型（文字列や配列）が渡された場合はデフォルト設定を返す", () => {
    expect(migrateConfig("not an object")).toEqual(createDefaultConfig());
    expect(migrateConfig(42)).toEqual(createDefaultConfig());
  });
});
