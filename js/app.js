(() => {
    const DATE_LOCALE = 'id-ID';
    const COUNTDOWN_WINDOW_MINUTES = 60;
    const DEFAULT_LOCATION_LABEL = 'Indonesia';

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
        prayerTimes: document.getElementById('prayer-times')
    };

    let prayerTimesData = null;

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

        const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=20&tune=3,3,-3,3,3,3,4,3,0`;

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

    async function init() {
        updateClock();
        setInterval(updateClock, 1000);

        elements.location.textContent = DEFAULT_LOCATION_LABEL;
        hideElement(elements.error);

        try {
            const { lat, lng } = await getLocation();

            getCityName(lat, lng)
                .then((city) => {
                    elements.location.textContent = city || DEFAULT_LOCATION_LABEL;
                })
                .catch(() => {
                    elements.location.textContent = DEFAULT_LOCATION_LABEL;
                });

            const times = await fetchPrayerTimes(lat, lng);
            displayPrayerTimes(times);
            hideLoading();
        } catch (error) {
            hideLoading();
            showError(error.message);
        }
    }

    init();
})();
