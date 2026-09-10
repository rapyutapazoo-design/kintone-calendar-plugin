import { migrateConfig } from "./migrate";
import type { PluginConfig } from "./schema";

export const CONFIG_STORAGE_KEY = "config";

export type ConfigLoadResult =
  | { ok: true; config: PluginConfig }
  | { ok: false; reason: "not-configured" | "parse-error"; error?: unknown };

/**
 * kintone.plugin.app.getConfig() の戻り値（文字列の連想配列）から設定 JSON を
 * 読み込み、パース・マイグレーションを行う。未設定・破損時は安全に ok:false を返す
 * （例外を投げて描画全体を停止させない）。
 */
export function loadPluginConfig(rawConfig: Record<string, string> | null | undefined): ConfigLoadResult {
  if (!rawConfig || typeof rawConfig[CONFIG_STORAGE_KEY] !== "string" || rawConfig[CONFIG_STORAGE_KEY] === "") {
    return { ok: false, reason: "not-configured" };
  }

  try {
    const parsed = JSON.parse(rawConfig[CONFIG_STORAGE_KEY]);
    const config = migrateConfig(parsed);
    return { ok: true, config };
  } catch (error) {
    return { ok: false, reason: "parse-error", error };
  }
}

export function serializePluginConfig(config: PluginConfig): Record<string, string> {
  return { [CONFIG_STORAGE_KEY]: JSON.stringify(config) };
}
