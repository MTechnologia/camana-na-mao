export type JourneySnapshotMetadata = {
  schema_version?: string;
  journey_type?: string;
  fields?: Record<string, unknown>;
};

export function extractJourneySnapshotFromMetadata(metadata: unknown): JourneySnapshotMetadata | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const root = metadata as Record<string, unknown>;
  const rawSnapshot = root.journey_snapshot;
  if (!rawSnapshot || typeof rawSnapshot !== "object" || Array.isArray(rawSnapshot)) return null;
  const snapshot = rawSnapshot as Record<string, unknown>;
  const schema_version = typeof snapshot.schema_version === "string" ? snapshot.schema_version : undefined;
  const journey_type = typeof snapshot.journey_type === "string" ? snapshot.journey_type : undefined;
  const fields = snapshot.fields && typeof snapshot.fields === "object" && !Array.isArray(snapshot.fields)
    ? (snapshot.fields as Record<string, unknown>)
    : undefined;
  if (!schema_version || !journey_type || !fields) return null;
  return { schema_version, journey_type, fields };
}

export function appendMessageByIdIfMissing(
  existing: Array<Record<string, unknown>>,
  next: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const nextId = typeof next.id === "string" ? next.id : null;
  if (!nextId) return [...existing, next];
  const alreadyExists = existing.some(
    (msg) => typeof msg?.id === "string" && msg.id === nextId,
  );
  return alreadyExists ? existing : [...existing, next];
}

export function shouldEnterLightJourney(params: {
  currentCollectionType: string | null;
  validTrackerTypes: readonly string[];
  explicitSwitchToLight: boolean;
}): boolean {
  const { currentCollectionType, validTrackerTypes, explicitSwitchToLight } = params;
  const hasStructuredJourneyInProgress = !!(
    currentCollectionType && validTrackerTypes.includes(currentCollectionType)
  );
  return !hasStructuredJourneyInProgress || explicitSwitchToLight;
}
