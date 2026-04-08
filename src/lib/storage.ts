import type { Zone } from '../types/zones'

const STORAGE_KEY = 'flat-zones-v1'

interface PersistedZones {
  version: 1
  zones: Zone[]
}

export function loadZones(): Zone[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PersistedZones
    if (parsed.version !== 1 || !Array.isArray(parsed.zones)) return []
    return parsed.zones
  } catch {
    return []
  }
}

export function saveZones(zones: Zone[]): void {
  const payload: PersistedZones = {
    version: 1,
    zones,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}
