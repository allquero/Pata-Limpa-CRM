import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, clientsTable, appointmentsTable, petsTable } from "@workspace/db";
import { ListLeadsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/leads", async (req, res): Promise<void> => {
  const query = ListLeadsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { tenantId, minDaysSince } = query.data;

  const clients = await db
    .select()
    .from(clientsTable)
    .where(tenantId ? eq(clientsTable.tenantId, tenantId) : undefined);

  const leads = await Promise.all(clients.map(async (client) => {
    const appointments = await db
      .select()
      .from(appointmentsTable)
      .where(eq(appointmentsTable.clientId, client.id))
      .orderBy(desc(appointmentsTable.scheduledDate));

    const pets = await db
      .select()
      .from(petsTable)
      .where(eq(petsTable.clientId, client.id));

    const lastAppt = appointments[0];
    let daysSince: number | null = null;
    if (lastAppt) {
      const diff = Date.now() - new Date(lastAppt.scheduledDate).getTime();
      daysSince = Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    return {
      clientId: client.id,
      clientName: client.name,
      phone: client.phone,
      daysSinceLastAppointment: daysSince,
      lastAppointmentDate: lastAppt ? lastAppt.scheduledDate.toISOString() : null,
      totalAppointments: appointments.length,
      pets: pets.map(p => ({ id: p.id, name: p.name, size: p.size })),
    };
  }));

  const filtered = minDaysSince
    ? leads.filter(l => l.daysSinceLastAppointment === null || l.daysSinceLastAppointment >= minDaysSince)
    : leads;

  filtered.sort((a, b) => {
    if (a.daysSinceLastAppointment === null) return -1;
    if (b.daysSinceLastAppointment === null) return 1;
    return b.daysSinceLastAppointment - a.daysSinceLastAppointment;
  });

  res.json(filtered);
});

export default router;
