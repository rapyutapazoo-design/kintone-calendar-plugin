import { afterEach, describe, expect, it, vi } from "vitest";

import { getPluginId, readPluginConfig, resolvePluginId } from "../src/core/util/pluginId";

type MutableGlobal = typeof globalThis & {
  kintone?: unknown;
  document?: unknown;
  window?: unknown;
};

const g = globalThis as MutableGlobal;

function setKintone(value: unknown): void {
  g.kintone = value;
}

afterEach(() => {
  delete g.kintone;
  delete g.document;
  delete g.window;
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("resolvePluginId", () => {
  it("kintone.$PLUGIN_ID を最優先で返す", () => {
    setKintone({ $PLUGIN_ID: "djkcedoabbphpmidmheapbbofciinmmm" });
    expect(resolvePluginId()).toBe("djkcedoabbphpmidmheapbbofciinmmm");
  });

  it("kintone 自体が未定義でも例外を投げず空文字を返す", () => {
    expect(resolvePluginId()).toBe("");
  });

  it("$PLUGIN_ID が失われていれば実行中スクリプトの src から拾う", () => {
    setKintone({ $PLUGIN_ID: undefined });
    g.document = {
      currentScript: { src: "https://example.cybozu.com/k/api/dev/plugin/download.do?pluginId=fromscript&contentId=9518" },
    };
    expect(resolvePluginId()).toBe("fromscript");
  });

  it("スクリプトからも拾えなければ画面 URL のクエリから拾う", () => {
    setKintone({ $PLUGIN_ID: undefined });
    g.window = { location: { search: "?pluginId=fromlocation" } };
    expect(resolvePluginId()).toBe("fromlocation");
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

describe("プラグイン ID の捕捉タイミング（回帰テスト）", () => {
  /**
   * kintone は各プラグインのスクリプトを評価した直後に kintone.$PLUGIN_ID を削除する。
   * そのため ID はモジュール評価時に同期的に捕捉しておく必要がある。
   * 捕捉を非同期処理の後まで遅延させると設定が一切読めなくなる（実際に発生した不具合）。
   */
  it("$PLUGIN_ID がスクリプト評価後に削除されても設定を読み出せる", async () => {
    const getConfig = vi.fn().mockReturnValue({ config: '{"schemaVersion":1}' });
    setKintone({ $PLUGIN_ID: "capturedatload", plugin: { app: { getConfig } } });

    vi.resetModules();
    const mod = await import("../src/core/util/pluginId");

    // kintone がスクリプト評価直後に $PLUGIN_ID を破棄する挙動を再現する。
    (g.kintone as { $PLUGIN_ID?: string }).$PLUGIN_ID = undefined;

    expect(mod.getPluginId()).toBe("capturedatload");
    expect(mod.readPluginConfig()).toEqual({ config: '{"schemaVersion":1}' });
    expect(getConfig).toHaveBeenCalledWith("capturedatload");
  });
});
