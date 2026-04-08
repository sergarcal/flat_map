export type ZoneKind = 'polygon' | 'circle'
export type ZoneIntent = 'good' | 'avoid' | 'neutral'

export interface ZoneMeta {
  drawFeatureId?: string
  center?: [number, number]
  radiusMeters?: number
}

export interface Zone {
  id: string
  kind: ZoneKind
  intent: ZoneIntent
  color: string
  label: string
  geometry: GeoJSON.Polygon
  meta?: ZoneMeta
  createdAt: string
  updatedAt: string
}
