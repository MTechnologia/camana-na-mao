export type NearbyRecentPlacePayload = {
  latitude: number;
  longitude: number;
  label: string;
};

export type NearbyRecentEquipmentPayload = {
  serviceId: string;
  label: string;
  latitude: number;
  longitude: number;
};

export type NearbyRecentSearchEntry = {
  id: string;
  kind: "text" | "place" | "equipment";
  createdAt: number;
  text?: string;
  place?: NearbyRecentPlacePayload;
  equipment?: NearbyRecentEquipmentPayload;
};
