import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, messageTemplatesTable } from "@workspace/db";
import {
  CreateMessageTemplateBody,
  UpdateMessageTemplateBody,
  GetMessageTemplateParams,
  UpdateMessageTemplateParams,
  DeleteMessageTemplateParams,
  ListMessageTemplatesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/message-templates", async (req, res): Promise<void> => {
  const query = ListMessageTemplatesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { tenantId } = query.data;
  const templates = await db
    .select()
    .from(messageTemplatesTable)
    .where(tenantId ? eq(messageTemplatesTable.tenantId, tenantId) : undefined)
    .orderBy(messageTemplatesTable.name);
  res.json(templates);
});

router.post("/message-templates", async (req, res): Promise<void> => {
  const parsed = CreateMessageTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [template] = await db.insert(messageTemplatesTable).values(parsed.data).returning();
  res.status(201).json(template);
});

router.get("/message-templates/:id", async (req, res): Promise<void> => {
  const params = GetMessageTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [template] = await db.select().from(messageTemplatesTable).where(eq(messageTemplatesTable.id, params.data.id));
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json(template);
});

router.patch("/message-templates/:id", async (req, res): Promise<void> => {
  const params = UpdateMessageTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMessageTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [template] = await db.update(messageTemplatesTable).set(parsed.data).where(eq(messageTemplatesTable.id, params.data.id)).returning();
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json(template);
});

router.delete("/message-templates/:id", async (req, res): Promise<void> => {
  const params = DeleteMessageTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [template] = await db.delete(messageTemplatesTable).where(eq(messageTemplatesTable.id, params.data.id)).returning();
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
