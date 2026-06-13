# Jadwal Sholat Real-time

Website untuk cek jadwal sholat berdasarkan lokasi GPS. Gratis, tanpa iklan.

🌐 **Live at**: [sholatku.com](https://sholatku.com/)

## Fitur

- **Jadwal Sholat Otomatis** - Deteksi lokasi pakai GPS, jadwal langsung muncul
- **7 Waktu Sholat** - Imsak, Subuh, Terbit, Dzuhur, Ashar, Maghrib, Isya
- **Countdown** - Notifikasi 60 menit sebelum waktu sholat
- **Arah Kiblat** - Kompas digital untuk smartphone/tablet
- **Dark Mode** - Nyaman di mata, default gelap
- **Share WhatsApp** - Bagikan jadwal ke keluarga/teman
- **Copy Clipboard** - Bisa copy jadwal untuk share kemana aja

## Installation

1. **Clone repository**
   ```bash
   git clone https://github.com/kusandriadi/salat-time.git
   cd salat-time
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Buka aplikasi**
   - Langsung buka `index.html` di browser, atau
   - Gunakan local server (misal: Live Server di VS Code)

**Catatan**: Dependencies hanya untuk development tools. Aplikasi bisa langsung dibuka di browser tanpa build process.

## REST API

Jadwal sholat tersedia sebagai REST API statis (JSON), tanpa server — bisa diakses langsung dari hosting GitHub Pages. Setiap kota/kabupaten punya **kode 4 digit** (`PPCC`: 2 digit provinsi + 2 digit kota) yang stabil dan tidak berubah antar build.

Base URL: `https://sholatku.com/kemenag/api/v1`

| Endpoint | Keterangan |
|---|---|
| `GET /index.json` | Metadata API + daftar endpoint |
| `GET /cities.json` | Daftar semua kota (`code`, `kota`, `provinsi`) — untuk pencarian |
| `GET /jadwal/{code}/{year}.json` | Jadwal 1 tahun penuh untuk 1 kota |

**Cari kode kota** dari `cities.json`, lalu ambil jadwalnya:

```bash
# 1. Cari kode kota (mis. Kota Jakarta -> 0602)
curl https://sholatku.com/kemenag/api/v1/cities.json | jq '.[] | select(.kota | test("Jakarta"))'

# 2. Ambil jadwal setahun
curl https://sholatku.com/kemenag/api/v1/jadwal/0602/2026.json
```

Contoh respons `jadwal/0602/2026.json`:

```json
{
  "code": "0602",
  "kota": "Kota Jakarta",
  "provinsi": "DKI Jakarta",
  "tahun": 2026,
  "jadwal": {
    "01/01/2026": {
      "hari": "Kamis",
      "imsak": "04:09", "subuh": "04:19", "terbit": "05:39", "dhuha": "06:08",
      "dzuhur": "12:00", "ashar": "15:26", "maghrib": "18:14", "isya": "19:29"
    }
  }
}
```

Tanggal hari ini tinggal dipilih klien dari key `DD/MM/YYYY`. Tahun tersedia: **2026–2028**.

### Kode provinsi (2 digit pertama)

Kode kota berformat `PPCC` — `PP` provinsi, `CC` urutan kota dalam provinsi. Daftar lengkap kota ada di `cities.json`.

| Kode | Provinsi | Jumlah kota |
|---|---|---|
| `01` | Aceh | 23 |
| `02` | Bali | 9 |
| `03` | Banten | 8 |
| `04` | Bengkulu | 10 |
| `05` | DI Yogyakarta | 5 |
| `06` | DKI Jakarta | 2 |
| `07` | Gorontalo | 6 |
| `08` | Jambi | 11 |
| `09` | Jawa Barat | 27 |
| `10` | Jawa Tengah | 35 |
| `11` | Jawa Timur | 38 |
| `12` | Kalimantan Barat | 14 |
| `13` | Kalimantan Selatan | 13 |
| `14` | Kalimantan Tengah | 14 |
| `15` | Kalimantan Timur | 10 |
| `16` | Kalimantan Utara | 5 |
| `17` | Kepulauan Bangka Belitung | 7 |
| `18` | Kepulauan Riau | 12 |
| `19` | Lampung | 15 |
| `20` | Maluku | 11 |
| `21` | Maluku Utara | 11 |
| `22` | Nusa Tenggara Barat | 10 |
| `23` | Nusa Tenggara Timur | 22 |
| `24` | Papua | 10 |
| `25` | Papua Barat | 7 |
| `26` | Papua Barat Daya | 6 |
| `27` | Papua Pegunungan | 8 |
| `28` | Papua Selatan | 4 |
| `29` | Papua Tengah | 8 |
| `30` | Riau | 12 |
| `31` | Sulawesi Barat | 6 |
| `32` | Sulawesi Selatan | 24 |
| `33` | Sulawesi Tengah | 13 |
| `34` | Sulawesi Tenggara | 17 |
| `35` | Sulawesi Utara | 15 |
| `36` | Sumatera Barat | 19 |
| `37` | Sumatera Selatan | 17 |
| `38` | Sumatera Utara | 33 |

API digenerate dari data di folder `kemenag/` oleh `scripts/build-api.js` (`bun run build:api`) — dijalankan otomatis saat deploy.

## Tech Stack

- HTML + CSS + JavaScript murni (vanilla, tanpa framework)
- Aladhan API - Perhitungan waktu sholat (metode Kemenag)
- OpenStreetMap Nominatim - Reverse geocoding
- Size total ~8KB (super ringan!)

---

Made with ❤️ for Indonesian Muslims
