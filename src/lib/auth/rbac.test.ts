import { describe, it, expect } from "vitest";
import { checkAdminRole } from "./rbac";

/**
 * Proves that the guard used by every /api/admin/** handler enforces RBAC.
 *
 * Endpoints that would return 403 for a USER caller:
 *   POST /api/admin/evaluations
 *   POST /api/admin/evaluations/[id]/questions
 *   GET  /api/admin/users/:id/attempts
 *   GET  /api/admin/attempts/:id
 *   (all other /api/admin/** routes)
 *
 * Each of those handlers starts with:
 *   const admin = await requireAdmin();
 *   if (isResponse(admin)) return admin;   // ← 403 exits here
 *
 * requireAdmin() delegates the role check to checkAdminRole(), tested below.
 */
describe("checkAdminRole — server-side RBAC enforcement", () => {
  it("returns 401 when role is null (unauthenticated)", () => {
    const result = checkAdminRole(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("returns 401 when role is undefined (missing payload)", () => {
    const result = checkAdminRole(undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("returns 403 when caller has role USER — blocks all admin endpoints", () => {
    const result = checkAdminRole("USER");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("returns ok:true when caller has role ADMIN", () => {
    const result = checkAdminRole("ADMIN");
    expect(result.ok).toBe(true);
  });

  it("returns 403 for any unknown role string", () => {
    const result = checkAdminRole("SUPERUSER");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });
});
