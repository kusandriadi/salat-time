(() => {
    const DATE_LOCALE = 'id-ID';
    const COUNTDOWN_WINDOW_MINUTES = 60;
    const DEFAULT_LOCATION_LABEL = 'Indonesia';
    const KAABA_LAT = 21.4225;
    const KAABA_LNG = 39.8262;
    const WEBSITE_URL = 'https://sholatku.com/'; // Ganti dengan URL website Anda

    const PRAYER_NAMES = {
        imsak: 'Imsak',
        fajr: 'Subuh',
        syuruq: 'Terbit',
        dhuhr: 'Dzuhur',
        asr: 'Ashar',
        maghrib: 'Maghrib',
        isha: 'Isya'
    };

    const PRAYER_ICONS = {
        imsak: '🌘',
        fajr: '🌄',
        syuruq: '🌅',
        dhuhr: '🌞',
        asr: '🌇',
        maghrib: '🌆',
        isha: '🌙'
    };

    const MAIN_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const ALL_PRAYERS = ['imsak', 'fajr', 'syuruq', 'dhuhr', 'asr', 'maghrib', 'isha'];

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
        btnCloseShare: document.getElementById('btn-close-share')
    };

    let prayerTimesData = null;
    let userLocation = null;
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
        const latRad = lat * Math.PI / 180;
        const lngRad = lng * Math.PI / 180;
        const kaabaLatRad = KAABA_LAT * Math.PI / 180;
        const kaabaLngRad = KAABA_LNG * Math.PI / 180;

        const dLng = kaabaLngRad - lngRad;

        const y = Math.sin(dLng) * Math.cos(kaabaLatRad);
        const x = Math.cos(latRad) * Math.sin(kaabaLatRad) -
                  Math.sin(latRad) * Math.cos(kaabaLatRad) * Math.cos(dLng);

        let bearing = Math.atan2(y, x) * 180 / Math.PI;
        bearing = (bearing + 360) % 360;

        return bearing;
    }

    function updateCompass(heading) {
        if (!qiblaDirection) return;

        // Fix: Add 180 degrees to correct the reversed direction
        // Rotate entire compass circle so Kaaba icon points to qibla
        const rotation = qiblaDirection - heading + 180;
        elements.compassCircle.style.transform = `rotate(${rotation}deg)`;

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
            let heading = event.alpha;

            if (event.webkitCompassHeading) {
                heading = event.webkitCompassHeading;
            } else if (event.alpha !== null) {
                heading = 360 - event.alpha;
            }

            if (heading !== null) {
                deviceOrientation = heading;
                updateCompass(heading);
            }
        };

        window.addEventListener('deviceorientation', orientationListener);
    }

    function stopCompass() {
        if (orientationListener) {
            window.removeEventListener('deviceorientation', orientationListener);
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

        message += `${WEBSITE_URL}\n`;

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

    async function getCityName(lat, lng) {
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
            const address = data.address || {};

            return address.city || address.town || address.county || address.state || DEFAULT_LOCATION_LABEL;
        } catch (_error) {
            return DEFAULT_LOCATION_LABEL;
        }
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
    // PWA INSTALL PROMPT
    // ========================================

    let deferredPrompt;
    let installBannerShown = false;

    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('beforeinstallprompt fired');
        e.preventDefault();
        deferredPrompt = e;

        // Show custom install button after 3 seconds if not installed
        setTimeout(() => {
            if (!window.matchMedia('(display-mode: standalone)').matches &&
                deferredPrompt &&
                !installBannerShown) {
                showInstallPrompt();
            }
        }, 3000);
    });

    function showInstallPrompt() {
        installBannerShown = true;

        // Create install prompt banner
        const installBanner = document.createElement('div');
        installBanner.id = 'install-banner';
        installBanner.style.cssText = `
            position: fixed;
            bottom: 1rem;
            left: 1rem;
            right: 1rem;
            background: #0f766e;
            color: white;
            border-radius: 8px;
            padding: 1rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 1rem;
        `;

        installBanner.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 0.25rem;">
                    Install Jadwal Sholat
                </div>
                <div style="font-size: 0.875rem; opacity: 0.9;">
                    Akses cepat dari home screen
                </div>
            </div>
            <button id="install-btn" style="
                background: white;
                color: #0f766e;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                font-size: 0.875rem;
                font-weight: 600;
                cursor: pointer;
                white-space: nowrap;
            ">Install</button>
            <button id="dismiss-btn" style="
                background: transparent;
                color: white;
                border: none;
                padding: 0.5rem;
                cursor: pointer;
                font-size: 1.5rem;
                line-height: 1;
            ">&times;</button>
        `;

        document.body.appendChild(installBanner);

        // Install button handler
        const installBtn = document.getElementById('install-btn');
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log('Install outcome:', outcome);

                deferredPrompt = null;
                installBanner.remove();
            }
        });

        // Dismiss button handler
        document.getElementById('dismiss-btn').addEventListener('click', () => {
            installBanner.remove();
        });
    }

    // Check if already installed
    window.addEventListener('DOMContentLoaded', () => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('App is already installed');
        }
    });

    // ========================================
    // INITIALIZATION
    // ========================================

    async function init() {
        initTheme();

        updateClock();
        setInterval(updateClock, 1000);

        elements.location.textContent = DEFAULT_LOCATION_LABEL;
        hideElement(elements.error);

        try {
            const location = await getLocation();
            userLocation = location;

            getCityName(location.lat, location.lng)
                .then((city) => {
                    elements.location.textContent = city || DEFAULT_LOCATION_LABEL;
                })
                .catch(() => {
                    elements.location.textContent = DEFAULT_LOCATION_LABEL;
                });

            const times = await fetchPrayerTimes(location.lat, location.lng);
            displayPrayerTimes(times);
            hideLoading();
        } catch (error) {
            hideLoading();
            showError(error.message);
        }
    }

    init();
})();
