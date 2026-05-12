import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, packagesTable } from "@workspace/db";
import {
  CreatePackageBody,
  UpdatePackageBody,
  GetPackageParams,
  UpdatePackageParams,
  DeletePackageParams,
  ListPackagesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const parsePackage = (pkg: typeof packagesTable.$inferSelect) => ({
  ...pkg,
  price: parseFloat(pkg.price),
  serviceIds: pkg.serviceIds ?? [],
});

router.get("/packages", async (req, res): Promise<void> => {
  const query = ListPackagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { tenantId } = query.data;
  const pkgs = await db
    .select()
    .from(packagesTable)
    .where(tenantId ? eq(packagesTable.tenantId, tenantId) : undefined)
    .orderBy(packagesTable.name);
  res.json(pkgs.map(parsePackage));
});

router.post("/packages", async (req, res): Promise<void> => {
  const parsed = CreatePackageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [pkg] = await db.insert(packagesTable).values({ ...parsed.data, price: String(parsed.data.price), serviceIds: parsed.data.serviceIds ?? [] }).returning();
  res.status(201).json(parsePackage(pkg));
});

router.get("/packages/:id", async (req, res): Promise<void> => {
  const params = GetPackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, params.data.id));
  if (!pkg) {
    res.status(404).json({ error: "Package not found" });
    return;
  }
  res.json(parsePackage(pkg));
});

router.patch("/packages/:id", async (req, res): Promise<void> => {
  const params = UpdatePackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePackageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.price !== undefined) updateData.price = String(parsed.data.price);
  const [pkg] = await db.update(packagesTable).set(updateData).where(eq(packagesTable.id, params.data.id)).returning();
  if (!pkg) {
    res.status(404).json({ error: "Package not found" });
    return;
  }
  res.json(parsePackage(pkg));
});

router.delete("/packages/:id", async (req, res): Promise<void> => {
  const params = DeletePackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [pkg] = await db.delete(packagesTable).where(eq(packagesTable.id, params.data.id)).returning();
  if (!pkg) {
    res.status(404).json({ error: "Package not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
