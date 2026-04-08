import type { Zone, ZoneIntent } from '../types/zones'

const INTENT_COLORS: Record<ZoneIntent, string> = {
  good: '#16a34a',
  avoid: '#dc2626',
  neutral: '#8b5cf6',
}

interface ZonePanelProps {
  zones: Zone[]
  selectedZoneId: string | null
  onSelectZone: (zoneId: string | null) => void
  onUpdateZone: (zoneId: string, patch: Partial<Zone>) => void
  onDeleteZone: (zoneId: string) => void
}

export default function ZonePanel({
  zones,
  selectedZoneId,
  onSelectZone,
  onUpdateZone,
  onDeleteZone,
}: ZonePanelProps) {
  const selected = zones.find((z) => z.id === selectedZoneId) ?? null

  return (
    <aside className="panel">
      <h2>Zones</h2>
      <p className="help">Use draw controls on the map to create polygons and circles.</p>

      <ul className="zone-list">
        {zones.map((zone) => (
          <li key={zone.id}>
            <button
              type="button"
              className={zone.id === selectedZoneId ? 'zone-btn active' : 'zone-btn'}
              onClick={() => onSelectZone(zone.id)}
            >
              <span className="swatch" style={{ backgroundColor: zone.color }} />
              {zone.label}
            </button>
          </li>
        ))}
      </ul>

      {selected ? (
        <div className="editor">
          <h3>Selected Zone</h3>
          <label>
            Label
            <input
              type="text"
              value={selected.label}
              onChange={(e) => onUpdateZone(selected.id, { label: e.target.value })}
            />
          </label>
          <label>
            Intent
            <select
              value={selected.intent}
              onChange={(e) => {
                const intent = e.target.value as ZoneIntent
                onUpdateZone(selected.id, { intent, color: INTENT_COLORS[intent] })
              }}
            >
              <option value="good">good</option>
              <option value="avoid">avoid</option>
              <option value="neutral">neutral</option>
            </select>
          </label>
          <label>
            Color
            <input
              type="color"
              value={selected.color}
              onChange={(e) => onUpdateZone(selected.id, { color: e.target.value })}
            />
          </label>
          {selected.kind === 'circle' ? (
            <label>
              Circle Radius (m)
              <input
                type="number"
                min={50}
                step={50}
                value={selected.meta?.radiusMeters ?? 300}
                onChange={(e) =>
                  onUpdateZone(selected.id, {
                    meta: { ...selected.meta, radiusMeters: Number(e.target.value) },
                  })
                }
              />
            </label>
          ) : null}
          <button type="button" className="danger" onClick={() => onDeleteZone(selected.id)}>
            Delete Zone
          </button>
        </div>
      ) : (
        <p className="help">Select a zone to edit metadata.</p>
      )}
    </aside>
  )
}
