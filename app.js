const SUPABASE_URL = "https://vrftpggitpagtsjrfdkl.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_5iozw5nxbYUfHsrSqOarPQ_s__vaSKU";
const CLOUDINARY_CLOUD_NAME = "dnmrqhr8g";
const CLOUDINARY_UNSIGNED_PRESET = "laermprotokoll_unsigned";

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const form = document.getElementById("uploadForm");
const statusEl = document.getElementById("uploadStatus");
const entriesEl = document.getElementById("entries");
const fileStatusEl = document.getElementById("fileStatus");
const uploadWidgetOpener = document.getElementById("upload_widget_opener");
const totalReportsEl = document.getElementById("totalReports");

// Personal Protocol Elements
const emailConsultaInput = document.getElementById("email-consulta");
const btnMagicLink = document.getElementById("btn-magic-link");
const btnLogout = document.getElementById("btn-logout");
const protocolLogin = document.getElementById("protocol-login");
const protocolAuthenticated = document.getElementById("protocol-authenticated");
const protocolLoading = document.getElementById("protocol-loading");
const userGreeting = document.getElementById("user-greeting");
const magiaStatus = document.getElementById("magic-link-status");
const listaResultados = document.getElementById("lista-resultados");
const cookieBanner = document.getElementById("cookie-banner");
const btnCookieAccept = document.getElementById("btn-cookie-accept");

// Media Modal Elements
const mediaModal = document.getElementById("media-modal");
const modalContainer = document.getElementById("modal-media-container");
const modalClose = document.querySelector(".modal-close");

// ─── State & Config ───────────────────────────────────────────────────────────
let cachedEntries = [];
let uploadedAsset = null;
let currentUserEmail = null;
let userOwnedIds = new Set();
const MAX_VIDEO_MB = 100;
const MAX_IMAGE_MB = 10;
const MAX_AUDIO_MB = 60;
const MAX_VIDEO_SECONDS = 30;


// Helpers are provided by utils.js in the global scope

const renderEntries = (items) => {
  if (!items.length) {
    entriesEl.innerHTML =
      "<div class='entry entry--empty'>Noch keine Belege. Sei die erste Person, die etwas hochlädt!</div>";
    return;
  }

  entriesEl.innerHTML = items
    .map((item) => {
      const media = renderMedia(item);

      // Title: Full date + time
      const eventDateLabel = item.event_date
        ? new Date(item.event_date).toLocaleDateString("de-DE", { dateStyle: "long" })
        : null;
      const eventTimeLabel = item.event_time
        ? item.event_time.slice(0, 5) + " Uhr"
        : null;
      const titleParts = [eventDateLabel, eventTimeLabel].filter(Boolean);
      const cardTitle = titleParts.length
        ? titleParts.join(" · ")
        : "Datum nicht angegeben";

      const noiseBadge = item.noise_type
        ? `<span class="entry__badge">${escapeHtml(item.noise_type)}</span>`
        : "";

      const publicName =
        item.neighbor || "Anonyme:r Nachbar:in";

      const isOwner = userOwnedIds.has(item.id);
      const editButton = isOwner 
        ? `<button class="btn-edit-pencil" title="Bearbeiten" onclick="handleEditEntry('${item.id}')">✎</button>` 
        : "";

      return `
      <article class="entry" data-entry-id="${item.id}" data-card-id="${item.id}">
        ${editButton}
        <div class="entry__header">
          ${noiseBadge}
        </div>
        <h3 class="entry__title">${escapeHtml(cardTitle)}</h3>
        ${media}
        <div class="desc-container">
          <p class="entry__description desc" onclick="toggleDescription('${item.id}')" title="Klicken zum Erweitern">${escapeHtml(item.description)}</p>
        </div>
        <div class="entry__footer">
          <p class="entry__meta">👤 ${escapeHtml(publicName)}</p>
          <span class="report-link" onclick="handleReportContent('${item.id}')">Inhalt melden</span>
        </div>
      </article>
    `;
    })
    .join("");
};

