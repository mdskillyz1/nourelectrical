const state = {
  content: null,
  submissions: []
};

const $ = (selector) => document.querySelector(selector);

const readPath = (source, path) =>
  path.split(".").reduce((value, key) => value && value[key], source);

const setPath = (target, path, value) => {
  const parts = path.split(".");
  let cursor = target;
  parts.slice(0, -1).forEach((part) => {
    cursor[part] = cursor[part] || {};
    cursor = cursor[part];
  });
  cursor[parts[parts.length - 1]] = value;
};

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
};

const formatDate = (value) =>
  value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "";

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const loadSummary = async () => {
  const data = await api("/api/admin-summary");
  $("#storageWarning").hidden = data.storageConfigured;
  $("#metricSignups").textContent = data.totals.signups;
  $("#metricQuotes").textContent = data.totals.quotes;
  $("#metricPending").textContent = data.totals.pendingQuotes;
  $("#metricCompleted").textContent = data.totals.completedQuotes;

  const max = Math.max(1, ...data.activity.map((item) => (item.quote || 0) + (item.newsletter || 0)));
  $("#activityChart").innerHTML =
    data.activity.length === 0
      ? "<p>No activity yet.</p>"
      : data.activity
          .map((item) => {
            const total = (item.quote || 0) + (item.newsletter || 0);
            const height = Math.max(8, Math.round((total / max) * 150));
            return `<div class="activity-bar"><span style="height:${height}px"></span><small>${item.date.slice(5)}</small><small>${total}</small></div>`;
          })
          .join("");
};

const loadSubmissions = async () => {
  const params = new URLSearchParams();
  const q = $("#submissionSearch").value.trim();
  const type = $("#submissionType").value;
  if (q) params.set("q", q);
  if (type) params.set("type", type);

  const data = await api(`/api/admin-submissions?${params}`);
  state.submissions = data.submissions;
  $("#submissionRows").innerHTML =
    state.submissions.length === 0
      ? '<tr><td colspan="6">No submissions yet.</td></tr>'
      : state.submissions
          .map(
            (item) => `
              <tr>
                <td>${escapeHtml(formatDate(item.createdAt))}</td>
                <td>${escapeHtml(item.type)}</td>
                <td>
                  <p><strong>${escapeHtml(item.name || "Newsletter signup")}</strong></p>
                  <p>${escapeHtml(item.email || "")}</p>
                  <p>${escapeHtml(item.phone || "")}</p>
                </td>
                <td>
                  <p>${escapeHtml(item.postcode || "")}</p>
                  <p>${escapeHtml(item.service || "")}</p>
                  <p>${escapeHtml(item.message || "")}</p>
                </td>
                <td>
                  ${
                    item.type === "quote"
                      ? `<select data-status-id="${item.id}">
                          ${["pending", "contacted", "completed", "cancelled"]
                            .map((status) => `<option value="${status}" ${item.status === status ? "selected" : ""}>${status}</option>`)
                            .join("")}
                        </select>`
                      : item.status || "subscribed"
                  }
                </td>
                <td><button class="btn btn-ghost" type="button" data-delete-id="${item.id}">Delete</button></td>
              </tr>
            `
          )
          .join("");
};

const loadContent = async () => {
  const data = await api("/api/admin-content");
  state.content = data.content;
  document.querySelectorAll("#contentForm [name]").forEach((field) => {
    field.value = readPath(state.content, field.name) || "";
  });
};

const saveContent = async (event) => {
  event.preventDefault();
  const next = structuredClone(state.content || {});
  document.querySelectorAll("#contentForm [name]").forEach((field) => {
    setPath(next, field.name, field.value);
  });

  $("#contentMessage").textContent = "Saving...";
  const data = await api("/api/admin-content", { method: "PUT", body: JSON.stringify(next) });
  state.content = data.content;
  $("#contentMessage").textContent = "Saved. The public site will show the update on refresh.";
};

const boot = async () => {
  try {
    const session = await api("/api/admin-session");
    if (!session.authenticated) {
      window.location.href = "admin-login.html";
      return;
    }

    document.querySelector(".admin-shell").hidden = false;
    $("#adminBootMessage").hidden = true;
    await Promise.all([loadSummary(), loadSubmissions(), loadContent()]);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  } catch (error) {
    $("#adminBootMessage").textContent = error.message;
  }
};

window.addEventListener("DOMContentLoaded", () => {
  boot();

  $("#contentForm").addEventListener("submit", saveContent);
  $("#submissionSearch").addEventListener("input", loadSubmissions);
  $("#submissionType").addEventListener("change", loadSubmissions);
  $("#submissionRows").addEventListener("change", async (event) => {
    if (event.target.matches("[data-status-id]")) {
      await api("/api/admin-submissions", {
        method: "PATCH",
        body: JSON.stringify({ id: event.target.dataset.statusId, status: event.target.value })
      });
      await loadSummary();
    }
  });
  $("#submissionRows").addEventListener("click", async (event) => {
    if (event.target.matches("[data-delete-id]")) {
      await api(`/api/admin-submissions?id=${encodeURIComponent(event.target.dataset.deleteId)}`, { method: "DELETE" });
      await Promise.all([loadSummary(), loadSubmissions()]);
    }
  });
  $("#logoutButton").addEventListener("click", async () => {
    await api("/api/admin-logout", { method: "POST" });
    window.location.href = "admin-login.html";
  });
});
