export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface KintoneFieldValue {
  type: string;
  value: unknown;
}

export function isKintoneFieldValue(value: unknown): value is KintoneFieldValue {
  return isPlainObject(value) && "type" in value && "value" in value;
}

export function isKintoneRecord(value: unknown): value is Record<string, KintoneFieldValue> {
  if (!isPlainObject(value)) return false;
  return Object.values(value).every((v) => isKintoneFieldValue(v));
}
