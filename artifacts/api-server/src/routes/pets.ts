import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, petsTable, clientsTable } from "@workspace/db";
import {
  CreatePetBody,
  UpdatePetBody,
  GetPetParams,
  UpdatePetParams,
  DeletePetParams,
  ListPetsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/pets", async (req, res): Promise<void> => {
  const query = ListPetsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { clientId, tenantId } = query.data;

  if (clientId) {
    const pets = await db.select().from(petsTable).where(eq(petsTable.clientId, clientId)).orderBy(petsTable.name);
    res.json(pets);
    return;
  }

  if (tenantId) {
    const pets = await db
      .select({ id: petsTable.id, clientId: petsTable.clientId, name: petsTable.name, breed: petsTable.breed, size: petsTable.size, notes: petsTable.notes, createdAt: petsTable.createdAt, updatedAt: petsTable.updatedAt })
      .from(petsTable)
      .innerJoin(clientsTable, eq(petsTable.clientId, clientsTable.id))
      .where(eq(clientsTable.tenantId, tenantId))
      .orderBy(petsTable.name);
    res.json(pets);
    return;
  }

  const pets = await db.select().from(petsTable).orderBy(petsTable.name);
  res.json(pets);
});

router.post("/pets", async (req, res): Promise<void> => {
  const parsed = CreatePetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [pet] = await db.insert(petsTable).values(parsed.data).returning();
  res.status(201).json(pet);
});

router.get("/pets/:id", async (req, res): Promise<void> => {
  const params = GetPetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [pet] = await db.select().from(petsTable).where(eq(petsTable.id, params.data.id));
  if (!pet) {
    res.status(404).json({ error: "Pet not found" });
    return;
  }
  res.json(pet);
});

router.patch("/pets/:id", async (req, res): Promise<void> => {
  const params = UpdatePetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [pet] = await db.update(petsTable).set(parsed.data).where(eq(petsTable.id, params.data.id)).returning();
  if (!pet) {
    res.status(404).json({ error: "Pet not found" });
    return;
  }
  res.json(pet);
});

router.delete("/pets/:id", async (req, res): Promise<void> => {
  const params = DeletePetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [pet] = await db.delete(petsTable).where(eq(petsTable.id, params.data.id)).returning();
  if (!pet) {
    res.status(404).json({ error: "Pet not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
