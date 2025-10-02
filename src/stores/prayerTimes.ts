import {defineStore} from 'pinia'
import {ref} from 'vue'
import {type LocationData, LocationService} from '@/services/LocationService'
import {type PrayerTimes, PrayerTimesAPI} from '@/services/PrayerTimesAPI'

export const usePrayerTimesStore = defineStore('prayerTimes', () => {
  const locationService = LocationService.getInstance()
  const prayerAPI = PrayerTimesAPI.getInstance()

  const currentLocation = ref<LocationData | null>(null)
  const prayerTimes = ref<PrayerTimes | null>(null)
    ref(new Date());
    const isLoading = ref(false)
    const error = ref<string | null>(null)


  async function initializeLocation() {
    try {
      isLoading.value = true
      error.value = null

      const location = await locationService.getCurrentLocation()
      currentLocation.value = location

      await updatePrayerTimes()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get location'
    } finally {
      isLoading.value = false
    }
  }

  async function updatePrayerTimes() {
    if (!currentLocation.value) return

    try {
      const times = await prayerAPI.fetchPrayerTimes(
        currentLocation.value.coordinates.latitude,
        currentLocation.value.coordinates.longitude
      )
      prayerTimes.value = times
    } catch (error) {
      console.error('Error updating prayer times:', error)
    }
  }

  function refreshLocation() {
    locationService.clearCache()
    initializeLocation()
  }

  return {
    currentLocation,
    prayerTimes,
    isLoading,
    error,
    initializeLocation,
    refreshLocation
  }
})