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

## Tech Stack

- HTML + CSS + JavaScript murni (vanilla, tanpa framework)
- Aladhan API - Perhitungan waktu sholat (metode Kemenag)
- OpenStreetMap Nominatim - Reverse geocoding
- Size total ~8KB (super ringan!)

---

Made with ❤️ for Indonesian Muslims
