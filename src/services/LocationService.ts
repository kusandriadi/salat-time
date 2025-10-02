export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData {
  coordinates: Coordinates;
  city: string;
  country: string;
  timezone: string;
}

export class LocationService {
  private static instance: LocationService;
  private currentLocation: LocationData | null = null;

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  public async getCurrentLocation(): Promise<LocationData> {
    if (this.currentLocation) {
      return this.currentLocation;
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coordinates: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };

          try {
            const locationData = await this.getLocationInfo(coordinates);
            this.currentLocation = locationData;
            resolve(locationData);
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 600000
        }
      );
    });
  }

  private async getLocationInfo(coordinates: Coordinates): Promise<LocationData> {
    try {
      // Try OpenStreetMap Nominatim - better for Indonesia
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.latitude}&lon=${coordinates.longitude}&zoom=18&addressdetails=1&accept-language=id`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch location information');
      }

      const data = await response.json();
      let cityName = 'Jakarta Pusat (default)';

      if (data.address) {
        const addr = data.address;
        // Priority: city > county > state
        if (addr.city) {
          cityName = addr.city;
        } else if (addr.town) {
          cityName = addr.town;
        } else if (addr.county) {
          cityName = addr.county;
        } else if (addr.state) {
          cityName = addr.state;
        }
      }

      return {
        coordinates,
        city: cityName,
        country: 'Indonesia',
        timezone: 'Asia/Jakarta'
      };
    } catch (error) {
      return {
        coordinates: { latitude: -6.1751, longitude: 106.8650 },
        city: 'Jakarta Pusat (default)',
        country: 'Indonesia',
        timezone: 'Asia/Jakarta'
      };
    }
  }

  public clearCache(): void {
    this.currentLocation = null;
  }
}