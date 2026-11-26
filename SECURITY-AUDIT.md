# Security Audit & Final QA Verification — PulseBoard Status

**Task:** DARKOWL-2633
**Owner:** Zaky (CISO, L2) — eksekusi di bawah orkestrasi Arga (MD, L1)
**Tanggal:** 2026-11-26
**Scope:** `app.js`, `incidents.js`, `index.html`, `scripts/*.mjs`, `health.json`
**Baseline commit:** `be4f75e`

## Ringkasan Verdict

**LULUS — 0 temuan kritis, 0 tinggi.** Empat temuan (2 sedang, 2 rendah) ditemukan dan
**seluruhnya diperbaiki dalam audit ini**, masing-masing dengan test regresi permanen.

Model ancaman aplikasi ini kecil: bundle statis, tanpa backend, tanpa auth, tanpa
third-party origin. Permukaan serangnya menyempit ke tiga hal — sink injeksi di
renderer, penanganan path di server preview, dan postur header.

## Temuan & Perbaikan

| # | Sev | Temuan | Vektor | Perbaikan |
|---|---|---|---|---|
| 1 | **Sedang** | `renderServices()` & `renderIncidents()` menyusun markup via template literal lalu menulis ke `innerHTML` tanpa escaping | XSS tersimpan — `title`/`summary`/`name` adalah data, bukan markup | `scripts/escape-html.mjs` (`escapeHtml`/`escapeAttr`), diterapkan ke **setiap** interpolasi teks & atribut |
| 2 | **Sedang** | `decodeURIComponent()` dipanggil langsung di handler; input `%E0%A4%A` melempar `URIError` dan memutus koneksi | DoS ringan / handler crash | `safeDecode()` dengan fallback ke path mentah |
| 3 | Rendah | Traversal `../` hanya dibersihkan dengan regex prefix, bukan resolusi path | Pembacaan file di luar document root | `resolveSafePath()` berbasis `resolve()` + cek `startsWith(root + sep)` → **403** |
| 4 | Rendah | Tidak ada security header sama sekali | Clickjacking, MIME sniffing, kebocoran referrer | `scripts/security-headers.mjs` — CSP, `nosniff`, `X-Frame-Options: DENY`, `referrer-policy`, COOP, `permissions-policy` |

### Catatan desain escaping

`&` diganti lebih dulu agar entitas yang sudah ada tidak ter-encode ganda menjadi
`&amp;lt;`. `escapeAttr` sengaja dipisah sebagai niat eksplisit untuk call site
atribut (`data-*`, `title=`), meski implementasinya identik — supaya reviewer tahu
konteksnya tanpa menebak.

### Catatan CSP

`script-src 'self'` tanpa `unsafe-inline` **valid** karena seluruh JS ada di modul
eksternal; tidak ada handler inline di `index.html`. `frame-ancestors 'none'`
dipasangkan dengan `X-Frame-Options: DENY` untuk cakupan engine lama.

## Bug Non-Keamanan yang Ikut Ditemukan

`scripts/serve.mjs` memanggil `server.listen()` di top-level. Saat modul di-import
oleh test, handle server tetap terbuka sehingga event loop `node --test` tidak pernah
kosong dan suite **timeout 30 detik**. Diperbaiki dengan guard `invokedDirectly`
(pola sama seperti `build-health.mjs`) + ekspor `server` untuk probe.

## Verification Gate

| Gate | Perintah | Hasil |
|---|---|---|
| Unit + kontrak + smoke + security | `node --test tests/*.test.mjs` | **46/46 PASS, exit 0** |
| Anti-drift kontrak health | `node scripts/build-health.mjs --check` | `OK: health.json matches SERVICES`, exit 0 |
| Probe live atas kabel nyata | `node scripts/audit-live.mjs` | `OK: live probe passed`, exit 0 |

Probe live membuktikan hardening berlaku **over the wire**, bukan hanya di unit test:
header terpasang pada respons 200, traversal polos & ter-encode sama-sama 403 tanpa
membocorkan `/etc/passwd`, encoding rusak 404 tanpa crash, `health.json` tersaji
`application/json` + `nosniff`, dan mount point halaman tetap utuh.

## Cakupan Test Keamanan (14 test baru)

Escaping lima karakter breakout, anti double-encode, koersi non-string/nullish,
breakout atribut via kutip ganda, payload `img onerror`, traversal polos, traversal
ter-encode, path bersarang sah, `safeDecode` atas input rusak, kelengkapan header,
merge header non-mutatif, larangan `unsafe-inline`/origin eksternal, serta dua test
render yang menyuntik judul insiden dan nama service berisi markup.

## Risiko Residual (diterima)

1. **Tanpa SRI / hash CSP** — bundle same-origin, belum perlu; relevan bila kelak
   memakai CDN.
2. **`health.json` statis** — bukan hasil probe runtime, jadi bisa "hijau" saat
   layanan benar-benar down. Mitigasi saat ini adalah generator anti-drift; probe
   runtime sungguhan di luar scope Sprint 2.
3. **Server preview bukan untuk produksi** — tanpa rate limit, TLS, dan cache
   header. Deployment produksi memakai hosting statis.
4. **`innerHTML` masih dipakai** — dipertahankan (bukan `textContent`) karena
   markup memang dibangun; keamanannya kini bergantung pada disiplin escaping.
   Setiap interpolasi baru **wajib** melewati `escapeHtml`/`escapeAttr`.

## Rekomendasi Lanjutan

- Tambahkan lint sederhana yang menolak `${...}` mentah di dalam template markup.
- Bila `health.json` kelak diisi runtime, tambahkan `checkedAt` freshness threshold.
- Pertimbangkan `Strict-Transport-Security` saat pindah ke domain sendiri.

## Kesimpulan

Tidak ada blocker rilis. Seluruh temuan tertutup dan terkunci test. **DARKOWL-2633
dinyatakan LULUS.**
