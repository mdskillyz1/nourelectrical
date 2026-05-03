// Netlify setup:
// 1. Deploy this project from GitHub or Netlify CLI. Netlify Drop does not support building functions reliably.
// 2. In Netlify, add RESEND_API_KEY under Site configuration > Environment variables.
// 3. Optional: add RESEND_FROM, for example "Nour Electrical <hello@nourelectricals.com>" after verifying the domain in Resend.

const recipients = ["nourelectricals@gmail.com", "demmvisuals@gmail.com"];

const sanitize = (value = "") =>
  String(value)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 2000);

const escapeHtml = (value = "") =>
  sanitize(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const isEmail = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  console.log("send-email function invoked", { method: event.httpMethod });

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return json(500, { error: "Email service is not configured" });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const data = JSON.parse(event.body || "{}");
    const formType = sanitize(data.formType || "quote");
    const email = sanitize(data.email || "").toLowerCase();

    if (!isEmail(email)) {
      return json(400, { error: "A valid email address is required" });
    }

    if (formType === "quote" && (!sanitize(data.name) || !sanitize(data.message))) {
      return json(400, { error: "Name and message are required" });
    }

    const subject =
      formType === "newsletter"
        ? "New Nour Electrical newsletter signup"
        : "New Nour Electrical quote request";

    const fields = Object.entries(data)
      .filter(([key, value]) => value && key !== "formType")
      .map(
        ([key, value]) =>
          `<tr><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">${escapeHtml(key)}</th><td style="padding:8px;border-bottom:1px solid #ddd;">${escapeHtml(value)}</td></tr>`
      )
      .join("");

    const text = Object.entries(data)
      .filter(([key, value]) => value)
      .map(([key, value]) => `${key}: ${sanitize(value)}`)
      .join("\n");

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM || "Nour Electrical <onboarding@resend.dev>",
      to: recipients,
      replyTo: email,
      subject,
      html: `
        <div style="font-family:Arial,sans-serif;color:#17202a;">
          <h2>${escapeHtml(subject)}</h2>
          <p>A customer submitted the ${escapeHtml(formType)} form on the Nour Electrical website.</p>
          <table style="border-collapse:collapse;width:100%;max-width:680px;">${fields}</table>
        </div>
      `,
      text,
    });

    if (result.error) {
      console.error("Resend send failed", result.error);
      return json(502, { error: "Email could not be sent" });
    }

    console.log("Email sent successfully", { id: result.data && result.data.id, formType });
    return json(200, { ok: true });
  } catch (error) {
    console.error("Unhandled send-email error", error);
    return json(500, { error: "Unexpected server error" });
  }
};
