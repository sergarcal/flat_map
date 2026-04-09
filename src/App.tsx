import circle from "@turf/circle";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import LoginPage from "./components/LoginPage";
import MapCanvas from "./components/MapCanvas";
import PropertyCheckPanel from "./components/PropertyCheckPanel";
import ZonePanel from "./components/ZonePanel";
import { useAuth } from "./context/AuthContext";
import { deleteZones, loadZones, saveZones } from "./lib/storage";
import type { Zone } from "./types/zones";

function nowIso(): string {
  return new Date().toISOString();
}

function App() {
  const { user, loading, logout } = useAuth();

  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const prevZonesRef = useRef<Zone[]>([]);
  const initialSyncRef = useRef(true);

  useEffect(() => {
    if (!user) {
      prevZonesRef.current = [];
      initialSyncRef.current = true;
      setZones([]);
      setZonesLoading(false);
      return;
    }

    let isMounted = true;

    const loadUserZones = async () => {
      setZonesLoading(true);

      try {
        const loadedZones = await loadZones(user.id);
        if (!isMounted) return;
        setZones(loadedZones);
        prevZonesRef.current = loadedZones;
        initialSyncRef.current = false;
      } catch (error) {
        console.error("Failed to load zones", error);
        if (!isMounted) return;
        setZones([]);
      } finally {
        if (isMounted) {
          setZonesLoading(false);
        }
      }
    };

    loadUserZones();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user || zonesLoading) return;
    if (initialSyncRef.current) {
      prevZonesRef.current = zones;
      initialSyncRef.current = false;
      return;
    }

    const syncZones = async () => {
      const previousZones = prevZonesRef.current;
      const deletedIds = previousZones
        .filter((zone) => !zones.some((current) => current.id === zone.id))
        .map((zone) => zone.id);

      try {
        if (deletedIds.length > 0) {
          await deleteZones(deletedIds, user.id);
        }

        if (zones.length > 0) {
          await saveZones(zones, user.id);
        }
      } catch (error) {
        console.error("Failed to persist zones", error);
      } finally {
        prevZonesRef.current = zones;
      }
    };

    syncZones();
  }, [zones, user, zonesLoading]);

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
            zonesLoading={zonesLoading}
          />
          {zonesLoading && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    border: "4px solid #f3f3f3",
                    borderTop: "4px solid #3498db",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                  Loading zones...
                </p>
              </div>
            </div>
          )}
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
