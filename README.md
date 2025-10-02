# 🕌 Salat Time - Aplikasi Jadwal Sholat Real-time

Aplikasi jadwal sholat real-time yang mendeteksi lokasi pengguna secara otomatis dan menampilkan waktu sholat yang akurat dengan interface yang modern dan responsif.

## ✨ Fitur Utama

### 🎯 Fitur Inti
- **Real-time Clock** - Jam digital format 24 jam (HH:MM:SS) yang update setiap detik
- **Auto Location Detection** - Deteksi lokasi otomatis menggunakan GPS browser
- **7 Waktu Sholat Lengkap**:
  - Imsak (10 menit sebelum Subuh)
  - Subuh (Fajr) - waktu sholat utama
  - Syuruq (Sunrise)
  - Dzuhur (Dhuhr) - waktu sholat utama
  - Ashar (Asr) - waktu sholat utama
  - Maghrib - waktu sholat utama
  - Isya (Isha) - waktu sholat utama

### 🔄 Fitur Real-time
- **30-Minute Countdown Alert** - Notifikasi otomatis muncul 30 menit sebelum waktu sholat (hanya untuk 5 waktu sholat utama)
- **Live Digital Clock** - Jam yang selalu update setiap detik
- **Auto Refresh** - Update otomatis setiap hari

### 🎨 User Interface
- **Responsive Design** - Optimal di semua perangkat (smartphone, tablet, desktop)
- **Clean & Professional UI** - Desain minimalis dengan warna hijau emerald yang tenang
- **Gradient Background** - Background gradient hijau-tosca yang nyaman di mata
- **Card-based Layout** - Informasi tersusun rapi dalam kartu dengan shadow halus
- **Visual Hierarchy** - 5 waktu sholat utama dengan label lebih gelap, Imsak & Syuruq dengan label lebih terang

### 🔧 Fitur Teknis
- **Multiple Calculation Methods** - Mendukung berbagai metode perhitungan
- **Error Handling** - Penanganan error yang komprehensif
- **Performance Optimized** - Loading cepat dan responsif
- **SEO Optimized** - Meta tags lengkap untuk mesin pencari (Google, Bing, dll)
- **Keywords**: jadwal sholat, waktu sholat, jam sholat, prayer time, solat time, dan lainnya

## 🏗️ Arsitektur

### Object-Oriented Programming (OOP)
Aplikasi ini dibangun dengan konsep OOP menggunakan:

- **LocationService** (Singleton Pattern)
  - Mengelola deteksi dan caching lokasi pengguna
  - Auto-retry mechanism untuk geolocation

- **SimplePrayerCalculator** (Singleton Pattern)
  - Algoritma perhitungan waktu sholat yang akurat
  - Mendukung berbagai zona waktu

- **Pinia Store** (State Management)
  - Centralized state management
  - Reactive data updates

### Tech Stack
- **Vue.js 3** - Frontend framework dengan Composition API
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework
- **Pinia** - State management untuk Vue 3
- **Vite** - Fast build tool dan development server

## 🚀 Cara Menjalankan Aplikasi

### Prerequisites
Pastikan Anda telah menginstall:
- **Node.js** (versi 16 atau lebih baru)
- **npm** atau **yarn**

### Langkah Instalasi

1. **Clone atau Download Repository**
   ```bash
   # Jika menggunakan Git
   git clone <repository-url>
   cd salat-time

   # Atau download dan extract ZIP file
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Jalankan Development Server**
   ```bash
   npm run dev
   ```

4. **Buka Browser**
   - Aplikasi akan berjalan di: `http://localhost:5173`
   - Pastikan memberikan **permission untuk akses lokasi** ketika diminta browser

### Build untuk Production

```bash
# Build aplikasi untuk production
npm run build

# Preview build hasil
npm run preview
```

## 🌍 Penggunaan

### Pertama Kali Akses
1. **Permission Request** - Browser akan meminta izin akses lokasi
2. **Klik "Allow"** untuk memberikan permission
3. **Loading** - Aplikasi akan mendeteksi lokasi dan menghitung jadwal sholat
4. **Jadwal Muncul** - Semua waktu sholat akan ditampilkan

### Fitur-fitur yang Tersedia
- **Current Time** - Jam digital format 24 jam (HH:MM:SS) di bagian atas
- **Current Date** - Tanggal lengkap dalam bahasa Indonesia
- **30-Minute Alert** - Banner hijau otomatis muncul 30 menit sebelum waktu sholat
- **Prayer Times List** - Daftar lengkap 7 waktu sholat dengan visual hierarchy
- **Location Info** - Informasi kota berdasarkan GPS
- **Refresh Button** - Tombol untuk memperbarui lokasi (saat error)

### Troubleshooting
- **Jadwal tidak muncul**: Pastikan permission lokasi sudah diberikan
- **Loading terus**: Refresh halaman dan berikan permission lagi
- **Waktu tidak akurat**: Klik tombol "Perbarui Lokasi"

## 🔧 Kustomisasi

### Warna dan Tema
Aplikasi menggunakan skema warna yang profesional dan nyaman:
- **Primary**: Emerald Green (`emerald-600`, `emerald-700`)
- **Background**: Gradient dari emerald-50 ke cyan-50
- **Text**: Slate gray untuk keterbacaan optimal
- **Visual Distinction**: Label waktu sholat utama lebih gelap (slate-700), Imsak & Syuruq lebih terang (slate-500)

## 📱 Kompatibilitas

### Browser Support
- ✅ Chrome/Chromium (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers

### Device Support
- ✅ Desktop (Windows, Mac, Linux)
- ✅ Tablet (iPad, Android tablets)
- ✅ Mobile (iOS, Android)

## 🛠️ Development

### Project Structure
```
src/
├── components/          # Vue components
│   ├── PrayerTimesDisplay.vue
│   └── TestCalculator.vue
├── services/           # Business logic (OOP)
│   ├── LocationService.ts
│   └── SimplePrayerCalculator.ts
├── stores/             # Pinia stores
│   └── prayerTimes.ts
├── views/              # Page views
│   └── HomeView.vue
└── router/             # Vue router
    └── index.ts
```

### Available Scripts
```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

## 📞 Support

Jika mengalami masalah atau butuh bantuan:
1. Pastikan permission lokasi sudah diberikan
2. Cek browser console untuk error messages (F12)
3. Refresh halaman dan coba lagi
4. Pastikan koneksi internet stabil (untuk reverse geocoding)

---

**Made with ❤️ using Vue.js & TypeScript**