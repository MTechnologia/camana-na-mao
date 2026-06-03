export type AppRole = "gestor" | "admin";

export function isAdminRole(role: AppRole): boolean {
  return role === "admin";
}
