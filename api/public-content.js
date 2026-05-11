const { getContent } = require("./_storage");
const { applyCors, handleOptions } = require("./_cors");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) {
    return;
  }

  applyCors(req, res);

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const content = await getContent();
  return res.status(200).json({ content });
};
