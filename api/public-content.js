const { getContent } = require("./_storage");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const content = await getContent();
  return res.status(200).json({ content });
};
