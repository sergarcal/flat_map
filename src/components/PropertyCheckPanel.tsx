import { useState } from 'react'
import { pointInZones } from '../lib/geo'
import type { Zone } from '../types/zones'

interface PropertyCheckPanelProps {
  zones: Zone[]
}

export default function PropertyCheckPanel({ zones }: PropertyCheckPanelProps) {
  const [lat, setLat] = useState('40.4168')
  const [lng, setLng] = useState('-3.7038')

  const parsedLat = Number(lat)
  const parsedLng = Number(lng)
  const valid = Number.isFinite(parsedLat) && Number.isFinite(parsedLng)
  const result = valid ? pointInZones(parsedLat, parsedLng, zones) : null

  return (
    <section className="panel">
      <h2>Property Check</h2>
      <div className="check-grid">
        <label>
          Latitude
          <input value={lat} onChange={(e) => setLat(e.target.value)} />
        </label>
        <label>
          Longitude
          <input value={lng} onChange={(e) => setLng(e.target.value)} />
        </label>
      </div>

      {valid && result ? (
        <>
          <p className="help">
            Verdict: <strong>{result.verdict}</strong>
          </p>
          <ul className="zone-list">
            {result.matches.map((zone) => (
              <li key={zone.id}>
                <span className="swatch" style={{ backgroundColor: zone.color }} />
                {zone.label} ({zone.intent})
              </li>
            ))}
            {result.matches.length === 0 ? <li>No zones matched this point.</li> : null}
          </ul>
        </>
      ) : (
        <p className="help">Enter valid coordinates.</p>
      )}
    </section>
  )
}
