const DEFAULT_CITY = 'Sydney'

export interface UserLocation {
  city: string
  loading: boolean
  source: 'gps' | 'default'
}

// Geolocation is not requested automatically on page load — browsers (and
// Lighthouse) treat unsolicited permission prompts as a best-practice
// violation.  A user-triggered "detect location" flow can be added later.
export function useUserLocation(): UserLocation {
  return { city: DEFAULT_CITY, loading: false, source: 'default' }
}
