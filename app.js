const SUPABASE_URL = "https://vrftpggitpagtsjrfdkl.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_5iozw5nxbYUfHsrSqOarPQ_s__vaSKU";

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("uploadForm");
const statusEl = document.getElementById("uploadStatus");
const entriesEl = document.getElementById("entries");
const searchInput = document.getElementById("searchInput");

let cachedEntries = [];

const formatDateTime = (value) => {
  const date = new Date(value);
  return date.toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const renderEntries = (items) => {
  if (!items.length) {
    entriesEl.innerHTML =
      "<div class='entry'>Aún no hay evidencias. ¡Sé la primera persona en subir!</div>";
    return;
  }

  entriesEl.innerHTML = items
    .map((item) => {
      const media = renderMedia(item);
      return `
      <article class="entry">
        <div>
          <h3>${escapeHtml(item.neighbor)}</h3>
          <p class="entry__meta">${formatDateTime(item.created_at)}</p>
        </div>
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
    return `<div class="entry__media"><img src="${url}" alt="Evidencia subida" loading="lazy" /></div>`;
  }
  if (type.startsWith("video/")) {
    return `<div class="entry__media"><video src="${url}" controls></video></div>`;
  }
  if (type.startsWith("audio/")) {
    return `<div class="entry__media"><audio src="${url}" controls></audio></div>`;
  }
  return `<a href="${url}" target="_blank" rel="noopener">Ver archivo</a>`;
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
      "<div class='entry'>No se pudieron cargar las evidencias.</div>";
    return;
  }

  cachedEntries = data || [];
  renderEntries(cachedEntries);
};

const uploadFile = async (file, neighbor) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}_${neighbor.replace(/\s+/g, "_")}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { error: uploadError } = await client.storage
    .from("laermprotokoll")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = client.storage.from("laermprotokoll").getPublicUrl(filePath);
  return data.publicUrl;
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "Subiendo archivo...";

  const formData = new FormData(form);
  const neighbor = formData.get("neighbor").trim();
  const email = formData.get("email").trim();
  const description = formData.get("description").trim();
  const file = formData.get("media");

  if (!neighbor || !description || !file) {
    statusEl.textContent = "Completa todos los campos obligatorios.";
    return;
  }

  try {
    const fileUrl = await uploadFile(file, neighbor);
    const { error } = await client.from("entries").insert([
      {
        neighbor,
        email,
        description,
        file_url: fileUrl,
        file_type: file.type,
      },
    ]);

    if (error) throw error;

    statusEl.textContent = "Subida completada. ¡Gracias!";
    form.reset();
    await loadEntries();
  } catch (error) {
    statusEl.textContent = "No se pudo subir. Reintenta en unos minutos.";
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

loadEntries();