const renderPersonalReports = (items) => {
  if (!items.length) {
    listaResultados.innerHTML =
      "<p class='helper'>Keine Berichte unter dieser E-Mail-Adresse gefunden.</p>";
    return;
  }

  listaResultados.innerHTML = `
    <h3>Ihr habt ${items.length} Belege gemeldet:</h3>
    <p class="helper" style="margin-bottom: 20px; color: var(--accent); font-weight: 600;">
      💡 Tipp: Drückt Strg+P (oder Teilen > Drucken am Handy), um diese Liste als PDF für euren Vermieter zu speichern.
    </p>
  `;
  listaResultados.innerHTML += items
    .map((item) => {
      const fecha = formatDateTime(item.created_at);
      const address = item.full_address
        ? `<div class="address"><strong>Anschrift:</strong> ${escapeHtml(item.full_address)}</div>`
        : "";
      const media = item.file_url
        ? `<a href="${item.file_url}" target="_blank" rel="noopener" class="footer__link">Datei ansehen ↗</a>`
        : "";

      return `
      <div class="result-card" data-card-id="${item.id}">
        <div class="meta">${fecha}</div>
        <h4>${escapeHtml(item.noise_type || "Baulärm")}</h4>
        <div class="entry__meta" style="margin-bottom: 8px;">👤 ${escapeHtml(item.neighbor || "Nachbar:in")}</div>
        ${address}
        <div class="desc-container">
          <p class="desc">${escapeHtml(item.description)}</p>
        </div>
        ${media}
        <button class="btn-edit-pencil" title="Bearbeiten" onclick="handleEditEntry('${item.id}')">✎</button>
      </div>
    `;
    })
    .join("");
};

window.handleEditEntry = (id) => {
  const card = document.querySelector(`[data-card-id="${id}"]`);
  if (!card) return;

  const descP = card.querySelector(".desc");
  const container = card.querySelector(".desc-container");
  const currentText = descP.textContent;

  const triggerBtn = card.querySelector(".btn-edit-pencil");
  const reportBtn = card.querySelector(".report-link");

  container.innerHTML = `
    <textarea class="edit-area">${currentText}</textarea>
    <div class="edit-actions">
      <button class="primary" onclick="saveEntryEdit('${id}')" style="padding: 6px 16px; font-size:0.8rem">Speichern</button>
      <button class="secondary" onclick="cancelEdit('${id}', \`${currentText.replace(/`/g, '\\`')}\`)" style="padding: 6px 16px; font-size:0.8rem">Abbrechen</button>
    </div>
  `;
  
  if (triggerBtn) triggerBtn.style.display = "none";
  if (reportBtn) reportBtn.style.display = "none";
};

window.cancelEdit = (id, originalText) => {
  const card = document.querySelector(`[data-card-id="${id}"]`);
  if (!card) return;
  
  const container = card.querySelector(".desc-container");
  container.innerHTML = `<p class="desc">${originalText}</p>`;
  
  const triggerBtn = card.querySelector(".btn-edit-pencil");
  const reportBtn = card.querySelector(".report-link");
  if (triggerBtn) triggerBtn.style.display = "block";
  if (reportBtn) reportBtn.style.display = "block";
};

window.saveEntryEdit = async (id) => {
  const card = document.querySelector(`[data-card-id="${id}"]`);
  if (!card) return;

  const textarea = card.querySelector(".edit-area");
  const newText = textarea.value.trim();

  if (!newText) {
    alert("Die Beschreibung darf nicht leer sein.");
    return;
  }

  const btnSave = card.querySelector(".edit-actions .primary");
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.textContent = "Speichert...";
  }

  try {
    const { error } = await client
      .from("entries")
      .update({ description: newText })
      .eq("id", id);

    if (error) throw error;

    // Update UI in all locations (Public Feed & Personal)
    const allMatchingContainers = document.querySelectorAll(`[data-card-id="${id}"] .desc-container`);
    allMatchingContainers.forEach(container => {
      container.innerHTML = `<p class="desc">${escapeHtml(newText)}</p>`;
    });

    const descP = document.querySelector(`[data-card-id="${id}"] .entry__description`);
    if (descP) {
      descP.classList.remove('is-expanded');
      descP.innerHTML = escapeHtml(newText);
    }

    const allMatchingTriggers = document.querySelectorAll(`[data-card-id="${id}"] .btn-edit-pencil`);
    allMatchingTriggers.forEach(btn => btn.style.display = "block");

    const allMatchingReportBtns = document.querySelectorAll(`[data-card-id="${id}"] .report-link`);
    allMatchingReportBtns.forEach(btn => btn.style.display = "block");
    
    // Refresh cached entries to keep state for subsequent renders
    const item = cachedEntries.find(e => e.id === id);
    if (item) item.description = newText;

  } catch (err) {
    console.error(err);
    alert("Fehler beim Speichern. Bitte versuche es erneut.");
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = "Speichern";
    }
  }
};

