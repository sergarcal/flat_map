import circle from "@turf/circle";
import { useEffect, useState } from "react";
import "./App.css";
import LoginPage from "./components/LoginPage";
import MapCanvas from "./components/MapCanvas";
import PropertyCheckPanel from "./components/PropertyCheckPanel";
import ZonePanel from "./components/ZonePanel";
import { useAuth } from "./context/AuthContext";
import { loadZones, saveZones } from "./lib/storage";
import type { Zone } from "./types/zones";

function nowIso(): string {
  return new Date().toISOString();
}

function App() {
  const { user, loading, logout } = useAuth();

  const [zones, setZones] = useState<Zone[]>(() => loadZones());
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  useEffect(() => {
    saveZones(zones);
  }, [zones]);

  const onUpdateZone = (zoneId: string, patch: Partial<Zone>) => {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z;
        const updated: Zone = { ...z, ...patch, updatedAt: nowIso() };
        if (
          updated.kind === "circle" &&
          updated.meta?.center &&
          updated.meta.radiusMeters
        ) {
          updated.geometry = circle(
            updated.meta.center,
            updated.meta.radiusMeters / 1000,
            {
              units: "kilometers",
              steps: 64,
            },
          ).geometry as GeoJSON.Polygon;
        }
        return updated;
      }),
    );
  };

  const onDeleteZone = (zoneId: string) => {
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
    setSelectedZoneId((prev) => (prev === zoneId ? null : prev));
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontSize: "18px",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <main className="app-shell">
      <header>
        <h1>Flat Zones</h1>
        <p>Draw and classify areas to evaluate properties quickly.</p>
        <button
          onClick={logout}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            padding: "8px 16px",
            backgroundColor: "#f44336",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </header>
      <section className="content-grid">
        <div className="map-wrap">
          <MapCanvas
            zones={zones}
            selectedZoneId={selectedZoneId}
            onZoneSelect={setSelectedZoneId}
            onZonesChanged={setZones}
          />
        </div>
        <div className="side-panels">
          <ZonePanel
            zones={zones}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
            onUpdateZone={onUpdateZone}
            onDeleteZone={onDeleteZone}
          />
          <PropertyCheckPanel zones={zones} />
        </div>
      </section>
    </main>
  );
}

export default App;
