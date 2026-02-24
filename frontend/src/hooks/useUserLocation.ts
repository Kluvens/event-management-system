import { useState, useEffect } from 'react'

const DEFAULT_CITY = 'Sydney'

export interface UserLocation {
  city: string | null  // null while loading
  loading: boolean
  source: 'gps' | 'default'
}

export function useUserLocation(): UserLocation {
  const [state, setState] = useState<UserLocation>({
    city: null,
    loading: true,
    source: 'default',
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ city: DEFAULT_CITY, loading: false, source: 'default' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await resp.json()
          const city: string =
            data.address?.city ??
            data.address?.town ??
            data.address?.suburb ??
            data.address?.county ??
            DEFAULT_CITY
          setState({ city, loading: false, source: 'gps' })
        } catch {
          setState({ city: DEFAULT_CITY, loading: false, source: 'default' })
        }
      },
      () => setState({ city: DEFAULT_CITY, loading: false, source: 'default' }),
      { timeout: 8000 }
    )
  }, [])

  return state
}