const updateTotalCount = () => {
  const nonHidden = cachedEntries.filter((e) => !e.hidden).length;
  if (totalReportsEl) totalReportsEl.textContent = nonHidden;
};

const showLoadingState = () => {
  entriesEl.innerHTML = `
    <div class="entry entry--loading">
      <div class="skeleton skeleton--title"></div>
      <div class="skeleton skeleton--media"></div>
      <div class="skeleton skeleton--text"></div>
      <div class="skeleton skeleton--text short"></div>
    </div>
    <div class="entry entry--loading">
      <div class="skeleton skeleton--title"></div>
      <div class="skeleton skeleton--media"></div>
      <div class="skeleton skeleton--text"></div>
      <div class="skeleton skeleton--text short"></div>
    </div>
  `;
};

const loadEntries = async () => {
  showLoadingState();

  const { data, error } = await client
    .from("public_entries")
    .select("id, created_at, description, noise_type, event_date, event_time, file_url, file_type, neighbor")
    .order("created_at", { ascending: false });

  if (error) {
    entriesEl.innerHTML =
      "<div class='entry'>Die Belege konnten nicht geladen werden.</div>";
    return;
  }

  cachedEntries = data || [];
  updateTotalCount();
  renderEntries(cachedEntries);
};

// ─── Auth & Personal Data ─────────────────────────────────────────────────────

const toggleProtocolStates = (session) => {
  if (session) {
    currentUserEmail = session.user.email;
    if (protocolLogin) protocolLogin.style.display = "none";
    if (protocolAuthenticated) protocolAuthenticated.style.display = "block";
    if (userGreeting) userGreeting.textContent = `Angemeldet als: ${session.user.email}`;
    consultarMisReportes(session.user.email);
    // Refresh public feed to show edit buttons if post matches current user
    renderEntries(cachedEntries);
  } else {
    currentUserEmail = null;
    userOwnedIds.clear();
    if (protocolLogin) protocolLogin.style.display = "block";
    if (protocolAuthenticated) protocolAuthenticated.style.display = "none";
    if (listaResultados) listaResultados.innerHTML = "";
    // Refresh public feed to hide edit buttons
    renderEntries(cachedEntries);
  }
};

const enviarEnlaceMagico = async () => {
  const email = emailConsultaInput.value.trim().toLowerCase();
  if (!email) {
    alert("Bitte gib eine E-Mail-Adresse ein.");
    return;
  }

  if (magiaStatus) {
    magiaStatus.textContent = "Sende Link...";
    magiaStatus.className = "helper";
  }
  if (btnMagicLink) btnMagicLink.disabled = true;

  try {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.href.split('#')[0]
      }
    });

    if (error) throw error;

    if (magiaStatus) {
      magiaStatus.textContent = "✓ Link gesendet! Bitte prüft euren Posteingang.";
      magiaStatus.className = "helper success";
    }
  } catch (error) {
    console.error(error);
    if (magiaStatus) {
      magiaStatus.textContent = "Fehler: " + (error.message || "Unbekannter Fehler");
      magiaStatus.className = "helper error";
    }
    if (btnMagicLink) btnMagicLink.disabled = false;
  }
};

const consultarMisReportes = async (email) => {
  if (!listaResultados) return;
  listaResultados.innerHTML = "<p class='helper'>Deine Berichte werden geladen...</p>";
  
  try {
    const { data, error } = await client
      .from("entries")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Populate userOwnedIds set
    userOwnedIds.clear();
    if (data) {
      data.forEach(item => userOwnedIds.add(item.id));
    }

    renderPersonalReports(data || []);
    // Re-render public feed to show edit buttons
    renderEntries(cachedEntries);
  } catch (error) {
    console.error(error);
    listaResultados.innerHTML =
      "<p class='helper error'>Fehler beim Laden deiner Berichte.</p>";
  }
};

const logout = async () => {
  await client.auth.signOut();
  window.location.hash = ""; 
};

// ─── Upload Widget logic ──────────────────────────────────────────────────────

// renderMedia removed, using utils.js version

const getFileType = (resourceType, format) => {
  if (resourceType === "image") return `image/${format}`;
  if (resourceType === "video") {
    return AUDIO_FORMATS.has(format) ? `audio/${format}` : `video/${format}`;
  }
  return "application/octet-stream";
};

