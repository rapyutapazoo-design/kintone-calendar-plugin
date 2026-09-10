import type { KintoneApiClient } from "../data/fetch";

/** kintone.api を core 層のインターフェース (KintoneApiClient) に適合させるための薄いラッパー。 */
export function getApiClient(): KintoneApiClient {
  return (pathOrUrl, method, params) => kintone.api(pathOrUrl, method, params);
}
