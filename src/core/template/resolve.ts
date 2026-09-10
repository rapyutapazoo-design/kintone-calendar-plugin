import type { BandTemplateConfig } from "../config/schema";

/**
 * アダプタから渡されたレイアウトプリセット（PC/モバイル）に応じて使用する
 * テンプレート文字列を選択する。モバイル用が未設定なら PC 用にフォールバックする。
 */
export function resolveTemplateString(
  bandTemplate: BandTemplateConfig,
  layoutPreset: "desktop" | "mobile"
): string {
  if (layoutPreset === "mobile" && bandTemplate.mobileTemplate) {
    return bandTemplate.mobileTemplate;
  }
  return bandTemplate.template;
}
