<template>
  <div class="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4 sm:p-6 md:p-8">
    <div class="max-w-2xl mx-auto">

      <!-- Header with Clock -->
      <div class="text-center mb-6 sm:mb-8">
        <div class="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-emerald-100">
          <div class="text-slate-600 text-xs sm:text-sm font-medium mb-1">{{ currentDate }}</div>
          <div class="text-slate-800 text-3xl sm:text-4xl md:text-5xl font-bold font-mono tracking-wide">{{ currentTime }}</div>
          <div v-if="currentLocation" class="mt-2 sm:mt-3 text-emerald-700 font-semibold text-sm sm:text-base">
            {{ currentLocation.city }}
          </div>
        </div>
      </div>

      <!-- Countdown Alert -->
      <div v-if="upcomingPrayer" class="mb-4 sm:mb-6 bg-emerald-600 text-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg text-center">
        <div class="text-sm sm:text-base font-medium">{{ upcomingPrayer.message }}</div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-emerald-200 border-t-emerald-600"></div>
        <div class="text-slate-600 mt-4 font-medium text-sm sm:text-base">Memuat jadwal sholat...</div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 p-4 sm:p-6 rounded-xl sm:rounded-2xl text-center shadow-lg">
        <div class="text-red-700 mb-4 font-medium text-sm sm:text-base">{{ error }}</div>
        <button @click="refreshLocation" class="bg-red-600 hover:bg-red-700 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-colors text-sm sm:text-base">
          Coba Lagi
        </button>
      </div>

      <!-- Prayer Times -->
      <div v-else-if="prayerTimes">
        <div class="space-y-2 sm:space-y-3">
          <div
            v-for="prayer in allPrayers"
            :key="prayer"
            class="bg-white border border-emerald-100 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-md hover:shadow-lg transition-shadow"
          >
            <div class="flex items-center justify-between gap-3 sm:gap-4">
              <span
                :class="[
                  'font-semibold text-base sm:text-lg md:text-xl',
                  isMainPrayer(prayer) ? 'text-slate-700' : 'text-slate-500'
                ]"
              >
                {{ getPrayerDisplayName(prayer) }}
              </span>
              <span class="font-mono text-xl sm:text-2xl md:text-3xl font-bold text-emerald-700 tracking-wide">{{ prayerTimes[prayer] }}</span>
            </div>
          </div>
        </div>

        <!-- Footer Info -->
        <div class="mt-6 sm:mt-8 text-center text-slate-500 text-xs sm:text-sm">
          <p>Jadwal sholat diperbarui secara otomatis</p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePrayerTimesStore } from '@/stores/prayerTimes'

const store = usePrayerTimesStore()

// Reactive references
const {
  currentLocation,
  prayerTimes,
  isLoading,
  error
} = storeToRefs(store)

// Methods
const {
  initializeLocation,
  refreshLocation
} = store

// Current time and date
const currentTime = ref('')
const currentDate = ref('')
let timeInterval: number | null = null

// Main 5 prayer times and all prayers
const mainPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
const allPrayers = ['imsak', 'fajr', 'syuruq', 'dhuhr', 'asr', 'maghrib', 'isha']

function updateTime() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}:${seconds}`
  currentDate.value = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function getPrayerDisplayName(prayer: string): string {
  const names: { [key: string]: string } = {
    imsak: 'Imsak',
    fajr: 'Subuh',
    syuruq: 'Syuruq',
    dhuhr: 'Dzuhur',
    asr: 'Ashar',
    maghrib: 'Maghrib',
    isha: 'Isya'
  }
  return names[prayer] || prayer
}

function isMainPrayer(prayer: string): boolean {
  return mainPrayers.includes(prayer)
}

// Calculate upcoming prayer countdown
const upcomingPrayer = computed(() => {
  if (!prayerTimes.value) return null

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  for (const prayer of mainPrayers) {
    const timeStr = prayerTimes.value[prayer as keyof typeof prayerTimes.value]
    const [hours, minutes] = timeStr.split(':').map(Number)
    const prayerMinutes = hours * 60 + minutes

    let diff = prayerMinutes - currentMinutes

    // Handle prayer time past midnight
    if (diff < 0) {
      diff += 24 * 60
    }

    // If prayer is within 30 minutes
    if (diff > 0 && diff <= 30) {
      return {
        prayer: getPrayerDisplayName(prayer),
        minutes: diff,
        message: `${diff} menit lagi masuk waktu shalat ${getPrayerDisplayName(prayer)}`
      }
    }
  }

  return null
})

onMounted(async () => {
  await initializeLocation()
  updateTime()
  timeInterval = window.setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>