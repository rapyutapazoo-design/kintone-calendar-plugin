import { describe, expect, it } from "vitest";
import { buildTemplateFromFieldList, expandTemplate, type FieldSchemaLookup } from "../src/core/template/parse";

const schema: FieldSchemaLookup = (code) => {
  const map: Record<string, { type: string; label: string }> = {
    title: { type: "SINGLE_LINE_TEXT", label: "タイトル" },
    category: { type: "DROP_DOWN", label: "カテゴリ" },
    amount: { type: "NUMBER", label: "金額" },
    members: { type: "CHECK_BOX", label: "メンバー" },
    owner: { type: "USER_SELECT", label: "担当者" },
    link: { type: "LINK", label: "URL" },
  };
  return map[code];
};

describe("expandTemplate", () => {
  it("複数フィールドを展開する", () => {
    const record = {
      title: { type: "SINGLE_LINE_TEXT", value: "定例会議" },
      category: { type: "DROP_DOWN", value: "会議" },
    };
    const { text, unknownFieldCodes } = expandTemplate("{title} / {category}", record, schema);
    expect(text).toBe("定例会議 / 会議");
    expect(unknownFieldCodes).toHaveLength(0);
  });

  it("未知のフィールドコードは空文字に展開され警告リストに載る", () => {
    const record = { title: { type: "SINGLE_LINE_TEXT", value: "会議" } };
    const { text, unknownFieldCodes } = expandTemplate("{title} {no_such_field}", record, schema);
    expect(text).toBe("会議 ");
    expect(unknownFieldCodes).toEqual(["no_such_field"]);
  });

  it("数値フィールドは桁区切りで整形される", () => {
    const record = { amount: { type: "NUMBER", value: "1234567" } };
    const { text } = expandTemplate("{amount}", record, schema);
    expect(text).toBe("1,234,567");
  });

  it("チェックボックス（複数選択）は読点区切りで連結される", () => {
    const record = { members: { type: "CHECK_BOX", value: ["田中", "鈴木"] } };
    const { text } = expandTemplate("{members}", record, schema);
    expect(text).toBe("田中、鈴木");
  });

  it("ユーザー選択は表示名に変換される", () => {
    const record = { owner: { type: "USER_SELECT", value: [{ code: "u1", name: "山田太郎" }] } };
    const { text } = expandTemplate("{owner}", record, schema);
    expect(text).toBe("山田太郎");
  });

  it("リンクフィールドはテキストのまま展開される", () => {
    const record = { link: { type: "LINK", value: "https://example.com" } };
    const { text } = expandTemplate("{link}", record, schema);
    expect(text).toBe("https://example.com");
  });

  it("HTML特殊文字やスクリプト片を含む値もそのままプレーンテキストとして返す（エスケープはDOM描画側の責務）", () => {
    const record = { title: { type: "SINGLE_LINE_TEXT", value: "<script>alert(1)</script>" } };
    const { text } = expandTemplate("{title}", record, schema);
    expect(text).toBe("<script>alert(1)</script>");
  });
});

describe("buildTemplateFromFieldList", () => {
  it("フィールドコード配列から '/' 区切りテンプレートを生成する", () => {
    expect(buildTemplateFromFieldList(["title", "category"])).toBe("{title} / {category}");
  });
});
