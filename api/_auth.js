const crypto = require("crypto");

const COOKIE_NAME = "nour_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

const parseCookies = (cookieHeader = "") =>
  cookieHeader.split(";").reduce((cookies, part) => {
    const [key, ...value] = part.trim().split("=");
    if (key) {
      cookies[key] = decodeURIComponent(value.join("="));
    }
    return cookies;
  }, {});

const getSecret = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "change-this-admin-secret";

const sign = (payload) =>
  crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");

const createSessionValue = () => {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + SESSION_TTL_MS, nonce: crypto.randomBytes(16).toString("hex") })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
};

const verifySessionValue = (value = "") => {
  const [payload, signature] = value.split(".");
  if (!payload || !signature || sign(payload) !== signature) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.exp && session.exp > Date.now();
  } catch {
    return false;
  }
};

const isAuthed = (req) => {
  const cookies = parseCookies(req.headers.cookie || "");
  return verifySessionValue(cookies[COOKIE_NAME]);
};

const requireAdmin = (req, res) => {
  if (!isAuthed(req)) {
    res.status(401).json({ error: "Admin login required" });
    return false;
  }
  return true;
};

const sessionCookie = () =>
  `${COOKIE_NAME}=${encodeURIComponent(createSessionValue())}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${
    SESSION_TTL_MS / 1000
  }`;

const clearSessionCookie = () =>
  `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

const safeEqual = (a = "", b = "") => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

module.exports = {
  clearSessionCookie,
  isAuthed,
  requireAdmin,
  safeEqual,
  sessionCookie
};
