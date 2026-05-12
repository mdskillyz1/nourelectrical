const { requireAdmin } = require("./_auth");
const { getSubmissions, isStorageConfigured } = require("./_storage");
const { noStore } = require("./_headers");

const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

module.exports = async function handler(req, res) {
  noStore(res);

  if (!requireAdmin(req, res)) {
    return;
  }

  const submissions = await getSubmissions();
  const quoteRequests = submissions.filter((item) => item.type === "quote");
  const signups = submissions.filter((item) => item.type === "newsletter");
  const recentQuotes = quoteRequests.slice(0, 6);
  const recentEnquiries = submissions.slice(0, 8);
  const activity = {};

  submissions.forEach((item) => {
    const key = dayKey(item.createdAt || Date.now());
    activity[key] = activity[key] || { date: key, quote: 0, newsletter: 0 };
    activity[key][item.type] = (activity[key][item.type] || 0) + 1;
  });

  return res.status(200).json({
    storageConfigured: isStorageConfigured(),
    totals: {
      signups: signups.length,
      quotes: quoteRequests.length,
      pendingQuotes: quoteRequests.filter((item) => item.status === "pending").length,
      completedQuotes: quoteRequests.filter((item) => item.status === "completed").length
    },
    activity: Object.values(activity).sort((a, b) => a.date.localeCompare(b.date)).slice(-14),
    recentQuotes,
    recentEnquiries
  });
};
