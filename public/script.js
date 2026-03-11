const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const imageInput = document.getElementById("image-input");
const imagePreview = document.getElementById("image-preview");
const previewWrap = document.getElementById("preview-wrap");
const submitBtn = document.getElementById("submit-btn");
const aiStatusBadge = document.getElementById("ai-status-badge");
const clearMemoryBtn = document.getElementById("clear-memory-btn");

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const chatHistory = [];
const CHAT_MEMORY_KEY = "dapurai.chatHistory.v1";

let selectedImage = null;

function persistChatHistory() {
  try {
    localStorage.setItem(CHAT_MEMORY_KEY, JSON.stringify(chatHistory));
  } catch (error) {
    // Ignore storage failures (private mode/quota) and keep app functional.
  }
}

function appendHistoryEntry(entry) {
  chatHistory.push(entry);
  persistChatHistory();
}

function restoreChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_MEMORY_KEY);
    if (!raw) {
      return false;
    }

    const saved = JSON.parse(raw);
    if (!Array.isArray(saved) || saved.length === 0) {
      return false;
    }

    for (const item of saved) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const role = item.role === "user" ? "user" : item.role === "model" ? "model" : null;
      if (!role || typeof item.text !== "string" || !item.text.trim()) {
        continue;
      }

      chatHistory.push({ role, text: item.text });
      addMessage(role === "user" ? "user" : "assistant", item.text, role === "model");
    }

    return chatHistory.length > 0;
  } catch (error) {
    return false;
  }
}

function clearStoredMemory() {
  chatHistory.length = 0;
  try {
    localStorage.removeItem(CHAT_MEMORY_KEY);
  } catch (error) {
    // Ignore storage failures and continue clearing visible state.
  }

  chatBox.innerHTML = "";
  addMessage(
    "assistant",
    "Halo! Saya DapurAI. Kirim daftar bahan atau foto kulkasmu, lalu saya bantu resep kreatif + tips zero-waste.",
    false
  );
}

function addMessage(role, content, isMarkdown = false, isThinking = false) {
  const bubble = document.createElement("div");
  const baseClasses =
    "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-all duration-200";

  const roleClasses = {
    user: "ml-auto rounded-br-md bg-gradient-to-r from-spice-500 to-spice-700 text-white",
    assistant:
      "mr-auto rounded-bl-md border border-kitchen-100 bg-white text-slate-800 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_p:last-child]:mb-0 [&_li]:mb-1",
    error: "mx-auto border border-red-200 bg-red-50 text-red-700"
  };

  bubble.className = `${baseClasses} ${roleClasses[role] || roleClasses.assistant}`;
  if (isThinking) {
    bubble.classList.add("animate-pulse");
  }

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

function setAIStatus(state) {
  if (!aiStatusBadge) {
    return;
  }

  const states = {
    active: {
      label: "Aktif",
      classes: "bg-kitchen-100 text-kitchen-900"
    },
    inactive: {
      label: "Tidak Aktif",
      classes: "bg-red-100 text-red-700"
    },
    checking: {
      label: "Mengecek...",
      classes: "bg-slate-200 text-slate-600"
    },
    busy: {
      label: "Sibuk",
      classes: "bg-amber-100 text-amber-700"
    }
  };

  const config = states[state] || states.checking;
  aiStatusBadge.textContent = config.label;
  aiStatusBadge.className =
    `rounded-full px-3 py-1 text-[11px] font-medium sm:text-xs ${config.classes}`;
}

async function refreshAIStatus() {
  setAIStatus("checking");
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    if (!response.ok) {
      setAIStatus("inactive");
      return;
    }

    const data = await response.json();
    if (data.state === "active" || data.state === "busy" || data.state === "inactive") {
      setAIStatus(data.state);
      return;
    }

    setAIStatus(data.aiReady ? "active" : "inactive");
  } catch (error) {
    setAIStatus("inactive");
  }
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

userInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

imageInput.addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];

  if (!file) {
    selectedImage = null;
    previewWrap.classList.add("hidden");
    previewWrap.classList.remove("flex");
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
    previewWrap.classList.remove("hidden");
    previewWrap.classList.add("flex");
  } catch (error) {
    selectedImage = null;
    previewWrap.classList.add("hidden");
    previewWrap.classList.remove("flex");
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
    appendHistoryEntry({ role: "user", text: message });
  } else {
    addMessage("user", "[Mengirim foto bahan]");
    appendHistoryEntry({ role: "user", text: "Saya mengirim foto bahan. Tolong analisis." });
  }

  setLoading(true);
  const thinkingBubble = addMessage("assistant", "Chef sedang berpikir...", false, true);

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
      const apiError = new Error(data.error || "Gagal mendapatkan respons dari server.");
      apiError.status = response.status;
      throw apiError;
    }

    thinkingBubble.remove();
    addMessage("assistant", data.reply, true);
    setAIStatus("active");
    appendHistoryEntry({ role: "model", text: data.reply });

    userInput.value = "";
    imageInput.value = "";
    selectedImage = null;
    imagePreview.src = "";
    previewWrap.classList.add("hidden");
    previewWrap.classList.remove("flex");
  } catch (error) {
    thinkingBubble.remove();

    if (error.status === 429) {
      setAIStatus("busy");
    } else if (error.status >= 500 || /belum diatur|konfigurasi/i.test(error.message || "")) {
      setAIStatus("inactive");
    }

    addMessage("error", error.message || "Terjadi kesalahan. Silakan coba lagi.");
  } finally {
    setLoading(false);
  }
});

refreshAIStatus();
setInterval(refreshAIStatus, 60000);

if (!restoreChatHistory()) {
  addMessage(
    "assistant",
    "Halo! Saya DapurAI. Kirim daftar bahan atau foto kulkasmu, lalu saya bantu resep kreatif + tips memakai bahan yang tersedia.",
    false
  );
}

if (clearMemoryBtn) {
  clearMemoryBtn.addEventListener("click", clearStoredMemory);
}
