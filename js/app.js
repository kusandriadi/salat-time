(() => {
    const DATE_LOCALE = 'id-ID';
    const COUNTDOWN_WINDOW_MINUTES = 60;
    const DEFAULT_LOCATION_LABEL = 'Indonesia';
    // Koordinat Ka'bah yang presisi (Makkah, Saudi Arabia)
    const KAABA_LAT = 21.422487;
    const KAABA_LNG = 39.826206;
    const WEBSITE_URL = 'https://sholatku.com/'; // Ganti dengan URL website Anda

    const PRAYER_NAMES = {
        imsak: 'Imsak',
        fajr: 'Subuh',
        syuruq: 'Terbit',
        dhuha: 'Dhuha',
        dhuhr: 'Dzuhur',
        asr: 'Ashar',
        maghrib: 'Maghrib',
        isha: 'Isya'
    };

    const PRAYER_ICONS = {
        imsak: '🌘',
        fajr: '🌄',
        syuruq: '🌅',
        dhuha: '☀️',
        dhuhr: '🌞',
        asr: '🌇',
        maghrib: '🌆',
        isha: '🌙'
    };

    const MAIN_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const ALL_PRAYERS = ['imsak', 'fajr', 'syuruq', 'dhuha', 'dhuhr', 'asr', 'maghrib', 'isha'];

    const DATE_FORMATTER = new Intl.DateTimeFormat(DATE_LOCALE, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const elements = {
        clock: document.getElementById('clock'),
        date: document.getElementById('date'),
        location: document.getElementById('location'),
        countdown: document.getElementById('countdown'),
        countdownText: document.getElementById('countdown-text'),
        loading: document.getElementById('loading'),
        error: document.getElementById('error'),
        errorText: document.getElementById('error-text'),
        prayerTimes: document.getElementById('prayer-times'),
        btnShare: document.getElementById('btn-share'),
        btnQibla: document.getElementById('btn-qibla'),
        btnCloseQibla: document.getElementById('btn-close-qibla'),
        qiblaCard: document.getElementById('qibla-card'),
        qiblaDegree: document.getElementById('qibla-degree'),
        qiblaStatus: document.getElementById('qibla-status'),
        qiblaError: document.getElementById('qibla-error'),
        compassCircle: document.getElementById('compass-circle'),
        compassTopMarker: document.getElementById('compass-top-marker'),
        shareModal: document.getElementById('share-modal'),
        btnShareNext: document.getElementById('btn-share-next'),
        btnShareAll: document.getElementById('btn-share-all'),
        btnCopyNext: document.getElementById('btn-copy-next'),
        btnCopyAll: document.getElementById('btn-copy-all'),
        btnCloseShare: document.getElementById('btn-close-share'),
        citySearch: document.getElementById('city-search'),
        cityInput: document.getElementById('city-input'),
        cityResults: document.getElementById('city-results'),
        btnGps: document.getElementById('btn-gps')
    };

    let prayerTimesData = null;
    let userLocation = null;
    let cityIndex = null;
    let qiblaDirection = null;
    let deviceOrientation = null;
    let orientationListener = null;

    const hideElement = (element) => element.classList.add('hidden');
    const showElement = (element) => element.classList.remove('hidden');

    const isSameDay = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    const getMinutesUntil = (target, now) =>
        Math.ceil((target.getTime() - now.getTime()) / 60000);

    const findNextPrayer = (times, baseDate = new Date()) => {
        let result = null;

        for (const key of MAIN_PRAYERS) {
            const timeStr = times[key];
            if (!timeStr) continue;

            const [hours, minutes] = timeStr.split(':').map(Number);
            const candidate = new Date(baseDate);
            candidate.setHours(hours, minutes, 0, 0);

            if (candidate <= baseDate) {
                candidate.setDate(candidate.getDate() + 1);
            }

            if (!result || candidate < result.date) {
                result = { key, date: candidate };
            }
        }

        return result;
    };

    const formatCountdownMessage = (minutes, prayerKey) =>
        `${minutes} menit lagi masuk waktu shalat ${PRAYER_NAMES[prayerKey]}`;

    const createPrayerItem = (prayerKey, time, isNext) => {
        const item = document.createElement('div');
        item.className = 'prayer-item';

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

    // ========================================
    // THEME MANAGEMENT
    // ========================================

    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark'; // Default dark
        applyTheme(savedTheme);

        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                applyTheme(theme);
                localStorage.setItem('theme', theme);
            });
        });
    }

    function applyTheme(theme) {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const themeBtn = document.querySelector(`[data-theme="${theme}"]`);
        if (themeBtn) {
            themeBtn.classList.add('active');
        }

        document.documentElement.setAttribute('data-theme', theme);
    }

    // ========================================
    // QIBLA DIRECTION
    // ========================================

    function calculateQiblaDirection(lat, lng) {
        // Convert degrees to radians
        const toRad = (deg) => deg * Math.PI / 180;
        const toDeg = (rad) => rad * 180 / Math.PI;

        // Convert coordinates to radians
        const lat1 = toRad(lat);
        const lng1 = toRad(lng);
        const lat2 = toRad(KAABA_LAT);
        const lng2 = toRad(KAABA_LNG);

        // Calculate difference in longitude
        const dLng = lng2 - lng1;

        // Calculate bearing using Great Circle formula
        // This is the standard formula used in aviation and navigation
        const y = Math.sin(dLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
                  Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

        // Convert to degrees and normalize to 0-360
        let bearing = toDeg(Math.atan2(y, x));
        bearing = (bearing + 360) % 360;

        return bearing;
    }

    function updateCompass(heading) {
        if (!qiblaDirection) return;

        // Calculate rotation to align Kaaba icon with actual qibla direction
        // heading = current device heading (where device is pointing)
        // qiblaDirection = actual direction to Kaaba
        // We rotate the compass so that the Kaaba icon aligns with top marker
        const rotation = qiblaDirection - heading;
        elements.compassCircle.style.transform = `rotate(${rotation}deg)`;

        // Debug info - show current heading
        const debugInfo = `Kiblat: ${Math.round(qiblaDirection)}° | Arah: ${Math.round(heading)}°`;
        elements.qiblaDegree.textContent = debugInfo;

        // Update status based on how close to qibla
        updateQiblaStatus(rotation);
    }

    function updateQiblaStatus(rotation) {
        // Normalize rotation to 0-360
        const normalizedRotation = ((rotation % 360) + 360) % 360;

        // Calculate how close to pointing up (0 degrees)
        const closeness = Math.min(normalizedRotation, 360 - normalizedRotation);

        // Remove previous classes
        elements.compassTopMarker.classList.remove('correct', 'incorrect');

        if (closeness < 5) {
            elements.qiblaStatus.textContent = '✓ Arah Kiblat Tepat!';
            elements.qiblaStatus.style.color = '#059669';
            elements.qiblaStatus.style.fontWeight = '700';
            elements.compassTopMarker.classList.add('correct');
        } else if (closeness < 15) {
            elements.qiblaStatus.textContent = 'Hampir tepat, sedikit lagi...';
            elements.qiblaStatus.style.color = '#ea580c';
            elements.qiblaStatus.style.fontWeight = '500';
            elements.compassTopMarker.classList.add('incorrect');
        } else {
            elements.qiblaStatus.textContent = 'Putar perangkat agar Ka\'bah di atas';
            elements.qiblaStatus.style.color = 'var(--text-secondary)';
            elements.qiblaStatus.style.fontWeight = '500';
            elements.compassTopMarker.classList.add('incorrect');
        }
    }

    function startCompass() {
        if (!userLocation) {
            showQiblaError('Lokasi tidak tersedia. Pastikan GPS aktif.');
            return;
        }

        qiblaDirection = calculateQiblaDirection(userLocation.lat, userLocation.lng);
        elements.qiblaDegree.textContent = `${Math.round(qiblaDirection)}°`;

        if (!window.DeviceOrientationEvent) {
            showQiblaError('Kompas tidak didukung di perangkat ini.');
            updateCompass(0);
            elements.qiblaStatus.textContent = 'Gunakan kompas fisik untuk navigasi';
            return;
        }

        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        startOrientationListener();
                    } else {
                        showQiblaError('Permission untuk kompas ditolak.');
                        updateCompass(0);
                    }
                })
                .catch(console.error);
        } else {
            startOrientationListener();
        }
    }

    function startOrientationListener() {
        hideElement(elements.qiblaError);
        elements.qiblaStatus.textContent = 'Putar perangkat agar Ka\'bah di atas';

        orientationListener = (event) => {
            let heading = null;

            // iOS Safari with webkitCompassHeading
            if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
                // webkitCompassHeading: 0 = North, increases clockwise (0-360)
                heading = event.webkitCompassHeading;
            }
            // Standard deviceorientation event (Android, Chrome, etc)
            else if (event.alpha !== null) {
                // On Android, alpha needs to be converted
                // Formula from MDN and Stack Overflow for correct compass heading
                heading = Math.abs(event.alpha - 360);
            }

            if (heading !== null) {
                deviceOrientation = heading;
                updateCompass(heading);
            }
        };

        // Try absolute orientation first (better for compass)
        if (window.DeviceOrientationEvent && 'ondeviceorientationabsolute' in window) {
            window.addEventListener('deviceorientationabsolute', orientationListener, true);
        } else {
            window.addEventListener('deviceorientation', orientationListener, true);
        }
    }

    function stopCompass() {
        if (orientationListener) {
            window.removeEventListener('deviceorientationabsolute', orientationListener, true);
            window.removeEventListener('deviceorientation', orientationListener, true);
            orientationListener = null;
        }
        deviceOrientation = null;
    }

    function showQiblaError(message) {
        elements.qiblaError.textContent = message;
        showElement(elements.qiblaError);
    }

    function isMobileOrTablet() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 1024 && 'ontouchstart' in window);
    }

    function toggleQiblaCard() {
        // Check if device is mobile or tablet
        if (!isMobileOrTablet()) {
            alert('⚠️ Fitur Kompas Kiblat hanya tersedia di tablet dan smartphone.\n\nGunakan perangkat mobile untuk mengakses fitur ini.');
            return;
        }

        if (elements.qiblaCard.classList.contains('hidden')) {
            showElement(elements.qiblaCard);
            startCompass();
            setTimeout(() => {
                elements.qiblaCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        } else {
            hideElement(elements.qiblaCard);
            stopCompass();
        }
    }

    // ========================================
    // WHATSAPP SHARING
    // ========================================

    function generateShareMessage(shareType) {
        if (!prayerTimesData) {
            return '';
        }

        const locationName = elements.location.textContent || 'Lokasi Anda';
        const today = DATE_FORMATTER.format(new Date());

        let message = `*Jadwal Sholat ${locationName}*\n`;
        message += `${today}\n\n`;

        if (shareType === 'next') {
            // Share next prayer only
            const now = new Date();
            const nextPrayer = findNextPrayer(prayerTimesData, now);

            if (nextPrayer) {
                const time = prayerTimesData[nextPrayer.key];
                message += `*Sholat Berikutnya:*\n`;
                message += `${PRAYER_NAMES[nextPrayer.key]}: ${time}\n\n`;

                const minutesRemaining = getMinutesUntil(nextPrayer.date, now);
                if (minutesRemaining > 0 && minutesRemaining <= COUNTDOWN_WINDOW_MINUTES) {
                    message += `_${minutesRemaining} menit lagi_\n\n`;
                }
            }
        } else {
            // Share all prayers
            ALL_PRAYERS.forEach(prayer => {
                const time = prayerTimesData[prayer];
                if (time) {
                    message += `${PRAYER_NAMES[prayer]}: ${time}\n`;
                }
            });
            message += `\n`;
        }

        message += `${WEBSITE_URL}`;

        return message;
    }

    function shareToWhatsApp(shareType) {
        if (!prayerTimesData) {
            alert('Jadwal sholat belum dimuat');
            return;
        }

        const message = generateShareMessage(shareType);
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
        hideElement(elements.shareModal);
    }

    function copyToClipboard(shareType) {
        if (!prayerTimesData) {
            alert('Jadwal sholat belum dimuat');
            return;
        }

        const message = generateShareMessage(shareType);

        // Modern Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(message)
                .then(() => {
                    alert('✓ Jadwal sholat berhasil disalin ke clipboard!');
                    hideElement(elements.shareModal);
                })
                .catch(() => {
                    fallbackCopyToClipboard(message);
                });
        } else {
            fallbackCopyToClipboard(message);
        }
    }

    function fallbackCopyToClipboard(text) {
        // Fallback untuk browser lama
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            alert('✓ Jadwal sholat berhasil disalin ke clipboard!');
            hideElement(elements.shareModal);
        } catch (err) {
            alert('✗ Gagal menyalin. Silakan copy manual.');
        }

        document.body.removeChild(textArea);
    }

    function openShareModal() {
        if (!prayerTimesData) {
            alert('Jadwal sholat belum dimuat');
            return;
        }
        showElement(elements.shareModal);
    }

    function closeShareModal() {
        hideElement(elements.shareModal);
    }

    // ========================================
    // CLOCK & COUNTDOWN
    // ========================================

    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        elements.clock.textContent = `${hours}:${minutes}:${seconds}`;
        elements.date.textContent = DATE_FORMATTER.format(now);

        updateCountdown(now);
    }

    function updateCountdown(now = new Date()) {
        if (!prayerTimesData) {
            hideElement(elements.countdown);
            return;
        }

        const nextPrayer = findNextPrayer(prayerTimesData, now);

        if (!nextPrayer || !isSameDay(nextPrayer.date, now)) {
            hideElement(elements.countdown);
            return;
        }

        const minutesRemaining = getMinutesUntil(nextPrayer.date, now);

        if (minutesRemaining > 0 && minutesRemaining <= COUNTDOWN_WINDOW_MINUTES) {
            elements.countdownText.textContent = formatCountdownMessage(minutesRemaining, nextPrayer.key);
            showElement(elements.countdown);
        } else {
            hideElement(elements.countdown);
        }
    }

    function displayPrayerTimes(times) {
        prayerTimesData = times;

        const now = new Date();
        const nextPrayer = findNextPrayer(times, now);

        const highlightPrayerKey =
            nextPrayer && isSameDay(nextPrayer.date, now) ? nextPrayer.key : null;

        const fragment = document.createDocumentFragment();
        for (const prayer of ALL_PRAYERS) {
            fragment.appendChild(
                createPrayerItem(prayer, times[prayer], prayer === highlightPrayerKey)
            );
        }

        elements.prayerTimes.innerHTML = '';
        elements.prayerTimes.appendChild(fragment);
        showElement(elements.prayerTimes);

        updateCountdown(now);
    }

    // ========================================
    // GEOLOCATION & API
    // ========================================

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
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
            );
        });
    }

    async function getNominatimAddress(lat, lng) {
        try {
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
            return data.address || {};
        } catch (_error) {
            return {};
        }
    }

    function getDisplayName(address) {
        return address.city || address.town || address.county || address.state || DEFAULT_LOCATION_LABEL;
    }

    async function matchCityToCSV(address) {
        const response = await fetch('kemenag/index.json');
        if (!response.ok) throw new Error('Gagal memuat index kota');
        const index = await response.json();

        // Build candidate names from Nominatim address
        // Nominatim inconsistently includes/omits "Kota"/"Kabupaten" prefix,
        // so we try both with and without prefix for each field.
        const candidates = [];

        if (address.city) {
            candidates.push(address.city);
            if (!/^kota\s/i.test(address.city)) {
                candidates.push('Kota ' + address.city);
            }
        }
        if (address.county) {
            candidates.push(address.county);
            candidates.push(address.county.replace(/^Kabupaten\s+/i, 'Kab. '));
            if (!/^(kabupaten|kab\.)\s/i.test(address.county)) {
                candidates.push('Kab. ' + address.county);
            }
        }
        if (address.town) {
            candidates.push('Kota ' + address.town);
            candidates.push('Kab. ' + address.town);
        }

        // 1) Direct match
        for (const name of candidates) {
            if (index[name]) {
                return { city: name, file: index[name].file };
            }
        }

        // Normalize format but KEEP Kab./Kota prefix (they distinguish different cities)
        const normalize = (s) => s.toLowerCase()
            .replace(/^kabupaten\s+/i, 'kab. ')
            .replace(/\s*administrasi\s*/i, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // 2) Normalized exact match
        const addressNorms = candidates.map(normalize).filter(Boolean);
        for (const [csvCity, info] of Object.entries(index)) {
            const csvNorm = normalize(csvCity);
            if (addressNorms.some(n => n === csvNorm)) {
                return { city: csvCity, file: info.file };
            }
        }

        // 3) Strip directional suffix (Pusat/Timur/Selatan/Barat/Utara) and retry
        //    Handles DKI Jakarta: "Kota Administrasi Jakarta Pusat" → "kota jakarta" → matches "Kota Jakarta"
        const stripDirection = (s) => s.replace(/\s+(pusat|timur|selatan|barat|utara)$/i, '').trim();
        const strippedNorms = addressNorms.map(stripDirection).filter(Boolean);
        for (const [csvCity, info] of Object.entries(index)) {
            const csvNorm = normalize(csvCity);
            if (strippedNorms.some(n => n === csvNorm)) {
                return { city: csvCity, file: info.file };
            }
        }

        return null;
    }

    async function fetchPrayerTimesFromJSON(matchedCity) {
        const now = new Date();
        const year = now.getFullYear();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');

        const jsonFile = matchedCity.file.replace('.csv', '.json');
        const url = `kemenag/${year}/json/${jsonFile}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Data jadwal tahun ${year} tidak tersedia.`);
        }

        const data = await response.json();
        const cityData = data[matchedCity.city];
        if (!cityData) {
            throw new Error(`Kota ${matchedCity.city} tidak ditemukan dalam data.`);
        }

        // Find today's entry — keys are "Hari, DD/MM/YYYY"
        const todayStr = `${day}/${month}/${year}`;
        for (const [tanggal, times] of Object.entries(cityData)) {
            if (tanggal.includes(todayStr)) {
                return {
                    imsak: times[0],
                    fajr: times[1],
                    syuruq: times[2],
                    dhuha: times[3],
                    dhuhr: times[4],
                    asr: times[5],
                    maghrib: times[6],
                    isha: times[7]
                };
            }
        }

        throw new Error(`Jadwal shalat untuk ${matchedCity.city} tanggal ${todayStr} tidak ditemukan.`);
    }

    async function fetchPrayerTimes(lat, lng) {
        const date = new Date();
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=20`;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error('Layanan jadwal sholat sedang tidak tersedia. Silakan coba lagi nanti.');
            }

            const data = await response.json();
            const timings = data.data.timings;

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

    function showError(message) {
        elements.errorText.textContent = message;
        showElement(elements.error);
    }

    function hideLoading() {
        hideElement(elements.loading);
    }

    // ========================================
    // CITY SEARCH
    // ========================================

    async function getCityIndex() {
        if (cityIndex) return cityIndex;
        const response = await fetch('kemenag/index.json');
        if (!response.ok) throw new Error('Gagal memuat daftar kota');
        cityIndex = await response.json();
        return cityIndex;
    }

    function initCitySearch() {
        let debounceTimer = null;

        elements.cityInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => filterCities(elements.cityInput.value), 150);
        });

        elements.cityInput.addEventListener('focus', () => {
            if (elements.cityInput.value.length >= 2) {
                filterCities(elements.cityInput.value);
            }
        });

        document.addEventListener('click', (e) => {
            if (!elements.citySearch.contains(e.target)) {
                elements.cityResults.classList.add('hidden');
            }
        });

        elements.btnGps.addEventListener('click', async () => {
            localStorage.removeItem('selectedCity');
            elements.cityInput.value = '';
            elements.cityResults.classList.add('hidden');
            hideElement(elements.prayerTimes);
            hideElement(elements.error);
            showElement(elements.loading);
            await loadPrayerTimesByGPS();
        });
    }

    async function filterCities(query) {
        if (query.length < 2) {
            elements.cityResults.classList.add('hidden');
            return;
        }

        const index = await getCityIndex();
        const q = query.toLowerCase();
        const matches = Object.keys(index)
            .filter(city => city.toLowerCase().includes(q))
            .slice(0, 8);

        if (matches.length === 0) {
            elements.cityResults.classList.add('hidden');
            return;
        }

        elements.cityResults.innerHTML = matches
            .map(city => `<div class="city-result-item" data-city="${city}">${city}</div>`)
            .join('');
        elements.cityResults.classList.remove('hidden');

        elements.cityResults.querySelectorAll('.city-result-item').forEach(item => {
            item.addEventListener('click', () => selectCity(item.dataset.city));
        });
    }

    async function selectCity(cityName) {
        elements.cityResults.classList.add('hidden');
        elements.cityInput.value = '';
        elements.location.textContent = cityName;

        const index = await getCityIndex();
        const info = index[cityName];
        if (!info) return;

        localStorage.setItem('selectedCity', cityName);

        hideElement(elements.error);
        hideElement(elements.prayerTimes);
        showElement(elements.loading);

        try {
            const matchedCity = { city: cityName, file: info.file };
            elements.location.textContent = cityName;
            const times = await fetchPrayerTimesFromJSON(matchedCity);
            displayPrayerTimes(times);
        } catch (error) {
            showError(error.message);
        }

        hideElement(elements.loading);
    }

    async function loadPrayerTimesByGPS() {
        try {
            const location = await getLocation();
            userLocation = location;

            const address = await getNominatimAddress(location.lat, location.lng);

            let times;

            if (address.country_code === 'id') {
                const matchedCity = await matchCityToCSV(address);
                if (!matchedCity) {
                    throw new Error('Kota Anda tidak ditemukan dalam database Kemenag. Pastikan lokasi GPS akurat.');
                }
                elements.location.textContent = matchedCity.city;
                times = await fetchPrayerTimesFromJSON(matchedCity);
            } else {
                elements.location.textContent = getDisplayName(address);
                times = await fetchPrayerTimes(location.lat, location.lng);
            }

            displayPrayerTimes(times);
            hideElement(elements.loading);
        } catch (error) {
            hideElement(elements.loading);
            showError(error.message);
        }
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================

    elements.btnShare.addEventListener('click', openShareModal);
    elements.btnShareNext.addEventListener('click', () => shareToWhatsApp('next'));
    elements.btnShareAll.addEventListener('click', () => shareToWhatsApp('all'));
    elements.btnCopyNext.addEventListener('click', () => copyToClipboard('next'));
    elements.btnCopyAll.addEventListener('click', () => copyToClipboard('all'));
    elements.btnCloseShare.addEventListener('click', closeShareModal);

    elements.btnQibla.addEventListener('click', toggleQiblaCard);
    elements.btnCloseQibla.addEventListener('click', () => {
        hideElement(elements.qiblaCard);
        stopCompass();
    });

    // Close modal when clicking outside
    elements.shareModal.addEventListener('click', (e) => {
        if (e.target === elements.shareModal) {
            closeShareModal();
        }
    });

    // ========================================
    // INITIALIZATION
    // ========================================

    async function init() {
        initTheme();
        initCitySearch();

        updateClock();
        setInterval(updateClock, 1000);

        elements.location.textContent = DEFAULT_LOCATION_LABEL;
        hideElement(elements.error);

        // Check for saved city selection
        const savedCity = localStorage.getItem('selectedCity');
        if (savedCity) {
            await selectCity(savedCity);
            return;
        }

        await loadPrayerTimesByGPS();
    }

    init();
})();
