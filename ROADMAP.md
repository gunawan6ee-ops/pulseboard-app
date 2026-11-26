# ROADMAP — PulseBoard Status (Backlog Usulan)

**Disusun oleh:** Arga (MD, L1) · **Basis:** audit kode aktual `app.js`, `incidents.js`, `health.json`, `scripts/`
**Status:** Usulan — belum ada work order. Eksekusi menunggu persetujuan CEO.
**Prinsip yang dijaga:** zero-build, zero runtime dependency, domain layer bebas DOM, kontrak `health.json` additive-only.

---

## 1. Ringkasan Prioritas

| # | Fitur | Nilai | Effort | Risiko | PIC usulan |
|---|---|---|---|---|---|
| F1 | Normalisasi uptime → angka + ambang alert | Tinggi | S | Rendah | Reza (L4) |
| F2 | Banner insiden aktif (auto-derive) | Tinggi | S | Rendah | Tiara (L4) |
| F3 | Riwayat uptime 90 hari (bar harian) | Tinggi | M | Sedang | Reza + Tiara |
| F4 | `health.json` v2: `incidents[]` + `generatedBy` | Sedang | M | Sedang | Reza |
| F5 | RSS/Atom feed insiden | Sedang | S | Rendah | Doni (L3) |
| F6 | Subscribe email/webhook status | Sedang | L | Sedang | Yoga (L3) |
| F7 | Mode gelap + `prefers-color-scheme` | Rendah | S | Rendah | Tiara |
| F8 | i18n ID/EN berbasis kamus | Rendah | M | Rendah | Maya (L3) |

Skala effort: S ≤ 1 hari, M 2–3 hari, L > 3 hari.

---

## 2. Detail Fitur Prioritas Tinggi

### F1 — Normalisasi uptime jadi angka
**Masalah:** `SERVICES[].uptime` disimpan sebagai string `"99.98%"`. Tidak bisa diurutkan, dibandingkan, atau diberi ambang.
**Usulan:** tambah `uptimeToPercent(value) → number|null` (pure, toleran input kotor) dan `servicesBelowUptime(services, threshold)`.
**Kriteria terima:** string `"99.98%"` → `99.98`; `"abc"` → `null`; ambang 99.95 mengembalikan hanya layanan di bawahnya; `health.json` tetap mengirim string asli (kompatibel).
**Catatan:** sudah saya implementasikan sebagai quick win di commit terpisah (lihat §5).

### F2 — Banner insiden aktif
**Masalah:** `isActive()` dan `incidentStats().active` sudah ada, tapi tidak pernah tampil di UI. Insiden berjalan tak terlihat di atas fold.
**Usulan:** banner `role="status"` + `aria-live="polite"` yang hanya render bila `active > 0`, memuat judul insiden dan durasi berjalan.
**Kriteria terima:** nol insiden aktif → banner tidak ada di DOM; satu insiden aktif → banner muncul dengan teks ter-escape; lolos smoke DOM.

### F3 — Riwayat uptime 90 hari
**Masalah:** hanya ada uptime agregat, tanpa bukti historis. Klaim status jadi tak bisa diverifikasi pembaca.
**Usulan:** `uptimeHistory(serviceId, days)` pure + grid bar harian CSS-only, warna per status, `title`/`aria-label` per hari.
**Kriteria terima:** 90 sel per layanan; hari tanpa data dirender netral; tidak menambah dependency.

---

## 3. Detail Fitur Prioritas Sedang

- **F4 — `health.json` v2:** tambah `incidents[]` (id, severity, startedAt, resolvedAt) dan `generatedBy`. Wajib lewat `build-health.mjs` + test anti-drift agar `health.json` tidak diedit manual. `version` naik ke 2, field v1 dipertahankan.
- **F5 — Feed insiden:** `feed.xml` statis dari `INCIDENTS`, di-generate `scripts/build-feed.mjs`, di-escape ketat. Konsumen RSS bisa berlangganan tanpa backend.
- **F6 — Notifikasi:** webhook keluar saat status berubah. Butuh state pembanding terakhir; simpan di file state, bukan memori proses.

---

## 4. Fitur Prioritas Rendah

- **F7 — Mode gelap:** token warna via `prefers-color-scheme` + toggle manual yang disimpan di `localStorage`. Jaga kontras ≥ 4.5:1.
- **F8 — i18n:** kamus `id`/`en` terpisah, `t(key)` pure, bahasa awal dari `navigator.language`. Semua label UI lewat kamus.

---

## 5. Quick Win yang Sudah Dieksekusi

`uptimeToPercent()` dan `servicesBelowUptime()` di `app.js`, plus `tests/uptime.test.mjs`. Murni aditif — tidak mengubah signature lama, `health.json` tidak berubah bentuk.

---

## 6. Yang Sengaja Ditolak

| Usulan | Alasan |
|---|---|
| Framework UI (React/Vue) | Melanggar ADR-001 zero-build; payload naik 10× |
| Backend + database | Status saat ini statis; backend baru masuk akal saat F6 |
| Chart library | Bisa diganti CSS bar (F3) tanpa dependency |
| Auto-refresh polling agresif | `health.json` statis; cukup `checkedAt` yang jujur |

---

## 7. Urutan Eksekusi yang Disarankan

F1 (selesai) → F2 → F3 → F5 → F4 → F7 → F8 → F6.
F2 dan F3 memberi nilai pengguna tercepat. F6 ditunda sampai ada kebutuhan notifikasi nyata.
