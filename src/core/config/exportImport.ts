import { migrateConfig } from "./migrate";
import type { PluginConfig } from "./schema";
import { validateConfig, type FieldExistenceChecker, type ValidationIssue } from "./validate";

export function exportConfigToJson(config: PluginConfig): string {
  return JSON.stringify(config, null, 2);
}

export interface ImportResult {
  config: PluginConfig | null;
  issues: ValidationIssue[];
}

/**
 * インポートした設定 JSON を現行スキーマへマイグレーションし、
 * インポート先アプリのフィールドコードと突合して存在しないコードを警告する。
 */
export function importConfigFromJson(jsonText: string, fieldExists: FieldExistenceChecker): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return {
      config: null,
      issues: [{ path: "$", message: "JSON の解析に失敗しました。", severity: "error" }],
    };
  }

  const config = migrateConfig(parsed);
  const issues = validateConfig(config, fieldExists);
  return { config, issues };
}
