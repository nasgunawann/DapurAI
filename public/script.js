const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const imageInput = document.getElementById("image-input");
const imagePreview = document.getElementById("image-preview");
const previewWrap = document.getElementById("preview-wrap");
const submitBtn = document.getElementById("submit-btn");

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const chatHistory = [];

let selectedImage = null;

function addMessage(role, content, isMarkdown = false) {
  const bubble = document.createElement("div");
  bubble.className = `message ${role}`;

  if (isMarkdown) {
    const unsafeHtml = marked.parse(content || "");
    bubble.innerHTML = DOMPurify.sanitize(unsafeHtml);
  } else {
    bubble.textContent = content;
  }

  chatBox.appendChild(bubble);
  chatBox.scrollTop = chatBox.scrollHeight;
  return bubble;
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  userInput.disabled = isLoading;
  imageInput.disabled = isLoading;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      if (commaIndex === -1) {
        reject(new Error("Gagal membaca file gambar."));
        return;
      }
      resolve(result.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(new Error("Tidak bisa memproses file gambar."));
    reader.readAsDataURL(file);
  });
}

imageInput.addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];

  if (!file) {
    selectedImage = null;
    previewWrap.style.display = "none";
    imagePreview.src = "";
    return;
  }

  if (!file.type.startsWith("image/")) {
    addMessage("error", "File harus berupa gambar.");
    imageInput.value = "";
    return;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    addMessage("error", "Ukuran gambar terlalu besar. Maksimal 2MB.");
    imageInput.value = "";
    return;
  }

  try {
    const base64 = await fileToBase64(file);
    selectedImage = {
      data: base64,
      mimeType: file.type,
      name: file.name
    };

    imagePreview.src = URL.createObjectURL(file);
    previewWrap.style.display = "flex";
  } catch (error) {
    selectedImage = null;
    previewWrap.style.display = "none";
    addMessage("error", error.message || "Gagal memproses gambar.");
  }
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = userInput.value.trim();
  if (!message && !selectedImage) {
    addMessage("error", "Masukkan bahan atau unggah foto terlebih dahulu.");
    return;
  }

  if (message) {
    addMessage("user", message);
    chatHistory.push({ role: "user", text: message });
  } else {
    addMessage("user", "[Mengirim foto bahan]");
    chatHistory.push({ role: "user", text: "Saya mengirim foto bahan. Tolong analisis." });
  }

  setLoading(true);
  const thinkingBubble = addMessage("assistant", "Chef sedang berpikir...");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message || "Tolong analisis bahan dari foto ini.",
        history: chatHistory,
        image: selectedImage
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Gagal mendapatkan respons dari server.");
    }

    thinkingBubble.remove();
    addMessage("assistant", data.reply, true);
    chatHistory.push({ role: "model", text: data.reply });

    userInput.value = "";
    imageInput.value = "";
    selectedImage = null;
    imagePreview.src = "";
    previewWrap.style.display = "none";
  } catch (error) {
    thinkingBubble.remove();
    addMessage("error", error.message || "Terjadi kesalahan. Silakan coba lagi.");
  } finally {
    setLoading(false);
  }
});

addMessage(
  "assistant",
  "Halo! Saya DapurAI. Kirim daftar bahan atau foto kulkasmu, lalu saya bantu resep kreatif + tips zero-waste.",
  false
);
