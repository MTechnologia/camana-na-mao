import { describe, it, expect } from "vitest";
import {
  ALL_ROLES,
  DOMAIN_LABELS,
  PERMISSIONS,
  PERMISSION_KEYS,
  ROLE_LABELS,
  getPermission,
  groupPermissionsByDomain,
  rolesGrantPermission,
  type PermissionDomain,
} from "./permissions";

/**
 * HU-11.2 — Testes do catálogo de permissões.
 *
 * Garante a integridade do catálogo (chaves únicas, roles válidos, domínios
 * cobertos) e o funcionamento dos helpers usados pelo usePermission.
 */

describe("Catálogo PERMISSIONS", () => {
  it("tem pelo menos 25 permissões (HU-11 escopo)", () => {
    expect(PERMISSIONS.length).toBeGreaterThanOrEqual(25);
  });

  it("não tem chaves duplicadas", () => {
    const seen = new Set<string>();
    for (const p of PERMISSIONS) {
      expect(seen.has(p.key)).toBe(false);
      seen.add(p.key);
    }
  });

  it("toda permissão tem label e descrição não-vazios", () => {
    for (const p of PERMISSIONS) {
      expect(p.label.trim().length).toBeGreaterThan(0);
      expect(p.description.trim().length).toBeGreaterThan(5);
    }
  });

  it("todas as roles listadas são válidas", () => {
    for (const p of PERMISSIONS) {
      for (const r of p.roles) {
        expect(ALL_ROLES).toContain(r);
      }
    }
  });

  it("toda permissão tem ao menos um role", () => {
    for (const p of PERMISSIONS) {
      expect(p.roles.length).toBeGreaterThan(0);
    }
  });

  it("chaves seguem padrão domain.action", () => {
    for (const p of PERMISSIONS) {
      expect(p.key).toMatch(/^[a-z_]+\.[a-z_]+$/);
      // primeiro segmento é o domínio
      const [head] = p.key.split(".");
      expect(head).toBe(p.domain);
    }
  });

  it("admin tem acesso a TODAS as permissões de domínio 'users' e 'system'", () => {
    const adminDomains: PermissionDomain[] = ["users", "system"];
    for (const p of PERMISSIONS) {
      if (adminDomains.includes(p.domain)) {
        expect(p.roles).toContain("admin");
      }
    }
  });
});

describe("getPermission", () => {
  it("retorna a definição para uma chave válida", () => {
    const p = getPermission("users.invite");
    expect(p).not.toBeNull();
    expect(p?.label).toBe("Convidar usuários");
  });

  it("retorna null para chave inexistente", () => {
    expect(getPermission("not.a.real.key")).toBeNull();
  });
});

describe("rolesGrantPermission", () => {
  it("admin tem users.invite", () => {
    expect(rolesGrantPermission(["admin"], "users.invite")).toBe(true);
  });

  it("cidadao não tem users.invite", () => {
    expect(rolesGrantPermission(["cidadao"], "users.invite")).toBe(false);
  });

  it("multi-role: basta um role conceder", () => {
    expect(rolesGrantPermission(["cidadao", "admin"], "users.invite")).toBe(true);
  });

  it("chave inexistente sempre retorna false", () => {
    expect(rolesGrantPermission(["admin"], "fake.key")).toBe(false);
  });

  it("array vazio de roles retorna false", () => {
    expect(rolesGrantPermission([], "users.read")).toBe(false);
  });

  it("gestor tem reports.update_status", () => {
    expect(rolesGrantPermission(["gestor"], "reports.update_status")).toBe(true);
  });

  it("assessor tem triage.refer_commission", () => {
    expect(rolesGrantPermission(["assessor"], "triage.refer_commission")).toBe(true);
  });

  it("vereador NÃO tem triage.manage (gestão é admin/gestor)", () => {
    expect(rolesGrantPermission(["vereador"], "triage.manage")).toBe(false);
  });

  it("usa permissionKeys do banco quando fornecido", () => {
    const fromDb = new Set(["reports.read"]);
    expect(rolesGrantPermission(["vereador"], "reports.read", fromDb)).toBe(true);
    expect(rolesGrantPermission(["vereador"], "triage.manage", fromDb)).toBe(false);
  });

  it("admin tem users.manage_permissions no catálogo", () => {
    expect(rolesGrantPermission(["admin"], "users.manage_permissions")).toBe(true);
    expect(getPermission("users.manage_permissions")?.roles).toContain("admin");
  });
});

describe("groupPermissionsByDomain", () => {
  it("cobre todos os 8 domínios", () => {
    const grouped = groupPermissionsByDomain();
    const domains: PermissionDomain[] = [
      "users",
      "reports",
      "triage",
      "exports",
      "analytics",
      "audiences",
      "gabinete",
      "system",
    ];
    for (const d of domains) {
      expect(grouped[d]).toBeDefined();
    }
  });

  it("a soma dos itens agrupados é igual ao total", () => {
    const grouped = groupPermissionsByDomain();
    const sum = Object.values(grouped).reduce((acc, list) => acc + list.length, 0);
    expect(sum).toBe(PERMISSIONS.length);
  });
});

describe("Labels", () => {
  it("ROLE_LABELS cobre todos os roles", () => {
    for (const r of ALL_ROLES) {
      expect(ROLE_LABELS[r]).toBeTruthy();
    }
  });

  it("DOMAIN_LABELS cobre todos os domínios usados", () => {
    const domains = new Set(PERMISSIONS.map((p) => p.domain));
    for (const d of domains) {
      expect(DOMAIN_LABELS[d]).toBeTruthy();
    }
  });
});

describe("PERMISSION_KEYS export", () => {
  it("contém todas as chaves do catálogo", () => {
    expect(PERMISSION_KEYS.length).toBe(PERMISSIONS.length);
    for (const p of PERMISSIONS) {
      expect(PERMISSION_KEYS).toContain(p.key);
    }
  });
});
