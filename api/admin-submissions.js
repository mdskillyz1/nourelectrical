const { requireAdmin } = require("./_auth");
const { getSubmissions, saveSubmissions } = require("./_storage");

const toCsv = (rows) => {
  const headers = ["id", "type", "status", "createdAt", "name", "email", "phone", "postcode", "service", "message"];
  const escapeCell = (value = "") => `"${String(value).replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(","))].join("\n");
};

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  try {
    const submissions = await getSubmissions();

    if (req.method === "GET") {
      const type = req.query.type;
      const q = String(req.query.q || "").toLowerCase();
      const rows = submissions.filter((item) => {
        const typeMatch = !type || item.type === type;
        const queryMatch =
          !q || JSON.stringify(item).toLowerCase().includes(q);
        return typeMatch && queryMatch;
      });

      if (req.query.format === "csv") {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=nour-electrical-submissions.csv");
        return res.status(200).send(toCsv(rows));
      }

      return res.status(200).json({ submissions: rows });
    }

    if (req.method === "PATCH") {
      const data = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const allowed = ["pending", "contacted", "completed", "cancelled"];
      if (!allowed.includes(data.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const next = submissions.map((item) =>
        item.id === data.id ? { ...item, status: data.status, updatedAt: new Date().toISOString() } : item
      );
      await saveSubmissions(next);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      const next = submissions.filter((item) => item.id !== id);
      await saveSubmissions(next);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Submission admin action failed", error);
    return res.status(500).json({ error: "Could not load submissions" });
  }
};
