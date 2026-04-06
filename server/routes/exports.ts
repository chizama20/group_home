import { FastifyInstance, FastifyReply } from 'fastify';
import { RowDataPacket } from 'mysql2';
import PDFDocument from 'pdfkit';
import { success, failure } from '../utils/response';
import { managerOrAbove } from '../middleware/rbac';

interface CsvExportBody {
  type: 'incidents' | 'ipos' | 'medications';
  home_id?: string;
  date_from?: string;
  date_to?: string;
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(values: unknown[]): string {
  return values.map(escapeCsv).join(',');
}

interface MARQuery        { resident_id: string; date_from: string; date_to: string; }
interface IposQuery       { home_id?: string; resident_id?: string; date_from?: string; date_to?: string; }
interface IncidentQuery   { home_id?: string; date_from?: string; date_to?: string; }
interface BehavioralQuery { home_id?: string; resident_id?: string; date_from?: string; date_to?: string; }

function startPDF(reply: FastifyReply, filename: string): InstanceType<typeof PDFDocument> {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  reply.header('Content-Type', 'application/pdf');
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(reply.raw);
  return doc;
}

function sectionHeader(doc: InstanceType<typeof PDFDocument>, text: string) {
  doc.fontSize(14).font('Helvetica-Bold').text(text, { underline: true });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(10);
}

function row(doc: InstanceType<typeof PDFDocument>, label: string, value: string | null | undefined) {
  doc.text(`${label}: ${value ?? '—'}`);
}

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── GET /exports/mar — Medication Administration Record PDF ───────────────
  fastify.get<{ Querystring: MARQuery }>(
    '/mar',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id } = request.user;
      const { resident_id, date_from, date_to } = request.query;

      if (!resident_id || !date_from || !date_to)
        return reply.code(400).send(failure('MISSING_FIELDS', 'resident_id, date_from, and date_to are required'));

