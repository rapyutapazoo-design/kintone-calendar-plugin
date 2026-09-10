import { defineConfig } from "vite";

// NOTE: kintone プラグインは desktop.js / mobile.js / config.js をそれぞれ
// 独立した <script> として読み込むため、コード分割ができない IIFE 形式で
// エントリごとに個別ビルドする必要がある。実際のマルチエントリビルドは
// scripts/build-plugin.mjs 内で vite の JS API (build.lib) をエントリ毎に
// 呼び出すことで行う。このファイルは `vite build` を単体で呼んだ場合の
// デフォルト設定（desktop エントリ）と、tsc/エディタ向けの設定を兼ねる。
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: "src/entries/desktop.ts",
      name: "KintoneCalendarPluginDesktop",
      formats: ["iife"],
      fileName: () => "desktop.js",
    },
  },
});
