const { safeEqual, sessionCookie } = require("./_auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const data = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword || !process.env.ADMIN_SESSION_SECRET) {
    console.error("Admin credentials are not configured");
    return res.status(500).json({ error: "Admin login is not configured yet" });
  }

  if (!safeEqual(data.username || "", expectedUsername) || !safeEqual(data.password || "", expectedPassword)) {
    return res.status(401).json({ error: "Incorrect username or password" });
  }

  res.setHeader("Set-Cookie", sessionCookie());
  return res.status(200).json({ ok: true });
};
