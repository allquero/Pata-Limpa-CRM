import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tenantsTable } from "@workspace/db";
import {
  CreateTenantBody,
  UpdateTenantBody,
  GetTenantParams,
  UpdateTenantParams,
  DeleteTenantParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tenants", async (_req, res): Promise<void> => {
  const tenants = await db.select().from(tenantsTable).orderBy(tenantsTable.createdAt);
  res.json(tenants);
});

router.post("/tenants", async (req, res): Promise<void> => {
  const parsed = CreateTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [tenant] = await db.insert(tenantsTable).values(parsed.data).returning();
  res.status(201).json(tenant);
});

router.get("/tenants/:id", async (req, res): Promise<void> => {
  const params = GetTenantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, params.data.id));
  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }
  res.json(tenant);
});

router.patch("/tenants/:id", async (req, res): Promise<void> => {
  const params = UpdateTenantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [tenant] = await db.update(tenantsTable).set(parsed.data).where(eq(tenantsTable.id, params.data.id)).returning();
  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }
  res.json(tenant);
});

router.delete("/tenants/:id", async (req, res): Promise<void> => {
  const params = DeleteTenantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [tenant] = await db.delete(tenantsTable).where(eq(tenantsTable.id, params.data.id)).returning();
  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