const buildUploadWidget = () => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UNSIGNED_PRESET) {
    fileStatusEl.textContent =
      "Cloudinary ist noch nicht konfiguriert. Bitte Cloud-Name und Upload-Preset eintragen.";
    return null;
  }

  return window.cloudinary.createUploadWidget(
    {
      cloudName: CLOUDINARY_CLOUD_NAME,
      uploadPreset: CLOUDINARY_UNSIGNED_PRESET,
      sources: ["local", "camera", "url"],
      multiple: false,
      resourceType: "auto",
      maxImageFileSize: MAX_IMAGE_MB * 1024 * 1024,
      maxVideoFileSize: MAX_VIDEO_MB * 1024 * 1024,
      maxFileSize: MAX_VIDEO_MB * 1024 * 1024,
      clientAllowedFormats: [
        "jpg", "jpeg", "png",
        "mp4", "mov", "webm",
        "mp3", "m4a", "wav", "ogg", "aac", "flac",
      ],
    },
    (error, result) => {
      if (error) {
        fileStatusEl.textContent =
          "Upload fehlgeschlagen. Bitte erneut versuchen.";
        console.error(error);
        return;
      }
      if (result.event === "success") {
        const info = result.info;
        uploadedAsset = {
          url: info.secure_url,
          resourceType: info.resource_type,
          format: info.format,
          bytes: info.bytes,
          duration: info.duration,
        };

        const sizeMb = info.bytes / (1024 * 1024);
        if (AUDIO_FORMATS.has(info.format) && sizeMb > MAX_AUDIO_MB) {
          fileStatusEl.textContent =
            "Audio ist zu groß. Bitte kürzere Aufnahme hochladen.";
          uploadedAsset = null;
          return;
        }

        if (
          info.resource_type === "video" &&
          typeof info.duration === "number" &&
          info.duration > MAX_VIDEO_SECONDS
        ) {
          fileStatusEl.textContent =
            "Video ist länger als 30 Sekunden. Bitte kürzeres Video hochladen.";
          uploadedAsset = null;
          return;
        }

        fileStatusEl.textContent = `✓ Datei hochgeladen: ${info.original_filename}.${info.format}`;
        fileStatusEl.className = "helper success";
        uploadWidgetOpener.classList.add("secondary--done");
        uploadWidgetOpener.textContent = "✓ Datei hochgeladen";
      }
    }
  );
};

let uploadWidget = null;
const initUploadWidget = () => {
  if (!window.cloudinary || !window.cloudinary.createUploadWidget) {
    if (fileStatusEl) fileStatusEl.textContent = "Cloudinary-Widget konnte nicht geladen werden.";
    return;
  }
  uploadWidget = buildUploadWidget();
  if (uploadWidgetOpener) {
    uploadWidgetOpener.addEventListener("click", () => {
      if (!uploadWidget) return;
      uploadWidget.open();
    });
  }
};

// ─── Event Listeners ──────────────────────────────────────────────────────────

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "Eintrag wird gespeichert...";
  statusEl.className = "helper";

  const formData = new FormData(form);
  const displayName = formData.get("display_name").trim();
  const fullAddress = formData.get("full_address").trim();
  const email = formData.get("email").trim();
  const description = formData.get("description").trim();
  const noiseType = formData.get("noise_type").trim();
  const eventDate = formData.get("event_date");
  const eventTime = formData.get("event_time");

  if (!displayName || !description || !email) {
    statusEl.textContent = "Bitte die Pflichtfelder ausfüllen.";
    statusEl.className = "helper error";
    return;
  }

  if (!uploadedAsset) {
    statusEl.textContent = "Bitte zuerst eine Datei hochladen.";
    statusEl.className = "helper error";
    uploadWidgetOpener.classList.add("secondary--required");
    uploadWidgetOpener.focus();
    setTimeout(() => uploadWidgetOpener.classList.remove("secondary--required"), 3000);
    return;
  }

  try {
    const fileType = getFileType(uploadedAsset.resourceType, uploadedAsset.format);

    const { error } = await client.from("entries").insert([
      {
        neighbor: displayName, // Map frontend 'displayName' to database 'neighbor'
        full_address: fullAddress || null,
        email,
        description,
        noise_type: noiseType || null,
        event_date: eventDate || null,
        event_time: eventTime || null,
        file_url: uploadedAsset.url,
        file_type: fileType,
      },
    ]);

    if (error) throw error;

    statusEl.textContent = "Eintrag gespeichert. Danke!";
    statusEl.className = "helper success";
    form.reset();
    uploadedAsset = null;
    fileStatusEl.textContent = "Hinweis: Bitte Videos auf 30 Sek. begrenzen.";
    fileStatusEl.className = "helper";
    uploadWidgetOpener.classList.remove("secondary--done");
    uploadWidgetOpener.textContent = "Datei auswählen & hochladen";
    await loadEntries();

    setTimeout(() => {
      statusEl.textContent = "";
      statusEl.className = "helper";
    }, 5000);
  } catch (error) {
    statusEl.textContent = "Upload fehlgeschlagen.";
    statusEl.className = "helper error";
    console.error(error);
  }
});

