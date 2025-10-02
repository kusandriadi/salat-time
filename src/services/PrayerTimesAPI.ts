export interface PrayerTimes {
  fajr: string;
  syuruq: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  imsak: string;
}

export class PrayerTimesAPI {
  private static instance: PrayerTimesAPI;

  private constructor() {}

  public static getInstance(): PrayerTimesAPI {
    if (!PrayerTimesAPI.instance) {
      PrayerTimesAPI.instance = new PrayerTimesAPI();
    }
    return PrayerTimesAPI.instance;
  }

  public async fetchPrayerTimes(lat: number, lng: number, date: Date = new Date()): Promise<PrayerTimes> {
    try {
      // Try Kemenag API first
      const kemenagResult = await this.tryKemenagAPI(lat, lng, date);
      if (kemenagResult) {
        return kemenagResult;
      }

      // Fallback to Aladhan if Kemenag fails
      return this.tryAladhanAPI(lat, lng, date);
    } catch (error) {
      console.error('Prayer times API error:', error);
      return this.getFallbackTimes();
    }
  }

  private async tryKemenagAPI(lat: number, lng: number, date: Date): Promise<PrayerTimes | null> {
    try {
      // Kemenag API endpoint
      const url = `https://api.myquran.com/v2/sholat/jadwal/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}/${lat}/${lng}`;

      console.log('Kemenag API URL:', url);

      const response = await fetch(url);
      const data = await response.json();

      console.log('Kemenag API Response:', data);

      if (data.status && data.data && data.data.jadwal) {
        const jadwal = data.data.jadwal;
        return {
          imsak: jadwal.imsak,
          fajr: jadwal.subuh,
          syuruq: jadwal.terbit,
          dhuhr: jadwal.dzuhur,
          asr: jadwal.ashar,
          maghrib: jadwal.maghrib,
          isha: jadwal.isha
        };
      }

      return null;
    } catch (error) {
      console.warn('Kemenag API failed:', error);
      return null;
    }
  }

  private async tryAladhanAPI(lat: number, lng: number, date: Date): Promise<PrayerTimes> {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=20&methodSettings=20,null,18,null,null&timezonestring=Asia/Jakarta`;

    console.log('Aladhan fallback URL:', url);

    const response = await fetch(url);
    const data = await response.json();

    const t = data.data.timings;
    return {
      imsak: t.Imsak.substring(0, 5),
      fajr: t.Fajr.substring(0, 5),
      syuruq: t.Sunrise.substring(0, 5),
      dhuhr: t.Dhuhr.substring(0, 5),
      asr: t.Asr.substring(0, 5),
      maghrib: t.Maghrib.substring(0, 5),
      isha: t.Isha.substring(0, 5)
    };
  }

  private getFallbackTimes(): PrayerTimes {
    return {
      imsak: '04:30',
      fajr: '04:40',
      syuruq: '05:55',
      dhuhr: '12:00',
      asr: '15:15',
      maghrib: '18:05',
      isha: '19:15'
    };
  }
}