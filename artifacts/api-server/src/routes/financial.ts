import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, financialEntriesTable } from "@workspace/db";
import type { FinancialType } from "@workspace/db";
import {
  CreateFinancialEntryBody,
  UpdateFinancialEntryBody,
  GetFinancialEntryParams,
  UpdateFinancialEntryParams,
  DeleteFinancialEntryParams,
  ListFinancialEntriesQueryParams,
  GetFinancialSummaryQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const parseEntry = (e: typeof financialEntriesTable.$inferSelect) => ({
  ...e,
  amount: parseFloat(e.amount),
});

router.get("/financial-entries/summary", async (req, res): Promise<void> => {
  const raw = req.query as Record<string, string>;
  const tenantId = raw.tenantId ? Number(raw.tenantId) : undefined;
  const startDate = raw.startDate || undefined;
  const endDate = raw.endDate || undefined;

  const conditions = [];
  if (tenantId) conditions.push(eq(financialEntriesTable.tenantId, tenantId));
  if (startDate) conditions.push(gte(financialEntriesTable.date, startDate.substring(0, 10)));
  if (endDate) conditions.push(lte(financialEntriesTable.date, endDate.substring(0, 10)));

  const entries = await db
    .select()
    .from(financialEntriesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const parsed = entries.map(parseEntry);
  const totalReceitas = parsed.filter(e => e.type === "receita").reduce((s, e) => s + e.amount, 0);
  const totalDespesas = parsed.filter(e => e.type === "despesa").reduce((s, e) => s + e.amount, 0);
  const totalDespesasFixas = parsed.filter(e => e.type === "despesa_fixa").reduce((s, e) => s + e.amount, 0);

  // Group by month
  const byMonthMap: Record<string, { receitas: number; despesas: number }> = {};
  for (const e of parsed) {
    const month = e.date.substring(0, 7); // YYYY-MM
    if (!byMonthMap[month]) byMonthMap[month] = { receitas: 0, despesas: 0 };
    if (e.type === "receita") byMonthMap[month].receitas += e.amount;
    else byMonthMap[month].despesas += e.amount;
  }
  const byMonth = Object.entries(byMonthMap).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({
    month,
    receitas: v.receitas,
    despesas: v.despesas,
    saldo: v.receitas - v.despesas,
  }));

  res.json({
    totalReceitas,
    totalDespesas,
    totalDespesasFixas,
    saldo: totalReceitas - totalDespesas - totalDespesasFixas,
    byMonth,
  });
});

router.get("/financial-entries", async (req, res): Promise<void> => {
  const raw = req.query as Record<string, string>;
  const tenantId = raw.tenantId ? Number(raw.tenantId) : undefined;
  const type = (raw.type as FinancialType) || undefined;
  const startDate = raw.startDate || undefined;
  const endDate = raw.endDate || undefined;

  const conditions = [];
  if (tenantId) conditions.push(eq(financialEntriesTable.tenantId, tenantId));
  if (type) conditions.push(eq(financialEntriesTable.type, type));
  if (startDate) conditions.push(gte(financialEntriesTable.date, startDate.substring(0, 10)));
  if (endDate) conditions.push(lte(financialEntriesTable.date, endDate.substring(0, 10)));

  const entries = await db
    .select()
    .from(financialEntriesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(financialEntriesTable.date);

  res.json(entries.map(parseEntry));
});

router.post("/financial-entries", async (req, res): Promise<void> => {
  const parsed = CreateFinancialEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const dateStr = typeof parsed.data.date === "string" ? parsed.data.date : (parsed.data.date as Date).toISOString().substring(0, 10);
  const [entry] = await db.insert(financialEntriesTable).values({ ...parsed.data, date: dateStr, amount: String(parsed.data.amount) }).returning();
  res.status(201).json(parseEntry(entry));
});

router.get("/financial-entries/:id", async (req, res): Promise<void> => {
  const params = GetFinancialEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [entry] = await db.select().from(financialEntriesTable).where(eq(financialEntriesTable.id, params.data.id));
  if (!entry) {
    res.status(404).json({ error: "Financial entry not found" });
    return;
  }
  res.json(parseEntry(entry));
});

router.patch("/financial-entries/:id", async (req, res): Promise<void> => {
  const params = UpdateFinancialEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateFinancialEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.amount !== undefined) updateData.amount = String(parsed.data.amount);
  const [entry] = await db.update(financialEntriesTable).set(updateData).where(eq(financialEntriesTable.id, params.data.id)).returning();
  if (!entry) {
    res.status(404).json({ error: "Financial entry not found" });
    return;
  }
  res.json(parseEntry(entry));
});

router.delete("/financial-entries/:id", async (req, res): Promise<void> => {
  const params = DeleteFinancialEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [entry] = await db.delete(financialEntriesTable).where(eq(financialEntriesTable.id, params.data.id)).returning();
  if (!entry) {
    res.status(404).json({ error: "Financial entry not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
