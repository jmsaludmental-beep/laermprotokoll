const SUPABASE_URL = "https://vrftpggitpagtsjrfdkl.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_5iozw5nxbYUfHsrSqOarPQ_s__vaSKU";
const CLOUDINARY_CLOUD_NAME = "dnmrqhr8g";
const CLOUDINARY_UNSIGNED_PRESET = "laermprotokoll_unsigned";

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("uploadForm");
const statusEl = document.getElementById("uploadStatus");
const entriesEl = document.getElementById("entries");
const searchInput = document.getElementById("searchInput");
const fileStatusEl = document.getElementById("fileStatus");
const uploadWidgetOpener = document.getElementById("upload_widget_opener");

let cachedEntries = [];
let uploadedAsset = null;
const MAX_VIDEO_MB = 100;
const MAX_IMAGE_MB = 10;
const MAX_AUDIO_MB = 60;
const MAX_VIDEO_SECONDS = 30;
const AUDIO_FORMATS = new Set(["mp3", "m4a", "wav", "ogg", "aac", "flac"]);

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

const renderEntries = (items) => {
  if (!items.length) {
    entriesEl.innerHTML =
      "<div class='entry'>Noch keine Belege. Sei die erste Person, die etwas hochlädt!</div>";
    return;
  }

  entriesEl.innerHTML = items
    .map((item) => {
      const media = renderMedia(item);
      const noiseLine = item.noise_type
        ? `<p class="entry__meta">Lärmtyp: ${escapeHtml(item.noise_type)}</p>`
        : "";
      const eventLine =
        item.event_date || item.event_time
          ? `<p class="entry__meta">Zeitpunkt: ${formatEventDateTime(item)}</p>`
          : "";
      return `
      <article class="entry">
        <div>
          <h3>${escapeHtml(item.neighbor)}</h3>
          <p class="entry__meta">${formatDateTime(item.created_at)}</p>
        </div>
        ${noiseLine}
        ${eventLine}
        <p>${escapeHtml(item.description)}</p>
        ${media}
      </article>
    `;
    })
    .join("");
};

const renderMedia = (item) => {
  const url = item.file_url;
  const type = item.file_type || "";

  if (type.startsWith("image/")) {
    return `<div class="entry__media"><img src="${url}" alt="Hochgeladener Beleg" loading="lazy" /></div>`;
  }
  if (type.startsWith("video/")) {
    return `<div class="entry__media"><video src="${url}" controls></video></div>`;
  }
  if (type.startsWith("audio/")) {
    return `<div class="entry__media"><audio src="${url}" controls></audio></div>`;
  }
  return `<a href="${url}" target="_blank" rel="noopener">Datei ansehen</a>`;
};

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const loadEntries = async () => {
  const { data, error } = await client
    .from("entries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    entriesEl.innerHTML =
      "<div class='entry'>Die Belege konnten nicht geladen werden.</div>";
    return;
  }

  cachedEntries = data || [];
  renderEntries(cachedEntries);
};

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
        "jpg",
        "jpeg",
        "png",
        "mp4",
        "mov",
        "webm",
        "mp3",
        "m4a",
        "wav",
        "ogg",
        "aac",
        "flac",
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

        fileStatusEl.textContent = `Datei hochgeladen: ${info.original_filename}.${info.format}`;
      }
    }
  );
};

let uploadWidget = null;

const ensureCloudinaryScript = () =>
  new Promise((resolve, reject) => {
    if (window.cloudinary && window.cloudinary.createUploadWidget) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://upload-widget.cloudinary.com/latest/global/all.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Cloudinary script load failed"));
    document.head.appendChild(script);
  });

const initUploadWidget = async () => {
  try {
    await ensureCloudinaryScript();
    uploadWidget = buildUploadWidget();
    if (uploadWidgetOpener) {
      uploadWidgetOpener.addEventListener("click", () => {
        if (!uploadWidget) return;
        uploadWidget.open();
      });
    }
  } catch (error) {
    fileStatusEl.textContent =
      "Cloudinary-Widget konnte nicht geladen werden. Bitte Seite neu laden.";
    console.error(error);
  }
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "Eintrag wird gespeichert...";

  const formData = new FormData(form);
  const neighbor = formData.get("neighbor").trim();
  const email = formData.get("email").trim();
  const description = formData.get("description").trim();
  const noiseType = formData.get("noise_type").trim();
  const eventDate = formData.get("event_date");
  const eventTime = formData.get("event_time");
  if (!neighbor || !description) {
    statusEl.textContent = "Bitte alle Pflichtfelder ausfüllen.";
    return;
  }

  try {
    if (!uploadedAsset) {
      statusEl.textContent = "Bitte zuerst eine Datei hochladen.";
      return;
    }

    const fileType = getFileType(
      uploadedAsset.resourceType,
      uploadedAsset.format
    );

    const { error } = await client.from("entries").insert([
      {
        neighbor,
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
    form.reset();
    uploadedAsset = null;
    fileStatusEl.textContent = "Hinweis: Bitte Videos auf 30 Sekunden begrenzen.";
    await loadEntries();
  } catch (error) {
    statusEl.textContent = "Upload fehlgeschlagen. Bitte in ein paar Minuten erneut versuchen.";
    console.error(error);
  }
});

searchInput.addEventListener("input", (event) => {
  const value = event.target.value.toLowerCase();
  const filtered = cachedEntries.filter((entry) => {
    return (
      entry.neighbor.toLowerCase().includes(value) ||
      entry.description.toLowerCase().includes(value)
    );
  });
  renderEntries(filtered);
});

initUploadWidget();
loadEntries();
