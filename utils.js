// ─── Shared utilities ────────────────────────────────────────────────────────

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
    parts.push(date.toLocaleDateString("de-DE", { dateStyle: "medium" }));
  }
  if (item.event_time) {
    parts.push(item.event_time.slice(0, 5));
  }
  return parts.join(" · ");
};

const AUDIO_FORMATS = new Set(["mp3", "m4a", "wav", "ogg", "aac", "flac"]);

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
