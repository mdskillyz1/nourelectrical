const { isAuthed } = require("./_auth");
const { noStore } = require("./_headers");

module.exports = async function handler(req, res) {
  noStore(res);
  return res.status(200).json({ authenticated: isAuthed(req) });
};
