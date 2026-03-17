const SUPABASE_URL = "https://vrftpggitpagtsjrfdkl.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_5iozw5nxbYUfHsrSqOarPQ_s__vaSKU";
const ADMIN_EMAIL = "sternbruecke.laerm@gmail.com";

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginSection = document.getElementById("loginSection");
const panelSection = document.getElementById("panelSection");
const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");
const signOutBtn = document.getElementById("signOutBtn");
const entriesEl = document.getElementById("adminEntries");
const adminSearch = document.getElementById("adminSearch");

let cachedEntries = [];

const escapeHtml = (value) =>
  (value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatDateTime = (value) => {
  const date = new Date(value);
  return date.toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatEventDateTime = (item) => {
  const parts = [];
  if (item.event_date) {
    const date = new Date(item.event_date);
    parts.push(
      date.toLocaleDateString("de-DE", {
        dateStyle: "medium",
      })
    );
  }
  if (item.event_time) {
    parts.push(item.event_time.slice(0, 5));
  }
  return parts.join(" · ");
};

const renderMedia = (item) => {
  const url = item.file_url;
  const type = item.file_type || "";

  if (type.startsWith("image/")) {
    return `<div class="entry__media"><img src="${url}" alt="Beleg" loading="lazy" /></div>`;
  }
  if (type.startsWith("video/")) {
    return `<div class="entry__media"><video src="${url}" controls></video></div>`;
  }
  if (type.startsWith("audio/")) {
    return `<div class="entry__media"><audio src="${url}" controls></audio></div>`;
  }
  return `<a href="${url}" target="_blank" rel="noopener">Datei ansehen</a>`;
};

const renderEntries = (items) => {
  if (!items.length) {
    entriesEl.innerHTML = "<div class='entry'>Keine Einträge gefunden.</div>";
    return;
  }

  entriesEl.innerHTML = items
    .map((item) => {
      const eventLine =
        item.event_date || item.event_time
          ? `<p class="entry__meta">Zeitpunkt: ${formatEventDateTime(item)}</p>`
          : `<p class="entry__meta">Zeitpunkt: (nicht angegeben)</p>`;
      const noiseLine = item.noise_type
        ? `<p class="entry__meta">Lärmtyp: ${escapeHtml(item.noise_type)}</p>`
        : "";
      const reported = Number(item.reported_count || 0);
      const statusClass = item.hidden ? "status--hidden" : "status--visible";
      const statusLabel = item.hidden ? "Ausgeblendet" : "Sichtbar";
      const toggleLabel = item.hidden ? "Einblenden" : "Ausblenden";
      return `
      <article class="entry" data-entry-id="${item.id}">
        <div class="entry__meta-row">
          <span class="status ${statusClass}">${statusLabel}</span>
          <span class="status">Meldungen: ${reported}</span>
          <span class="entry__meta">Upload: ${formatDateTime(item.created_at)}</span>
        </div>
        ${eventLine}
        ${noiseLine}
        ${renderMedia(item)}
        <p>${escapeHtml(item.description)}</p>
        <p class="entry__meta">Gemeldet von: ${escapeHtml(item.neighbor || "Anonyme:r Nachbar:in")}</p>
        <div class="entry__actions">
          <button class="report-button" type="button" data-toggle-id="${item.id}">
            ${toggleLabel}
          </button>
        </div>
      </article>
    `;
    })
    .join("");
};

const loadEntries = async () => {
  const { data, error } = await client
    .from("entries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    entriesEl.innerHTML =
      "<div class='entry'>Fehler beim Laden der Einträge.</div>";
    console.error(error);
    return;
  }

  cachedEntries = data || [];
  renderEntries(cachedEntries);
};

const setAuthState = (session) => {
  const user = session?.user;
  const isAdmin = user && user.email === ADMIN_EMAIL;
  loginSection.style.display = isAdmin ? "none" : "block";
  panelSection.style.display = isAdmin ? "block" : "none";
  signOutBtn.style.display = isAdmin ? "inline-flex" : "none";
  if (isAdmin) loadEntries();
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.textContent = "Anmeldung...";

  const formData = new FormData(loginForm);
  const email = formData.get("email").trim();
  const password = formData.get("password");

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    loginStatus.textContent = "Login fehlgeschlagen.";
    console.error(error);
    return;
  }

  loginStatus.textContent = "";
  setAuthState(data.session);
});

signOutBtn.addEventListener("click", async () => {
  await client.auth.signOut();
  setAuthState(null);
});

entriesEl.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-toggle-id]");
  if (!button) return;

  const entryId = button.dataset.toggleId;
  if (!entryId) return;

  button.disabled = true;
  const entry = cachedEntries.find((item) => item.id === entryId);
  const nextHidden = !(entry && entry.hidden);

  const { error } = await client
    .from("entries")
    .update({ hidden: nextHidden })
    .eq("id", entryId);

  if (error) {
    console.error(error);
    button.disabled = false;
    return;
  }

  cachedEntries = cachedEntries.map((item) =>
    item.id === entryId ? { ...item, hidden: nextHidden } : item
  );
  renderEntries(cachedEntries);
});

adminSearch.addEventListener("input", (event) => {
  const value = event.target.value.toLowerCase();
  const filtered = cachedEntries.filter((entry) => {
    return (
      (entry.neighbor || "").toLowerCase().includes(value) ||
      (entry.description || "").toLowerCase().includes(value)
    );
  });
  renderEntries(filtered);
});

client.auth.getSession().then(({ data }) => {
  setAuthState(data.session);
});

client.auth.onAuthStateChange((_event, session) => {
  setAuthState(session);
});
