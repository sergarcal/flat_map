import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point as turfPoint, polygon as turfPolygon } from '@turf/helpers'
import type { Zone, ZoneIntent } from '../types/zones'

export interface PointMatchResult {
  matches: Zone[]
  verdict: ZoneIntent | 'mixed' | 'none'
}

export function pointInZones(lat: number, lng: number, zones: Zone[]): PointMatchResult {
  const pt = turfPoint([lng, lat])
  const matches = zones.filter((zone) =>
    booleanPointInPolygon(pt, turfPolygon(zone.geometry.coordinates)),
  )

  if (matches.length === 0) {
    return { matches, verdict: 'none' }
  }

  if (matches.some((z) => z.intent === 'avoid')) {
    return { matches, verdict: 'avoid' }
  }

  if (matches.some((z) => z.intent === 'good') && matches.some((z) => z.intent === 'neutral')) {
    return { matches, verdict: 'mixed' }
  }

  if (matches.some((z) => z.intent === 'good')) {
    return { matches, verdict: 'good' }
  }

  return { matches, verdict: 'neutral' }
}
