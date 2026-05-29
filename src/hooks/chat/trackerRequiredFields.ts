import type { CollectionType, CollectedFields } from "@/components/ai/DataCollectionTracker";
import { URBAN_RISK_COLLECTION_CATEGORIES } from "@/lib/reportFieldConfig";

type FieldRule = {
  key: string;
  required: boolean;
  requiredFor?: string[];
  requiredWhen?: { field: string; values: string[] };
};

const TRACKER_FIELD_CONFIG: Record<string, FieldRule[]> = {
  urban_report: [
    { key: "report_nature", required: true },
    { key: "category", required: true },
    { key: "description", required: true },
    { key: "street", required: true },
    { key: "neighborhood", required: true },
    { key: "risk_level", required: false, requiredFor: [...URBAN_RISK_COLLECTION_CATEGORIES] },
    {
      key: "affected_scope",
      required: false,
      requiredWhen: { field: "risk_level", values: ["critical", "moderate"] },
    },
  ],
  transport_report: [
    { key: "report_type", required: true },
    { key: "sub_category", required: true },
    { key: "description", required: true },
    { key: "occurrence_date", required: true },
    { key: "occurrence_time", required: true },
    { key: "direction", required: true },
    { key: "recurrence_frequency", required: true },
    { key: "personal_impact", required: true },
  ],
  service_rating: [
    { key: "service_type", required: true },
    { key: "service_name", required: true },
    { key: "service_address_confirmed", required: true },
    { key: "rating_stars", required: true },
    { key: "wait_time_score", required: true },
    { key: "rating_text", required: true },
  ],
};

export function getMissingRequiredFields(
  collectionType: CollectionType | null,
  collectedFields: CollectedFields,
): string[] {
  if (!collectionType) return [];

  const fields = TRACKER_FIELD_CONFIG[collectionType];
  if (!fields) return [];

  const category =
    typeof collectedFields.category === "string" ? collectedFields.category : undefined;
  const missing: string[] = [];

  for (const field of fields) {
    if (field.key === "rating_stars") {
      const n = Number(collectedFields.rating_stars);
      if (Number.isInteger(n) && n >= 1 && n <= 5) continue;
    } else if (field.key === "personal_impact") {
      const n = Number(collectedFields.personal_impact);
      if (Number.isInteger(n) && n >= 2 && n <= 5) continue;
    } else if (collectedFields[field.key]) {
      continue;
    }

    let isRequired = field.required;

    if (!isRequired && field.requiredFor && category) {
      isRequired = field.requiredFor.includes(category);
    }

    if (!isRequired && field.requiredWhen) {
      const dependentValue = collectedFields[field.requiredWhen.field];
      if (
        typeof dependentValue === "string" &&
        field.requiredWhen.values.includes(dependentValue)
      ) {
        isRequired = true;
      }
    }

    if (isRequired) {
      missing.push(field.key);
    }
  }

  return missing;
}

export function isTrackerCollectionComplete(
  collectionType: CollectionType | null,
  collectedFields: CollectedFields,
): boolean {
  return getMissingRequiredFields(collectionType, collectedFields).length === 0;
}
