/**
 * Aplikasi Jadwal Waktu Shalat
 * Menampilkan waktu shalat berdasarkan lokasi pengguna dengan countdown otomatis
 */
(() => {
    // ===== KONFIGURASI =====

    /** Locale untuk format tanggal Indonesia */
    const DATE_LOCALE = 'id-ID';

    /** Batas waktu countdown ditampilkan (dalam menit) */
    const COUNTDOWN_WINDOW_MINUTES = 60;

    /** Label default jika lokasi tidak terdeteksi */
    const DEFAULT_LOCATION_LABEL = 'Indonesia';

    /** Mapping nama shalat dalam bahasa Indonesia */
    const PRAYER_NAMES = {
        imsak: 'Imsak',
        fajr: 'Subuh',
        syuruq: 'Terbit',
        dhuhr: 'Dzuhur',
        asr: 'Ashar',
        maghrib: 'Maghrib',
        isha: 'Isya'
    };

    /** Icon emoji untuk setiap waktu shalat */
    const PRAYER_ICONS = {
        imsak: '🌘',
        fajr: '🌄',
        syuruq: '🌅',
        dhuhr: '🌞',
        asr: '🌇',
        maghrib: '🌆',
        isha: '🌙'
    };

    /** Daftar shalat wajib (tanpa imsak dan syuruq) */
    const MAIN_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

    /** Daftar lengkap semua waktu shalat termasuk imsak dan syuruq */
    const ALL_PRAYERS = ['imsak', 'fajr', 'syuruq', 'dhuhr', 'asr', 'maghrib', 'isha'];

    /** Formatter untuk menampilkan tanggal dalam format Indonesia */
    const DATE_FORMATTER = new Intl.DateTimeFormat(DATE_LOCALE, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    /** Referensi ke elemen DOM yang digunakan di aplikasi */
    const elements = {
        clock: document.getElementById('clock'),
        date: document.getElementById('date'),
        location: document.getElementById('location'),
        countdown: document.getElementById('countdown'),
        countdownText: document.getElementById('countdown-text'),
        loading: document.getElementById('loading'),
        error: document.getElementById('error'),
        errorText: document.getElementById('error-text'),
        prayerTimes: document.getElementById('prayer-times')
    };

    /** Menyimpan data waktu shalat yang sudah diambil dari API */
    let prayerTimesData = null;

    // ===== UTILITY FUNCTIONS =====

    /** Menyembunyikan elemen dengan menambahkan class 'hidden' */
    const hideElement = (element) => element.classList.add('hidden');

    /** Menampilkan elemen dengan menghapus class 'hidden' */
    const showElement = (element) => element.classList.remove('hidden');

    /** Mengecek apakah dua tanggal berada di hari yang sama */
    const isSameDay = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    /** Menghitung selisih waktu dalam menit */
    const getMinutesUntil = (target, now) =>
        Math.ceil((target.getTime() - now.getTime()) / 60000);

    /**
     * Mencari waktu shalat berikutnya dari waktu saat ini
     * @param {Object} times - Objek berisi waktu shalat
     * @param {Date} baseDate - Waktu acuan untuk pencarian
     * @returns {Object|null} Objek berisi key shalat dan Date, atau null
     */
    const findNextPrayer = (times, baseDate = new Date()) => {
        let result = null;

        // Loop untuk cek semua shalat wajib
        for (const key of MAIN_PRAYERS) {
            const timeStr = times[key];
            if (!timeStr) continue;

            // Parse waktu shalat menjadi Date object
            const [hours, minutes] = timeStr.split(':').map(Number);
            const candidate = new Date(baseDate);
            candidate.setHours(hours, minutes, 0, 0);

            // Jika waktu sudah lewat, geser ke hari berikutnya
            if (candidate <= baseDate) {
                candidate.setDate(candidate.getDate() + 1);
            }

            // Simpan jika ini shalat paling dekat
            if (!result || candidate < result.date) {
                result = { key, date: candidate };
            }
        }

        return result;
    };

    /** Membuat pesan countdown dalam bahasa Indonesia */
    const formatCountdownMessage = (minutes, prayerKey) =>
        `${minutes} menit lagi masuk waktu shalat ${PRAYER_NAMES[prayerKey]}`;

    /**
     * Membuat elemen HTML untuk satu waktu shalat
     * @param {string} prayerKey - Key nama shalat (fajr, dhuhr, dst)
     * @param {string} time - Waktu dalam format HH:MM
     * @param {boolean} isNext - Apakah ini shalat berikutnya
     * @returns {HTMLElement} Elemen div untuk item waktu shalat
     */
    const createPrayerItem = (prayerKey, time, isNext) => {
        const item = document.createElement('div');
        item.className = 'prayer-item';

        // Highlight shalat berikutnya dengan class 'active'
        if (isNext) {
            item.classList.add('active');
        }

        const displayTime = time || '--:--';

        item.innerHTML = `
            <div class="prayer-name-wrapper">
                <span class="prayer-icon">${PRAYER_ICONS[prayerKey]}</span>
                <div class="prayer-label">
                    <span class="prayer-name">${PRAYER_NAMES[prayerKey]}</span>
                </div>
            </div>
            <span class="prayer-time">
                ${displayTime}
            </span>
        `;

        return item;
    };

    // ===== FUNGSI UPDATE UI =====

    /**
     * Update jam digital dan tanggal setiap detik
     * Dipanggil setiap 1 detik oleh setInterval
     */
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        elements.clock.textContent = `${hours}:${minutes}:${seconds}`;
        elements.date.textContent = DATE_FORMATTER.format(now);

        // Update countdown setiap jam berubah
        updateCountdown(now);
    }

    /**
     * Update countdown menuju waktu shalat berikutnya
     * Countdown hanya ditampilkan jika tersisa <= 60 menit
     * @param {Date} now - Waktu saat ini
     */
    function updateCountdown(now = new Date()) {
        // Cek apakah data waktu shalat sudah ada
        if (!prayerTimesData) {
            hideElement(elements.countdown);
            return;
        }

        const nextPrayer = findNextPrayer(prayerTimesData, now);

        // Sembunyikan countdown jika shalat berikutnya bukan hari ini
        if (!nextPrayer || !isSameDay(nextPrayer.date, now)) {
            hideElement(elements.countdown);
            return;
        }

        const minutesRemaining = getMinutesUntil(nextPrayer.date, now);

        // Tampilkan countdown hanya jika tersisa 1-60 menit
        if (minutesRemaining > 0 && minutesRemaining <= COUNTDOWN_WINDOW_MINUTES) {
            elements.countdownText.textContent = formatCountdownMessage(minutesRemaining, nextPrayer.key);
            showElement(elements.countdown);
        } else {
            hideElement(elements.countdown);
        }
    }

    /**
     * Menampilkan semua waktu shalat ke UI
     * Shalat berikutnya akan di-highlight dengan class 'active'
     * @param {Object} times - Objek berisi semua waktu shalat
     */
    function displayPrayerTimes(times) {
        prayerTimesData = times;

        const now = new Date();
        const nextPrayer = findNextPrayer(times, now);

        // Tentukan shalat mana yang harus di-highlight
        const highlightPrayerKey =
            nextPrayer && isSameDay(nextPrayer.date, now) ? nextPrayer.key : null;

        // Buat semua elemen waktu shalat menggunakan DocumentFragment untuk performa
        const fragment = document.createDocumentFragment();
        for (const prayer of ALL_PRAYERS) {
            fragment.appendChild(
                createPrayerItem(prayer, times[prayer], prayer === highlightPrayerKey)
            );
        }

        // Render ke DOM
        elements.prayerTimes.innerHTML = '';
        elements.prayerTimes.appendChild(fragment);
        showElement(elements.prayerTimes);

        updateCountdown(now);
    }

    // ===== FUNGSI API & LOKASI =====

    /**
     * Mendapatkan koordinat lokasi pengguna menggunakan Geolocation API
     * @returns {Promise<{lat: number, lng: number}>} Koordinat latitude dan longitude
     * @throws {Error} Jika browser tidak support atau izin ditolak
     */
    async function getLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation tidak didukung browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                () => reject(new Error('Gagal mendapatkan lokasi. Pastikan GPS aktif.')),
                {
                    enableHighAccuracy: false,
                    timeout: 5000,
                    maximumAge: 600000 // Cache lokasi selama 10 menit
                }
            );
        });
    }

    /**
     * Reverse geocoding untuk mendapatkan nama kota dari koordinat
     * Menggunakan OpenStreetMap Nominatim API
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<string>} Nama kota atau default label jika gagal
     */
    async function getCityName(lat, lng) {
        try {
            // Setup timeout untuk request (3 detik)
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1&accept-language=id`,
                { signal: controller.signal }
            );

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error('Failed');
            }

            const data = await response.json();
            const address = data.address || {};

            // Cari nama lokasi dengan prioritas: city > town > county > state
            return address.city || address.town || address.county || address.state || DEFAULT_LOCATION_LABEL;
        } catch (_error) {
            // Return default jika gagal (tidak masalah, bukan error kritis)
            return DEFAULT_LOCATION_LABEL;
        }
    }

    /**
     * Mengambil data waktu shalat dari Aladhan API
     * @param {number} lat - Latitude lokasi
     * @param {number} lng - Longitude lokasi
     * @returns {Promise<Object>} Objek berisi semua waktu shalat
     * @throws {Error} Jika API gagal atau timeout
     */
    async function fetchPrayerTimes(lat, lng) {
        const date = new Date();
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        // method=20: Metode perhitungan Kemenag Indonesia
        // tune: Koreksi waktu shalat (dalam menit) untuk setiap waktu
        // Imsak,Fajr,Sunrise,Dhuhr,Asr,Maghrib,Sunset,Isha,Midnight
        const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=20&tune=3,3,-3,3,3,3,4,3,0`;

        try {
            // Setup timeout untuk request (10 detik)
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error('Layanan jadwal sholat sedang tidak tersedia. Silakan coba lagi nanti.');
            }

            const data = await response.json();
            const timings = data.data.timings;

            // Map response API ke format yang digunakan aplikasi
            // substring(0, 5) untuk ambil HH:MM saja (tanpa timezone)
            return {
                imsak: timings.Imsak.substring(0, 5),
                fajr: timings.Fajr.substring(0, 5),
                syuruq: timings.Sunrise.substring(0, 5),
                dhuhr: timings.Dhuhr.substring(0, 5),
                asr: timings.Asr.substring(0, 5),
                maghrib: timings.Maghrib.substring(0, 5),
                isha: timings.Isha.substring(0, 5)
            };
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Koneksi timeout. Periksa koneksi internet Anda.');
            }

            throw new Error(error.message || 'Layanan jadwal sholat sedang tidak tersedia. Silakan coba lagi nanti.');
        }
    }

    // ===== FUNGSI HELPER UI =====

    /** Menampilkan pesan error ke pengguna */
    function showError(message) {
        elements.errorText.textContent = message;
        showElement(elements.error);
    }

    /** Menyembunyikan loading spinner */
    function hideLoading() {
        hideElement(elements.loading);
    }

    // ===== INISIALISASI APLIKASI =====

    /**
     * Fungsi utama yang dijalankan saat aplikasi dimuat
     * 1. Mulai jam digital
     * 2. Ambil lokasi pengguna
     * 3. Ambil nama kota (non-blocking)
     * 4. Ambil jadwal shalat dari API
     * 5. Tampilkan waktu shalat
     */
    async function init() {
        // Mulai jam digital
        updateClock();
        setInterval(updateClock, 1000); // Update setiap detik

        // Set default UI
        elements.location.textContent = DEFAULT_LOCATION_LABEL;
        hideElement(elements.error);

        try {
            // Dapatkan koordinat pengguna (memerlukan izin)
            const { lat, lng } = await getLocation();

            // Ambil nama kota secara asynchronous (tidak perlu ditunggu)
            getCityName(lat, lng)
                .then((city) => {
                    elements.location.textContent = city || DEFAULT_LOCATION_LABEL;
                })
                .catch(() => {
                    elements.location.textContent = DEFAULT_LOCATION_LABEL;
                });

            // Ambil jadwal shalat dari API (critical - harus berhasil)
            const times = await fetchPrayerTimes(lat, lng);
            displayPrayerTimes(times);
            hideLoading();
        } catch (error) {
            // Tangani error dan tampilkan pesan ke pengguna
            hideLoading();
            showError(error.message);
        }
    }

    // Jalankan aplikasi saat script dimuat
    init();
})();
