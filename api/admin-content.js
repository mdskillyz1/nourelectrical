const { requireAdmin } = require("./_auth");
const { getContent, saveContent } = require("./_storage");

const clean = (value = "") => String(value).replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 2000);

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  if (req.method === "GET") {
    return res.status(200).json({ content: await getContent() });
  }

  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const current = await getContent();
    const next = {
      ...current,
      businessName: clean(data.businessName || current.businessName),
      phoneDisplay: clean(data.phoneDisplay || current.phoneDisplay),
      phoneHref: clean(data.phoneHref || current.phoneHref),
      email: clean(data.email || current.email),
      address: clean(data.address || current.address),
      openingHours: clean(data.openingHours || current.openingHours),
      whatsappHref: clean(data.whatsappHref || current.whatsappHref),
      googleReviewsHref: clean(data.googleReviewsHref || current.googleReviewsHref),
      facebookHref: clean(data.facebookHref || current.facebookHref),
      instagramHref: clean(data.instagramHref || current.instagramHref),
      footerTagline: clean(data.footerTagline || current.footerTagline),
      services: {
        ...current.services,
        emergency: clean(data.services?.emergency || current.services.emergency),
        eicr: clean(data.services?.eicr || current.services.eicr),
        consumerUnit: clean(data.services?.consumerUnit || current.services.consumerUnit),
        rewiring: clean(data.services?.rewiring || current.services.rewiring),
        sockets: clean(data.services?.sockets || current.services.sockets),
        lighting: clean(data.services?.lighting || current.services.lighting)
      },
      keyText: {
        ...current.keyText,
        heroHeadline: clean(data.keyText?.heroHeadline || current.keyText.heroHeadline),
        heroIntro: clean(data.keyText?.heroIntro || current.keyText.heroIntro),
        quoteHeading: clean(data.keyText?.quoteHeading || current.keyText.quoteHeading),
        quoteIntro: clean(data.keyText?.quoteIntro || current.keyText.quoteIntro)
      }
    };

    await saveContent(next);
    return res.status(200).json({ ok: true, content: next });
  } catch (error) {
    console.error("Content save failed", error);
    return res.status(500).json({ error: "Could not save website content" });
  }
};
