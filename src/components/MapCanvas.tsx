import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, CircleMarker, FeatureGroup, MapContainer, Polygon, TileLayer, useMap } from 'react-leaflet'
import circle from '@turf/circle'
import L from 'leaflet'
import type { LatLng, LeafletEvent, LeafletMouseEvent } from 'leaflet'
import 'leaflet-draw'
import type { Zone } from '../types/zones'

const DEFAULT_CENTER: [number, number] = [40.4168, -3.7038]

interface MapCanvasProps {
  zones: Zone[]
  selectedZoneId: string | null
  onZoneSelect: (zoneId: string | null) => void
  onZonesChanged: (zones: Zone[]) => void
}

function nowIso(): string {
  return new Date().toISOString()
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function MapCanvas({
  zones,
  selectedZoneId,
  onZoneSelect,
  onZonesChanged,
}: MapCanvasProps) {
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  function LocateMeControl() {
    const map = useMap()
    const [isLocating, setIsLocating] = useState(false)

    const handleLocate = () => {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported in this browser.')
        return
      }
      setIsLocating(true)
      setLocationError(null)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextPosition: [number, number] = [position.coords.latitude, position.coords.longitude]
          setMyLocation(nextPosition)
          map.setView(nextPosition, Math.max(map.getZoom(), 15))
          setIsLocating(false)
        },
        (error) => {
          setLocationError(error.message || 'Could not get your current location.')
          setIsLocating(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      )
    }

    return (
      <div className="leaflet-top leaflet-left">
        <div className="leaflet-control leaflet-bar locate-control">
          <button type="button" onClick={handleLocate}>
            {isLocating ? 'Locating...' : 'Use my location'}
          </button>
        </div>
      </div>
    )
  }

  function MapInstanceBinder() {
    const map = useMap()

    useEffect(() => {
      mapRef.current = map
    }, [map])

    return null
  }

  function DrawManager() {
    const map = useMap()
    useEffect(() => {
      if (!featureGroupRef.current) return
      const control = new L.Control.Draw({
        draw: {
          polygon: {},
          circle: {},
          rectangle: false,
          marker: false,
          polyline: false,
          circlemarker: false,
        },
        edit: {
          featureGroup: featureGroupRef.current,
        },
      })
      map.addControl(control)

      const onCreated = (rawEvent: LeafletEvent) => {
        const event = rawEvent as LeafletEvent & { layerType: string; layer: L.Layer }
        if (!featureGroupRef.current) return
        featureGroupRef.current.addLayer(event.layer)
        handleCreated(event)
      }

      const onEdited = (rawEvent: LeafletEvent) => {
        handleEdited(rawEvent as LeafletEvent & { layers: L.LayerGroup })
      }

      const onDeleted = (rawEvent: LeafletEvent) => {
        handleDeleted(rawEvent as LeafletEvent & { layers: L.LayerGroup })
      }

      map.on(L.Draw.Event.CREATED, onCreated)
      map.on(L.Draw.Event.EDITED, onEdited)
      map.on(L.Draw.Event.DELETED, onDeleted)

      return () => {
        map.off(L.Draw.Event.CREATED, onCreated)
        map.off(L.Draw.Event.EDITED, onEdited)
        map.off(L.Draw.Event.DELETED, onDeleted)
        map.removeControl(control)
      }
    }, [map])

    return null
  }

  const zoneById = useMemo(() => new globalThis.Map(zones.map((z) => [z.id, z])), [zones])

  const toPolygonCoords = (latlngs: LatLng[]): number[][] =>
    latlngs.map((point) => [point.lng, point.lat])
  const getLayerZoneId = (layer: L.Layer): string | undefined =>
    (layer as L.Layer & { options?: { zoneId?: string } }).options?.zoneId
  const setLayerZoneId = (layer: L.Layer, zoneId: string): void => {
    ;(layer as L.Layer & { options?: { zoneId?: string } }).options = {
      ...(layer as L.Layer & { options?: { zoneId?: string } }).options,
      zoneId,
    }
  }
  const applyZoneStyle = useCallback((layer: L.Layer, zone: Zone): void => {
    if (layer instanceof L.Path) {
      layer.setStyle({
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: zone.id === selectedZoneId ? 0.32 : 0.2,
        weight: zone.id === selectedZoneId ? 3 : 2,
      })
    }
  }, [selectedZoneId])

  useEffect(() => {
    const group = featureGroupRef.current
    if (!group) return
    group.eachLayer((layer: L.Layer) => {
      const zoneId = getLayerZoneId(layer)
      if (!zoneId) return
      const zone = zones.find((z) => z.id === zoneId)
      if (!zone) return
      applyZoneStyle(layer, zone)
    })
  }, [applyZoneStyle, zones])

  useEffect(() => {
    if (!selectedZoneId || !mapRef.current) return
    const zone = zones.find((z) => z.id === selectedZoneId)
    if (!zone) return
    const bounds = L.geoJSON(zone.geometry).getBounds()
    if (!bounds.isValid()) return
    mapRef.current.fitBounds(bounds.pad(0.25))
  }, [selectedZoneId, zones])

  const handleCreated = (event: LeafletEvent & { layerType: string; layer: L.Layer }) => {
    const featureId = String(event.layer._leaflet_id)
    if (event.layerType === 'polygon' && event.layer instanceof L.Polygon) {
      const latlngs = event.layer.getLatLngs()[0] as LatLng[]
      const coords = toPolygonCoords(latlngs)
      const zone: Zone = {
        id: newId(),
        kind: 'polygon',
        intent: 'neutral',
        color: '#8b5cf6',
        label: `Polygon ${featureId.slice(-4)}`,
        geometry: { type: 'Polygon', coordinates: [[...coords, coords[0]]] },
        meta: { drawFeatureId: featureId },
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      applyZoneStyle(event.layer, zone)
      onZonesChanged([...zones, zone])
      onZoneSelect(zone.id)
      return
    }

    if (event.layerType === 'circle' && event.layer instanceof L.Circle) {
      const center = event.layer.getLatLng()
      const radiusMeters = event.layer.getRadius() as number
      const geometry = circle([center.lng, center.lat], radiusMeters / 1000, {
        units: 'kilometers',
        steps: 64,
      }).geometry as GeoJSON.Polygon
      const zone: Zone = {
        id: newId(),
        kind: 'circle',
        intent: 'good',
        color: '#16a34a',
        label: `Circle ${zones.filter((z) => z.kind === 'circle').length + 1}`,
        geometry,
        meta: { drawFeatureId: featureId, center: [center.lng, center.lat], radiusMeters },
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      applyZoneStyle(event.layer, zone)
      onZonesChanged([...zones, zone])
      onZoneSelect(zone.id)
    }
  }

  const handleEdited = (event: LeafletEvent & { layers: L.LayerGroup }) => {
    const updated = [...zones]
    event.layers.eachLayer((layer: L.Layer) => {
      const zoneId = getLayerZoneId(layer)
      if (!zoneId) return
      const existing = zoneById.get(zoneId)
      if (!existing) return
      const index = updated.findIndex((z) => z.id === existing.id)
      if (index < 0) return

      if (existing.kind === 'polygon' && layer instanceof L.Polygon) {
        const latlngs = layer.getLatLngs()[0] as LatLng[]
        const coords = toPolygonCoords(latlngs)
        updated[index] = {
          ...existing,
          geometry: { type: 'Polygon', coordinates: [[...coords, coords[0]]] },
          updatedAt: nowIso(),
        }
      } else if (layer instanceof L.Circle) {
        const center = layer.getLatLng()
        const radiusMeters = layer.getRadius() as number
        const geometry = circle([center.lng, center.lat], radiusMeters / 1000, {
          units: 'kilometers',
          steps: 64,
        }).geometry as GeoJSON.Polygon
        updated[index] = {
          ...existing,
          geometry,
          meta: { ...existing.meta, center: [center.lng, center.lat], radiusMeters },
          updatedAt: nowIso(),
        }
      }
    })
    onZonesChanged(updated)
  }

  const handleDeleted = (event: LeafletEvent & { layers: L.LayerGroup }) => {
    const deleted = new Set<string>()
    event.layers.eachLayer((layer: L.Layer) => {
      const zoneId = getLayerZoneId(layer)
      if (zoneId) {
        deleted.add(zoneId)
      }
    })
    const kept = zones.filter((zone) => !deleted.has(zone.id))
    onZonesChanged(kept)
    if (selectedZoneId && !kept.some((z) => z.id === selectedZoneId)) {
      onZoneSelect(null)
    }
  }

  const onShapeClick = (zoneId: string) => (event: LeafletMouseEvent) => {
    event.originalEvent.stopPropagation()
    onZoneSelect(zoneId)
  }

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
      <MapInstanceBinder />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <DrawManager />
      <LocateMeControl />
      {myLocation ? (
        <CircleMarker
          center={myLocation}
          radius={8}
          pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.9 }}
        />
      ) : null}
      <FeatureGroup ref={featureGroupRef}>
        {zones.map((zone) =>
          zone.kind === 'circle' && zone.meta?.center && zone.meta?.radiusMeters ? (
            <Circle
              key={zone.id}
              center={[zone.meta.center[1], zone.meta.center[0]]}
              radius={zone.meta.radiusMeters}
              pathOptions={{
                color: zone.color,
                fillColor: zone.color,
                fillOpacity: zone.id === selectedZoneId ? 0.32 : 0.2,
                weight: zone.id === selectedZoneId ? 3 : 2,
              }}
              eventHandlers={{ click: onShapeClick(zone.id) }}
              ref={(layer) => {
                if (layer) setLayerZoneId(layer, zone.id)
              }}
            />
          ) : (
            <Polygon
              key={zone.id}
              positions={zone.geometry.coordinates[0].map(([lng, lat]) => [lat, lng])}
              pathOptions={{
                color: zone.color,
                fillColor: zone.color,
                fillOpacity: zone.id === selectedZoneId ? 0.32 : 0.2,
                weight: zone.id === selectedZoneId ? 3 : 2,
              }}
              eventHandlers={{ click: onShapeClick(zone.id) }}
              ref={(layer) => {
                if (layer) setLayerZoneId(layer, zone.id)
              }}
            />
          ),
        )}
      </FeatureGroup>
      {locationError ? (
        <div className="leaflet-bottom leaflet-left">
          <div className="leaflet-control locate-error">{locationError}</div>
        </div>
      ) : null}
    </MapContainer>
  )
}
