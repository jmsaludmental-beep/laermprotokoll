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

// ─── Render ───────────────────────────────────────────────────────────────────

const renderEntries = (items) => {
  if (!items.length) {
    entriesEl.innerHTML = "<div class='admin-item'>Keine Einträge gefunden.</div>";
    return;
  }

  entriesEl.innerHTML = items
    .map((item) => {
      const fecha = formatDateTime(item.created_at);
      const name = item.neighbor || "Anonym";
      const media = item.file_url 
        ? `<a href="${item.file_url}" target="_blank" class="footer__link">Datei ↗</a>` 
        : "Keine Datei";

      return `
      <div class="admin-item" data-entry-id="${item.id}">
        <div class="admin-item__info">
          <div class="meta">${fecha}</div>
          <strong>${escapeHtml(name)}</strong>
          <span class="noise-type">${escapeHtml(item.noise_type || "Allgemein")}</span>
        </div>
        <div class="admin-item__desc">
          ${escapeHtml(item.description)}
          ${item.full_address ? `<br><small>📍 ${escapeHtml(item.full_address)}</small>` : ""}
          ${item.email ? `<br><small>📧 ${escapeHtml(item.email)}</small>` : ""}
        </div>
        <div class="admin-item__media">
          ${media}
        </div>
        <div class="admin-item__actions">
          <button class="report-button delete" type="button" data-delete-id="${item.id}">
            Löschen
          </button>
        </div>
      </div>
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

// ─── Auth ─────────────────────────────────────────────────────────────────────

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

// ─── Delete Entry ─────────────────────────────────────────────────────────────

entriesEl.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;

  const entryId = button.dataset.deleteId;
  if (!entryId) return;

  const confirmDelete = confirm("Möchtest du diesen Eintrag wirklich unwiderruflich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.");
  if (!confirmDelete) return;

  button.disabled = true;
  button.textContent = "...";

  const { error } = await client
    .from("entries")
    .delete()
    .eq("id", entryId);

  if (error) {
    console.error(error);
    alert("Fehler beim Löschen des Eintrags.");
    button.disabled = false;
    button.textContent = "Löschen";
    return;
  }

  // Update UI locally
  cachedEntries = cachedEntries.filter((item) => item.id !== entryId);
  renderEntries(cachedEntries);
});

// ─── Search ───────────────────────────────────────────────────────────────────

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

// ─── Init ─────────────────────────────────────────────────────────────────────

client.auth.getSession().then(({ data }) => {
  setAuthState(data.session);
});

client.auth.onAuthStateChange((_event, session) => {
  setAuthState(session);
});