      const [residents] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT r.* FROM residents r
         JOIN homes h ON r.home_id = h.id
         WHERE r.id = ? AND h.org_id = ?`,
        [resident_id, org_id]
      );
      if (!residents[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const resident = residents[0];

      const [logs] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT ml.*, m.name as med_name, m.dosage, m.frequency, m.scheduled_time,
                u.first_name as admin_first, u.last_name as admin_last
         FROM medication_logs ml
         JOIN medications m ON ml.medication_id = m.id
         JOIN users u ON ml.administered_by = u.id
         WHERE ml.resident_id = ?
           AND DATE(ml.administered_at) >= ? AND DATE(ml.administered_at) <= ?
         ORDER BY ml.administered_at`,
        [resident_id, date_from, date_to]
      );

      const doc = startPDF(reply, `MAR_${resident.last_name}_${date_from}_${date_to}.pdf`);
      doc.fontSize(18).font('Helvetica-Bold').text('Medication Administration Record', { align: 'center' });
      doc.moveDown();
      sectionHeader(doc, 'Resident');
      row(doc, 'Name', `${resident.first_name} ${resident.last_name}`);
      row(doc, 'DOB', resident.date_of_birth);
      row(doc, 'Period', `${date_from} to ${date_to}`);
      doc.moveDown();
      sectionHeader(doc, 'Administration Log');

      if (logs.length === 0) {
        doc.text('No records found for this period.');
      } else {
        for (const log of logs) {
          doc.text(`${new Date(log.administered_at).toLocaleString()}  |  ${log.med_name} ${log.dosage}  |  ${log.outcome}  |  By: ${log.admin_first} ${log.admin_last}${log.notes ? `  |  Notes: ${log.notes}` : ''}`);
        }
      }

      doc.end();
      return reply;
    }
  );

  // ── GET /exports/ipos — IPOS Report PDF ───────────────────────────────────
  fastify.get<{ Querystring: IposQuery }>(
    '/ipos',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id } = request.user;
      const { home_id, resident_id, date_from, date_to } = request.query;

      const filters: string[] = ['h.org_id = ?'];
      const values: string[] = [org_id];
      if (home_id)     { filters.push('il.home_id = ?');     values.push(home_id); }
      if (resident_id) { filters.push('il.resident_id = ?'); values.push(resident_id); }
      if (date_from)   { filters.push('il.log_date >= ?');   values.push(date_from); }
      if (date_to)     { filters.push('il.log_date <= ?');   values.push(date_to); }

      const [logs] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT il.*, r.first_name as res_first, r.last_name as res_last,
                u.first_name as staff_first, u.last_name as staff_last, h.name as home_name
         FROM ipos_logs il
         JOIN residents r ON il.resident_id = r.id
         JOIN homes h ON il.home_id = h.id
         JOIN users u ON il.user_id = u.id
         WHERE ${filters.join(' AND ')}
         ORDER BY il.log_date DESC, r.last_name`,
        values
      );

      const doc = startPDF(reply, `IPOS_Report_${date_from ?? 'all'}_${date_to ?? 'all'}.pdf`);
      doc.fontSize(18).font('Helvetica-Bold').text('IPOS Log Report', { align: 'center' });
      doc.moveDown();

      if (logs.length === 0) {
        doc.fontSize(10).font('Helvetica').text('No records found.');
      } else {
        for (const log of logs) {
          sectionHeader(doc, `${log.res_first} ${log.res_last} — ${log.log_date} (${log.shift})`);
          row(doc, 'Home', log.home_name);
          row(doc, 'Logged by', `${log.staff_first} ${log.staff_last}`);
          doc.text(log.content, { indent: 20 });
          doc.moveDown();
        }
      }

      doc.end();
      return reply;
    }
  );

  // ── GET /exports/incidents — Incident Report PDF ──────────────────────────
  fastify.get<{ Querystring: IncidentQuery }>(
    '/incidents',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id } = request.user;
      const { home_id, date_from, date_to } = request.query;

      const filters: string[] = ['h.org_id = ?'];
      const values: string[] = [org_id];
      if (home_id)   { filters.push('i.home_id = ?');                   values.push(home_id); }
      if (date_from) { filters.push('DATE(i.created_at) >= ?');         values.push(date_from); }
      if (date_to)   { filters.push('DATE(i.created_at) <= ?');         values.push(date_to); }

      const [incidents] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT i.*, r.first_name as res_first, r.last_name as res_last,
                u.first_name as reporter_first, u.last_name as reporter_last, h.name as home_name
         FROM incidents i
         JOIN residents r ON i.resident_id = r.id
         JOIN homes h ON i.home_id = h.id
         JOIN users u ON i.reported_by = u.id
         WHERE ${filters.join(' AND ')}
         ORDER BY i.created_at DESC`,
        values
      );

      const doc = startPDF(reply, `Incident_Report_${date_from ?? 'all'}_${date_to ?? 'all'}.pdf`);
      doc.fontSize(18).font('Helvetica-Bold').text('Incident Report', { align: 'center' });
      doc.moveDown();

      if (incidents.length === 0) {
        doc.fontSize(10).font('Helvetica').text('No incidents found.');
      } else {
        for (const inc of incidents) {
          sectionHeader(doc, `${inc.title} — ${new Date(inc.created_at).toLocaleDateString()}`);
          row(doc, 'Home', inc.home_name);
          row(doc, 'Resident', `${inc.res_first} ${inc.res_last}`);
          row(doc, 'Reported by', `${inc.reporter_first} ${inc.reporter_last}`);
          row(doc, 'Status', inc.status);
          doc.text('Description:', { indent: 0 });
          doc.text(inc.description, { indent: 20 });
          doc.moveDown();
        }
      }

      doc.end();
      return reply;
    }
  );

  // ── GET /exports/behavioral — Behavioral Log Report PDF ───────────────────
  fastify.get<{ Querystring: BehavioralQuery }>(
    '/behavioral',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id } = request.user;
      const { home_id, resident_id, date_from, date_to } = request.query;

      const filters: string[] = ['h.org_id = ?'];
      const values: string[] = [org_id];
      if (home_id)     { filters.push('r.home_id = ?');               values.push(home_id); }
      if (resident_id) { filters.push('bl.resident_id = ?');          values.push(resident_id); }
      if (date_from)   { filters.push('DATE(bl.occurred_at) >= ?');   values.push(date_from); }
      if (date_to)     { filters.push('DATE(bl.occurred_at) <= ?');   values.push(date_to); }

      const [logs] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT bl.*, tb.name as behavior_name,
                r.first_name as res_first, r.last_name as res_last,
                u.first_name as staff_first, u.last_name as staff_last, h.name as home_name
         FROM behavioral_logs bl
         JOIN tracked_behaviors tb ON bl.behavior_id = tb.id
         JOIN residents r ON bl.resident_id = r.id
         JOIN homes h ON r.home_id = h.id
         JOIN users u ON bl.user_id = u.id
         WHERE ${filters.join(' AND ')}
         ORDER BY bl.occurred_at DESC`,
        values
      );

      const doc = startPDF(reply, `Behavioral_Report_${date_from ?? 'all'}_${date_to ?? 'all'}.pdf`);
      doc.fontSize(18).font('Helvetica-Bold').text('Behavioral Log Report', { align: 'center' });
      doc.moveDown();

      if (logs.length === 0) {
        doc.fontSize(10).font('Helvetica').text('No behavioral logs found.');
      } else {
        for (const log of logs) {
          doc.fontSize(10).font('Helvetica');
          doc.text(
            `${new Date(log.occurred_at).toLocaleString()}  |  ${log.res_first} ${log.res_last}  |  ${log.behavior_name}  |  By: ${log.staff_first} ${log.staff_last}${log.notes ? `  |  ${log.notes}` : ''}`
          );
        }
      }

      doc.end();
      return reply;
    }
  );

  // ── POST /exports/csv — CSV export for incidents, ipos, or medications ─────
  fastify.post<{ Body: CsvExportBody }>(
    '/csv',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id } = request.user;
      const { type, home_id, date_from, date_to } = request.body;

      if (!type || !['incidents', 'ipos', 'medications'].includes(type))
        return reply.code(400).send(failure('INVALID_TYPE', 'type must be incidents, ipos, or medications'));

      // Validate home_id belongs to org if provided
      if (home_id) {
        const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
          'SELECT id FROM homes WHERE id = ? AND org_id = ?', [home_id, org_id]
        );
        if (!homeCheck[0])
          return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      }

      let csvContent = '';
      const filename = `${type}_export_${new Date().toISOString().slice(0, 10)}.csv`;

      if (type === 'incidents') {
        const filters: string[] = ['h.org_id = ?'];
        const values: string[] = [org_id];
        if (home_id)   { filters.push('i.home_id = ?');           values.push(home_id); }
        if (date_from) { filters.push('DATE(i.created_at) >= ?'); values.push(date_from); }
        if (date_to)   { filters.push('DATE(i.created_at) <= ?'); values.push(date_to); }

        const [rows] = await fastify.db.execute<RowDataPacket[]>(
          `SELECT i.id, i.title, i.description, i.incident_type, i.severity, i.status,
                  i.occurred_at, i.created_at,
                  h.name as home_name,
                  r.first_name as resident_first, r.last_name as resident_last,
                  u.first_name as reporter_first, u.last_name as reporter_last
           FROM incidents i
           JOIN homes h ON i.home_id = h.id
           JOIN residents r ON i.resident_id = r.id
           JOIN users u ON i.reported_by = u.id
           WHERE ${filters.join(' AND ')}
           ORDER BY i.created_at DESC`,
          values
        );

        csvContent = toCsvRow(['ID', 'Title', 'Description', 'Type', 'Severity', 'Status', 'Occurred At', 'Created At', 'Home', 'Resident', 'Reporter']) + '\n';
        for (const row of rows) {
          csvContent += toCsvRow([
            row.id, row.title, row.description, row.incident_type, row.severity, row.status,
            row.occurred_at, row.created_at, row.home_name,
            `${row.resident_first} ${row.resident_last}`,
            `${row.reporter_first} ${row.reporter_last}`
          ]) + '\n';
        }
      } else if (type === 'ipos') {
        const filters: string[] = ['h.org_id = ?'];
        const values: string[] = [org_id];
        if (home_id)   { filters.push('il.home_id = ?');    values.push(home_id); }
        if (date_from) { filters.push('il.log_date >= ?');  values.push(date_from); }
        if (date_to)   { filters.push('il.log_date <= ?');  values.push(date_to); }

        const [rows] = await fastify.db.execute<RowDataPacket[]>(
          `SELECT il.id, il.log_date, il.shift, il.content, il.created_at,
                  h.name as home_name,
                  r.first_name as resident_first, r.last_name as resident_last,
                  u.first_name as staff_first, u.last_name as staff_last
           FROM ipos_logs il
           JOIN homes h ON il.home_id = h.id
           JOIN residents r ON il.resident_id = r.id
           JOIN users u ON il.user_id = u.id
           WHERE ${filters.join(' AND ')}
           ORDER BY il.log_date DESC`,
          values
        );

        csvContent = toCsvRow(['ID', 'Log Date', 'Shift', 'Content', 'Created At', 'Home', 'Resident', 'Staff']) + '\n';
        for (const row of rows) {
          csvContent += toCsvRow([
            row.id, row.log_date, row.shift, row.content, row.created_at, row.home_name,
            `${row.resident_first} ${row.resident_last}`,
            `${row.staff_first} ${row.staff_last}`
          ]) + '\n';
        }
      } else if (type === 'medications') {
        const filters: string[] = ['h.org_id = ?'];
        const values: string[] = [org_id];
        if (home_id) { filters.push('r.home_id = ?'); values.push(home_id); }

        const [rows] = await fastify.db.execute<RowDataPacket[]>(
          `SELECT m.id, m.name, m.dosage, m.frequency, m.route, m.scheduled_time,
                  m.instructions, m.is_active, m.created_at,
                  h.name as home_name,
                  r.first_name as resident_first, r.last_name as resident_last
           FROM medications m
           JOIN residents r ON m.resident_id = r.id
           JOIN homes h ON r.home_id = h.id
           WHERE ${filters.join(' AND ')}
           ORDER BY r.last_name, r.first_name, m.name`,
          values
        );

        csvContent = toCsvRow(['ID', 'Name', 'Dosage', 'Frequency', 'Route', 'Scheduled Time', 'Instructions', 'Active', 'Created At', 'Home', 'Resident']) + '\n';
        for (const row of rows) {
          csvContent += toCsvRow([
            row.id, row.name, row.dosage, row.frequency, row.route, row.scheduled_time,
            row.instructions, row.is_active ? 'Yes' : 'No', row.created_at, row.home_name,
            `${row.resident_first} ${row.resident_last}`
          ]) + '\n';
        }
      }

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.send(csvContent);
    }
  );
};
