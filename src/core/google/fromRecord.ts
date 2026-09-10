import type { GoogleIntegrationConfig, DateMappingConfig } from "../config/schema";
import { expandTemplate, type FieldSchemaLookup } from "../template/parse";
import { isKintoneFieldValue, isNonEmptyString, type KintoneFieldValue } from "../util/typeGuards";
import { buildGoogleCalendarTemplateUrl, type GoogleEventInput } from "./renderUrl";

export interface FieldTypeLookup {
  (fieldCode: string): string | undefined;
}

/** レコードと設定から Google カレンダー追加用の URL を組み立てる。 */
export function buildGoogleUrlFromRecord(
  record: Record<string, KintoneFieldValue>,
  dateMapping: DateMappingConfig,
  googleIntegration: GoogleIntegrationConfig,
  fieldSchema: FieldSchemaLookup,
  fieldType: FieldTypeLookup,
  recordUrl: string
): string | null {
  const startField = record[dateMapping.startFieldCode];
  const startValue = isKintoneFieldValue(startField) ? startField.value : undefined;
  if (!isNonEmptyString(startValue)) return null;

  let endValue: string | null = null;
  if (dateMapping.endFieldCode) {
    const endField = record[dateMapping.endFieldCode];
    const raw = isKintoneFieldValue(endField) ? endField.value : undefined;
    if (isNonEmptyString(raw)) endValue = raw;
  }

  const isAllDay = fieldType(dateMapping.startFieldCode) === "DATE";

  const title = expandTemplate(googleIntegration.titleTemplate, record, fieldSchema).text;
  const details = expandTemplate(googleIntegration.detailsTemplate, record, fieldSchema).text;

  let location = "";
  if (googleIntegration.locationFieldCode) {
    const locField = record[googleIntegration.locationFieldCode];
    const locValue = isKintoneFieldValue(locField) ? locField.value : undefined;
    if (isNonEmptyString(locValue)) location = locValue;
  }

  const input: GoogleEventInput = {
    title,
    details,
    location,
    isAllDay,
    start: startValue,
    end: endValue,
    recordUrl: googleIntegration.appendRecordLink ? recordUrl : undefined,
  };

  return buildGoogleCalendarTemplateUrl(input);
}
