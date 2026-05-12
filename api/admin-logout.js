const { clearSessionCookie } = require("./_auth");
const { noStore } = require("./_headers");

module.exports = async function handler(req, res) {
  noStore(res);
  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.status(200).json({ ok: true });
};
