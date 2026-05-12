// Vercel setup:
// 1. Deploy this project through Vercel from GitHub or the Vercel CLI.
// 2. In Vercel, add RESEND_API_KEY under Project Settings > Environment Variables.
// 3. Optional: add RESEND_FROM, for example "Nour Electrical <hello@nourelectricals.com>" after verifying the domain in Resend.

const { addSubmission } = require("./_storage");
const { applyCors, handleOptions } = require("./_cors");
const { noStore } = require("./_headers");

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

module.exports = async function handler(req, res) {
  noStore(res);

  if (handleOptions(req, res)) {
    return;
  }

  applyCors(req, res);
  console.log("send-email API invoked", { method: req.method });

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return res.status(500).json({ error: "Email service is not configured" });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const data = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const formType = sanitize(data.formType || "quote");
    const email = sanitize(data.email || "").toLowerCase();

    if (!isEmail(email)) {
      return res.status(400).json({ error: "A valid email address is required" });
    }

    if (formType === "quote" && (!sanitize(data.name) || !sanitize(data.message))) {
      return res.status(400).json({ error: "Name and message are required" });
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
      .filter(([, value]) => value)
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
      return res.status(502).json({ error: "Email could not be sent" });
    }

    try {
      await addSubmission({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        type: formType === "newsletter" ? "newsletter" : "quote",
        status: formType === "newsletter" ? "subscribed" : "pending",
        createdAt: new Date().toISOString(),
        name: sanitize(data.name || ""),
        email,
        phone: sanitize(data.phone || ""),
        postcode: sanitize(data.postcode || ""),
        service: sanitize(data.service || ""),
        message: sanitize(data.message || "")
      });
    } catch (storageError) {
      console.error("Submission storage failed", storageError);
    }

    console.log("Email sent successfully", { id: result.data && result.data.id, formType });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Unhandled send-email error", error);
    return res.status(500).json({ error: "Unexpected server error" });
  }
};
