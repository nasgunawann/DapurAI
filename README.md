# DapurAI — Smart Pantry Manager

**DapurAI** adalah asisten memasak AI yang membantu Anda membuat resep kreatif dan efisien dari bahan yang tersedia di rumah, dengan fokus pada **Zero-Waste Cooking** dan manajemen pantry yang cerdas.

---

## ✨ Fitur Utama

- 🤖 **AI Generasi Resep** — Gunakan Gemini 2.5 Flash untuk analisis bahan dan saran resep custom.
- 📸 **Analisis Foto Bahan** — Unggah foto kulkas/pantry, AI akan identifikasi bahan dan sarankan resep.
- 💾 **Memori Chat Lokal** — Riwayat percakapan tersimpan di browser (localStorage), tidak perlu database.
- 🎨 **UI Responsif** — Full-screen chatroom style dengan Tailwind CSS, nyaman di desktop & mobile.
- 🚀 **Zero-Waste Focus** — Tips optimasi bahan sisa dan memanfaatkan inventaris terbatas.
- 🔄 **Status Badge** — Indikator real-time apakah AI siap, sibuk, atau tidak aktif.
- ⌨️ **Smart Input** — Enter untuk kirim, Shift+Enter untuk baris baru.

---

## 🛠 Tech Stack

**Backend:**
- Node.js + Express
- Google Generative AI SDK (`@google/generative-ai`)
- Gemini 2.5 Flash model

**Frontend:**
- Vanilla JavaScript (ES6+)
- Tailwind CSS (CDN)
- Markdown rendering: `marked.js` + `DOMPurify`

**Storage:**
- Browser LocalStorage (chat memory)
- `.env` untuk konfigurasi API

---

## 📦 Setup & Instalasi

### Prasyarat
- Node.js v16+
- NPM
- Gemini API key (gratis di [AI Studio](https://aistudio.google.com))

### Langkah Instalasi

1. **Clone atau buat folder:**
   ```bash
   cd dapur-ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Konfigurasi `.env`:**
   ```bash
   cp .env.example .env
   ```
   Isi `GEMINI_API_KEY` dengan API key Anda.

4. **Jalankan server:**
   ```bash
   npm start
   ```
   Server akan berjalan di `http://localhost:3000`

---

## 📁 Struktur Folder

```
dapur-ai/
├── server.js                    # Backend Express server
├── package.json
├── .env                         # Konfigurasi API (jangan commit)
├── .env.example                 # Template .env
├── system-instruction.txt       # Prompt sistem untuk Chef DapurAI
├── README.md                    # File ini
└── public/
    ├── index.html              # Halaman utama (UI)
    └── script.js               # Logika frontend & event handling
```

---

## 🚀 Cara Menggunakan

1. **Buka aplikasi** di `http://localhost:3000`
2. **Masukkan daftar bahan** — tuliskan bahan yang ada, atau unggah foto.
3. **Tekan Enter** atau klik tombol **Kirim**.
4. **Chef DapurAI** akan analisis dan sarankan resep dengan:
   - Nama masakan yang kreatif
   - Estimasi waktu & porsi
   - Langkah memasak terstruktur
   - Tips zero-waste & optimasi
5. **Riwayat tersimpan otomatis** — bisa dihapus dengan tombol "Hapus Riwayat Pesan".

---

## 🔄 Alur Kerja

```
User Input (Teks/Foto)
        ↓
Frontend: Validasi & konversi base64
        ↓
POST /api/chat
        ↓
Backend: Proses bahan + history chat
        ↓
Gemini API: Generate resep (systemInstruction-driven)
        ↓
Return reply (Markdown)
        ↓
Frontend: Render + sanitize HTML + simpan ke localStorage
        ↓
Chat bubble muncul + status badge update
```

---

## ⚙️ Konfigurasi Penting

### System Instruction (`system-instruction.txt`)
Ubah persona/behavior Chef DapurAI di sini. Format:
- ROLE: Siapa karakter AI
- TASK: Apa yang harus dilakukan
- RESPONSE STRUCTURE: Format output
- RULES & CONSTRAINTS: Batasan & keamanan
- TONE & VOICE: Gaya komunikasi

### Limit & Constraint
- **Max image size**: 2MB
- **Max chat history**: 12 item per request
- **Generasi parameter**: temperature `0.7`, topP `0.95`, topK `40`

---

## 🐛 Troubleshooting

| Issue | Solusi |
|-------|--------|
| `Cannot GET /api/chat` | Gunakan `POST` bukan `GET` |
| 429 Rate Limited | Tunggu 1 menit (free tier: 10 RPM), atau upgrade ke paid tier |
| Foto tidak terdeteksi | Pastikan file < 2MB, format JPEG/PNG |
| Riwayat hilang setelah refresh | Aktifkan localStorage di browser (jangan private mode) |

---

## 📝 API Endpoints

### `GET /api/health`
Health check server.
```json
{ "ok": true, "service": "DapurAI" }
```

### `GET /api/status`
Status AI (active/busy/inactive).
```json
{
  "ok": true,
  "service": "DapurAI",
  "aiReady": true,
  "state": "active",
  "checkedAt": 1234567890,
  "detail": "Permintaan terakhir berhasil"
}
```

### `POST /api/chat`
Generate resep dari bahan.
```json
{
  "message": "Saya punya telur, bayam, bawang putih, nasi",
  "history": [
    { "role": "user", "text": "..." },
    { "role": "model", "text": "..." }
  ],
  "image": {
    "data": "base64string...",
    "mimeType": "image/jpeg"
  }
}
```

Response:
```json
{
  "reply": "# Nasi Goreng Bayam...\n\nEstimasi: 15 Menit...",
  "disclaimer": "Saran masak ini bersifat edukasi..."
}
```

---

## 💡 Tips & Best Practice

1. **Manfaatkan foto** — AI lebih akurat mendeteksi bahan visual.
2. **Sebutkan alergi/diet** — AI akan filter resep yang aman.
3. **Update system-instruction** — Kustomisasi persona tanpa deploy ulang.
4. **Monitor RPD usage** — Free tier terbatas 250 RPD/hari, hindari request berulang.
5. **Simpan command favorit** — Pakai Shift+Enter untuk multi-line input sebelum kirim.

---

## 📄 Lisensi

Proyek ini open-source. Silakan fork, modifikasi, dan gunakan sesuai kebutuhan.

---

## 👨‍💻 Kontribusi

Ide atau bug? Silakan open issue atau submit PR!

---

**Selamat memasak dengan DapurAI! 🍳✨**
