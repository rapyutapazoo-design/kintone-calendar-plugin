import { afterEach, describe, expect, it, vi } from "vitest";

import { getPluginId, readPluginConfig } from "../src/core/util/pluginId";

type MutableGlobal = typeof globalThis & { kintone?: unknown };

function setKintone(value: unknown): void {
  (globalThis as MutableGlobal).kintone = value;
}

afterEach(() => {
  delete (globalThis as MutableGlobal).kintone;
  vi.restoreAllMocks();
});

describe("getPluginId", () => {
  it("kintone.$PLUGIN_ID をそのまま返す", () => {
    setKintone({ $PLUGIN_ID: "djkcedoabbphpmidmheapbbofciinmmm" });
    expect(getPluginId()).toBe("djkcedoabbphpmidmheapbbofciinmmm");
  });

  it("kintone 自体が未定義でも例外を投げず空文字を返す", () => {
    expect(getPluginId()).toBe("");
  });

  it("$PLUGIN_ID が文字列でなければ空文字を返す", () => {
    setKintone({ $PLUGIN_ID: undefined });
    expect(getPluginId()).toBe("");
  });
});

describe("readPluginConfig", () => {
  it("プラグイン ID を getConfig に渡して設定を返す", () => {
    const getConfig = vi.fn().mockReturnValue({ config: '{"schemaVersion":1}' });
    setKintone({ $PLUGIN_ID: "abc123", plugin: { app: { getConfig } } });

    expect(readPluginConfig()).toEqual({ config: '{"schemaVersion":1}' });
    expect(getConfig).toHaveBeenCalledWith("abc123");
  });

  it("プラグイン ID が取得できなければ getConfig を呼ばず null を返す", () => {
    const getConfig = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    setKintone({ $PLUGIN_ID: "", plugin: { app: { getConfig } } });

    expect(readPluginConfig()).toBeNull();
    expect(getConfig).not.toHaveBeenCalled();
  });

  it("getConfig が例外を投げても throw せず null を返す", () => {
    const getConfig = vi.fn().mockImplementation(() => {
      throw new Error("Usage: kintone.plugin.app.getConfig(pluginId)");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    setKintone({ $PLUGIN_ID: "abc123", plugin: { app: { getConfig } } });

    expect(readPluginConfig()).toBeNull();
  });
});
