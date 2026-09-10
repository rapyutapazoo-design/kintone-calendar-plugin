import { CURRENT_SCHEMA_VERSION, createDefaultConfig, type PluginConfig } from "./schema";

/**
 * 未知のバージョンの設定オブジェクトを現行スキーマへマイグレーションする。
 * schemaVersion が存在しない（= 初版より前）場合は 0 として扱う。
 * 各マイグレーションステップは「1つ前のバージョン→次のバージョン」の差分のみを担当し、
 * 順番に適用する。
 */
export function migrateConfig(raw: unknown): PluginConfig {
  const defaults = createDefaultConfig();
  if (typeof raw !== "object" || raw === null) {
    return defaults;
  }

  let data = raw as Record<string, unknown>;
  let version = typeof data.schemaVersion === "number" ? data.schemaVersion : 0;

  // 将来のマイグレーションはここに追記する。例:
  // if (version === 0) { data = migrateV0toV1(data); version = 1; }

  if (version > CURRENT_SCHEMA_VERSION) {
    // 未来のバージョン（ダウングレード運用など）はデフォルトにフォールバックしない。
    // 既知のキーだけを安全にマージして読み込む。
    version = CURRENT_SCHEMA_VERSION;
  }

  return mergeWithDefaults(defaults, data);
}

function mergeWithDefaults(defaults: PluginConfig, data: Record<string, unknown>): PluginConfig {
  const merged: PluginConfig = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    dateMapping: { ...defaults.dateMapping, ...(asObject(data.dateMapping)) },
    bandTemplate: { ...defaults.bandTemplate, ...(asObject(data.bandTemplate)) },
    colorRule: {
      ...defaults.colorRule,
      ...(asObject(data.colorRule)),
      mapping: Array.isArray((data.colorRule as Record<string, unknown> | undefined)?.mapping)
        ? ((data.colorRule as Record<string, unknown>).mapping as PluginConfig["colorRule"]["mapping"])
        : defaults.colorRule.mapping,
    },
    display: { ...defaults.display, ...(asObject(data.display)) },
    dataSource: { ...defaults.dataSource, ...(asObject(data.dataSource)) },
    googleIntegration: { ...defaults.googleIntegration, ...(asObject(data.googleIntegration)) },
  };
  return merged;
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
