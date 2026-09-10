// kintone プラグインのビルドパイプライン。
// 1. TS を vite (build.lib, IIFE) でエントリごとに個別ビルドし dist/*.js を生成
// 2. CSS を連結・コピーして dist/*.css と plugin/css/*.css を生成
// 3. plugin/ 配下 (manifest.json, config.html, icon.png, js/, css/) を組み立て
// 4. @kintone/plugin-packer で zip 化する。秘密鍵(.ppk)が無ければ自動生成し、
//    .gitignore 済みのプロジェクト直下 (private.ppk) に配置する。
import { build } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, "dist");
const pluginDir = path.join(rootDir, "plugin");
const pluginJsDir = path.join(pluginDir, "js");
const pluginCssDir = path.join(pluginDir, "css");
const stylesDir = path.join(rootDir, "src", "styles");
const ppkPath = path.join(rootDir, "private.ppk");

fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(pluginJsDir, { recursive: true });
fs.mkdirSync(pluginCssDir, { recursive: true });

const entries = [
  { name: "desktop", entry: "src/entries/desktop.ts", globalName: "KintoneCalendarPluginDesktop" },
  { name: "mobile", entry: "src/entries/mobile.ts", globalName: "KintoneCalendarPluginMobile" },
  { name: "config", entry: "src/entries/config.ts", globalName: "KintoneCalendarPluginConfig" },
];

async function buildJsEntries() {
  for (const e of entries) {
    console.log(`[build-plugin] building ${e.name}.js ...`);
    await build({
      root: rootDir,
      configFile: false,
      build: {
        outDir: "dist",
        emptyOutDir: false,
        minify: true,
        lib: {
          entry: e.entry,
          name: e.globalName,
          formats: ["iife"],
          fileName: () => `${e.name}.js`,
        },
      },
      logLevel: "warn",
    });
  }
}

function buildCss() {
  const common = fs.readFileSync(path.join(stylesDir, "common.css"), "utf8");

  const desktopCss = `${common}\n\n${fs.readFileSync(path.join(stylesDir, "desktop.css"), "utf8")}`;
  const mobileCss = `${common}\n\n${fs.readFileSync(path.join(stylesDir, "mobile.css"), "utf8")}`;
  const configCss = fs.readFileSync(path.join(stylesDir, "config.css"), "utf8");

  fs.writeFileSync(path.join(distDir, "desktop.css"), desktopCss);
  fs.writeFileSync(path.join(distDir, "mobile.css"), mobileCss);
  fs.writeFileSync(path.join(distDir, "config.css"), configCss);

  fs.writeFileSync(path.join(pluginCssDir, "desktop.css"), desktopCss);
  fs.writeFileSync(path.join(pluginCssDir, "mobile.css"), mobileCss);
  fs.writeFileSync(path.join(pluginCssDir, "config.css"), configCss);
}

function copyJsToPlugin() {
  for (const e of entries) {
    fs.copyFileSync(path.join(distDir, `${e.name}.js`), path.join(pluginJsDir, `${e.name}.js`));
  }
}

function ensureIcon() {
  const iconPath = path.join(pluginDir, "icon.png");
  if (!fs.existsSync(iconPath)) {
    console.log("[build-plugin] icon.png not found, generating...");
    execFileSync("node", [path.join(rootDir, "scripts", "gen-icon.mjs")], { stdio: "inherit" });
  }
}

function packPlugin() {
  console.log("[build-plugin] packing plugin zip ...");
  const outZip = path.join(distDir, "plugin.zip");

  // kintone-plugin-packer は --ppk を指定すると「既存キーとして読み込む」動作のみで
  // 自動生成はしない（省略時のみ自動生成し、出力先ディレクトリに <PluginID>.ppk として書き出す）。
  // プラグインIDは鍵から導出されるため、2回目以降のビルドでも同じIDを保つには
  // 生成済みの鍵 (private.ppk, .gitignore 済み) を再利用する必要がある。
  if (fs.existsSync(ppkPath)) {
    console.log(`[build-plugin] reusing existing private key: ${ppkPath}`);
    execFileSync(
      "npx",
      ["kintone-plugin-packer", pluginDir, "--ppk", ppkPath, "--out", outZip],
      { stdio: "inherit", cwd: rootDir }
    );
    return;
  }

  console.log("[build-plugin] no private key found. generating a new one...");
  execFileSync("npx", ["kintone-plugin-packer", pluginDir, "--out", outZip], {
    stdio: "inherit",
    cwd: rootDir,
  });

  // --ppk 省略時、鍵は outZip と同じディレクトリ (dist/) に <PluginID>.ppk として生成される。
  const generated = fs.readdirSync(distDir).filter((f) => f.endsWith(".ppk"));
  if (generated.length !== 1) {
    throw new Error(`生成された秘密鍵を dist/ から特定できませんでした: ${JSON.stringify(generated)}`);
  }
  const generatedPath = path.join(distDir, generated[0]);
  fs.copyFileSync(generatedPath, ppkPath);
  fs.unlinkSync(generatedPath);
  console.log(`[build-plugin] private key saved to: ${ppkPath} (この場所は .gitignore 済み)`);
}

async function main() {
  await buildJsEntries();
  buildCss();
  copyJsToPlugin();
  ensureIcon();
  packPlugin();
  console.log("[build-plugin] done: dist/plugin.zip");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