if (btnMagicLink) {
  btnMagicLink.addEventListener("click", enviarEnlaceMagico);
}

if (btnLogout) {
  btnLogout.addEventListener("click", logout);
}

if (emailConsultaInput) {
  emailConsultaInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") enviarEnlaceMagico();
  });
}

window.handleReportContent = async (entryId) => {
  const link = document.querySelector(`[data-card-id="${entryId}"] .report-link`);
  if (!link) return;

  if (link.textContent === "Gemeldet") return;

  link.textContent = "...";
  link.style.pointerEvents = "none";

  try {
    const { data, error } = await client.rpc("report_entry", {
      entry_id: entryId,
    });

    if (error) throw error;

    link.textContent = "Gemeldet";
    link.style.color = "var(--ink)";
    link.style.textDecoration = "none";

    const result = Array.isArray(data) ? data[0] : data;
    if (result && result.hidden) {
      const card = document.querySelector(`[data-card-id="${entryId}"]`);
      if (card) card.style.opacity = "0.5";
    }
  } catch (error) {
    console.error(error);
    link.textContent = "Inhalt melden";
    link.style.pointerEvents = "auto";
  }
};

window.toggleDescription = (id) => {
  const desc = document.querySelector(`[data-card-id="${id}"] .entry__description`);
  if (desc) desc.classList.toggle('is-expanded');
};

if (btnCookieAccept) {
  btnCookieAccept.addEventListener("click", () => {
    localStorage.setItem("cookie-consent", "accepted");
    if (cookieBanner) cookieBanner.style.display = "none";
  });
}

const checkCookieConsent = () => {
  if (!localStorage.getItem("cookie-consent") && cookieBanner) {
    cookieBanner.style.display = "block";
  }
};

// Fix: set today as max date to prevent future dates
const eventDateInput = document.getElementById("event_date");
if (eventDateInput) {
  eventDateInput.max = new Date().toISOString().split("T")[0];
}

initUploadWidget();
loadEntries();

// Auth State Listener
client.auth.onAuthStateChange((event, session) => {
  toggleProtocolStates(session);
});

// Initial check for session
const checkInitialSession = async () => {
  if (protocolLoading) protocolLoading.style.display = "block";
  const { data: { session } } = await client.auth.getSession();
  if (protocolLoading) protocolLoading.style.display = "none";
  toggleProtocolStates(session);
};

checkInitialSession();
checkCookieConsent();

// ─── Modal Functions ─────────────────────────────────────────────────────────

const openModal = (url, type) => {
  if (!mediaModal || !modalContainer) return;
  
  modalContainer.innerHTML = type === "video" 
    ? `<video src="${url}" controls autoplay loop></video>` 
    : `<img src="${url}" alt="Vollbild" />`;
    
  mediaModal.style.display = "flex";
  document.body.style.overflow = "hidden"; // Prevent scroll
};

const closeModal = () => {
  if (!mediaModal) return;
  mediaModal.style.display = "none";
  modalContainer.innerHTML = "";
  document.body.style.overflow = ""; // Restore scroll
};

// Event Delegation for Media Clicks
document.addEventListener("click", (e) => {
  const mediaTrigger = e.target.closest(".entry__media[data-full-url]");
  if (mediaTrigger) {
    const url = mediaTrigger.dataset.fullUrl;
    const type = mediaTrigger.dataset.type;
    openModal(url, type);
  }
});

if (modalClose) {
  modalClose.addEventListener("click", closeModal);
}

if (mediaModal) {
  mediaModal.addEventListener("click", (e) => {
    if (e.target === mediaModal) closeModal();
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});
