import type { PluginConfig } from "./schema";

export interface ValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface FieldExistenceChecker {
  (fieldCode: string): boolean;
}

/**
 * 保存前バリデーション。
 * - 必須項目（開始日時フィールド）
 * - 存在しないフィールドコードの検出（インポート時・フィールド削除時など）
 * - 色のコントラスト警告
 */
export function validateConfig(config: PluginConfig, fieldExists: FieldExistenceChecker): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!config.dateMapping.startFieldCode) {
    issues.push({ path: "dateMapping.startFieldCode", message: "開始日時フィールドは必須です。", severity: "error" });
  } else if (!fieldExists(config.dateMapping.startFieldCode)) {
    issues.push({
      path: "dateMapping.startFieldCode",
      message: `フィールド "${config.dateMapping.startFieldCode}" はこのアプリに存在しません。`,
      severity: "error",
    });
  }

  if (config.dateMapping.endFieldCode && !fieldExists(config.dateMapping.endFieldCode)) {
    issues.push({
      path: "dateMapping.endFieldCode",
      message: `フィールド "${config.dateMapping.endFieldCode}" はこのアプリに存在しません。`,
      severity: "error",
    });
  }

  if (config.colorRule.categoryFieldCode && !fieldExists(config.colorRule.categoryFieldCode)) {
    issues.push({
      path: "colorRule.categoryFieldCode",
      message: `フィールド "${config.colorRule.categoryFieldCode}" はこのアプリに存在しません。`,
      severity: "error",
    });
  }

  if (config.googleIntegration.locationFieldCode && !fieldExists(config.googleIntegration.locationFieldCode)) {
    issues.push({
      path: "googleIntegration.locationFieldCode",
      message: `フィールド "${config.googleIntegration.locationFieldCode}" はこのアプリに存在しません。`,
      severity: "error",
    });
  }

  for (const code of config.bandTemplate.listFieldCodes) {
    if (!fieldExists(code)) {
      issues.push({
        path: "bandTemplate.listFieldCodes",
        message: `フィールド "${code}" はこのアプリに存在しません。`,
        severity: "warning",
      });
    }
  }

  // 帯テンプレートは必須。空のままだと帯に何も表示されない。
  if (config.bandTemplate.template.trim() === "") {
    issues.push({
      path: "bandTemplate.template",
      message: "帯に表示する内容が未設定です。表示するフィールドを1つ以上選択してください。",
      severity: "error",
    });
  }

  // テンプレート内のフィールドコードが実在するか確認する。
  for (const [path, template] of [
    ["bandTemplate.template", config.bandTemplate.template],
    ["bandTemplate.mobileTemplate", config.bandTemplate.mobileTemplate ?? ""],
    ["googleIntegration.titleTemplate", config.googleIntegration.titleTemplate],
    ["googleIntegration.detailsTemplate", config.googleIntegration.detailsTemplate],
  ] as const) {
    for (const code of extractFieldCodes(template)) {
      if (!fieldExists(code)) {
        issues.push({
          path,
          message: `テンプレート内のフィールド "${code}" はこのアプリに存在しません。`,
          severity: "error",
        });
      }
    }
  }

  // Google 連携が有効ならタイトルは必須（空だと予定名の無い予定が作られる）。
  if (config.googleIntegration.enabled && config.googleIntegration.titleTemplate.trim() === "") {
    issues.push({
      path: "googleIntegration.titleTemplate",
      message: "Google カレンダーの予定タイトルが未設定です。タイトルに使うフィールドを指定してください。",
      severity: "error",
    });
  }

  for (const entry of config.colorRule.mapping) {
    const contrast = contrastRatio(entry.backgroundColor, entry.textColor);
    if (contrast !== null && contrast < 3) {
      issues.push({
        path: `colorRule.mapping[${entry.value}]`,
        message: `"${entry.value}" の背景色と文字色のコントラストが低く読みにくい可能性があります（比率 ${contrast.toFixed(2)}）。`,
        severity: "warning",
      });
    }
  }

  return issues;
}

/** テンプレート文字列から {フィールドコード} を重複なく抽出する。 */
export function extractFieldCodes(template: string): string[] {
  const codes = new Set<string>();
  for (const match of template.matchAll(/\{([^{}]+)\}/g)) {
    const code = match[1]?.trim();
    if (code) codes.add(code);
  }
  return [...codes];
}

/** WCAG 相対輝度に基づく簡易コントラスト比計算。#rrggbb 形式以外は null を返す。 */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  if (a === null || b === null) return null;
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return null;
  const intVal = parseInt(match[1]!, 16);
  const r = ((intVal >> 16) & 255) / 255;
  const g = ((intVal >> 8) & 255) / 255;
  const b = (intVal & 255) / 255;
  const [rl, gl, bl] = [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * rl! + 0.7152 * gl! + 0.0722 * bl!;
}
