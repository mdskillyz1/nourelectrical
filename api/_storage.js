const { defaultContent } = require("./_defaults");

const CONTENT_KEY = "nour-electrical/content.json";
const SUBMISSIONS_KEY = "nour-electrical/submissions.json";

const jsonResponse = (res, status, body) => {
  res.status(status).json(body);
};

const isStorageConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

async function getBlob(pathname) {
  if (!isStorageConfigured()) {
    return null;
  }

  const { list } = await import("@vercel/blob");
  const result = await list({ prefix: pathname, limit: 100 });
  return (result.blobs || []).find((blob) => blob.pathname === pathname) || null;
}

async function readJson(pathname, fallback) {
  try {
    const blob = await getBlob(pathname);
    if (!blob) {
      return fallback;
    }

    const response = await fetch(blob.downloadUrl || blob.url, { cache: "no-store" });
    if (!response.ok) {
      return fallback;
    }

    return await response.json();
  } catch (error) {
    console.error("Blob read failed", { pathname, error });
    return fallback;
  }
}

async function writeJson(pathname, value) {
  if (!isStorageConfigured()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }

  const { put } = await import("@vercel/blob");
  return put(pathname, JSON.stringify(value, null, 2), {
    access: "private",
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: "application/json"
  });
}

async function getContent() {
  const stored = await readJson(CONTENT_KEY, defaultContent);
  return {
    ...defaultContent,
    ...stored,
    services: { ...defaultContent.services, ...(stored.services || {}) },
    keyText: { ...defaultContent.keyText, ...(stored.keyText || {}) }
  };
}

async function saveContent(content) {
  return writeJson(CONTENT_KEY, content);
}

async function getSubmissions() {
  const submissions = await readJson(SUBMISSIONS_KEY, []);
  return Array.isArray(submissions) ? submissions : [];
}

async function saveSubmissions(submissions) {
  return writeJson(SUBMISSIONS_KEY, submissions);
}

async function addSubmission(submission) {
  const submissions = await getSubmissions();
  const next = [submission, ...submissions].slice(0, 2000);
  await saveSubmissions(next);
  return submission;
}

module.exports = {
  addSubmission,
  getContent,
  getSubmissions,
  isStorageConfigured,
  jsonResponse,
  saveContent,
  saveSubmissions
};
