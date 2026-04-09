import type { Zone } from "../types/zones";
import { supabase } from "./supabase";

type ZoneRow = Omit<Zone, "createdAt" | "updatedAt"> & {
  user_id: string;
  created_at: string;
  updated_at: string;
};

function zoneRowToZone(row: ZoneRow): Zone {
  const { user_id, created_at, updated_at, ...rest } = row;
  return {
    ...rest,
    createdAt: created_at,
    updatedAt: updated_at,
  };
}

function zoneToZoneRow(zone: Zone, userId: string): ZoneRow {
  const { createdAt, updatedAt, ...rest } = zone;
  return {
    ...rest,
    user_id: userId,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

export async function loadZones(userId: string): Promise<Zone[]> {
  const zoneTable = supabase.from("zones") as any;
  const { data, error } = await zoneTable
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load zones from Supabase:", error.message);
    return [];
  }

  return (data as ZoneRow[] | null)?.map(zoneRowToZone) ?? [];
}

export async function saveZones(zones: Zone[], userId: string): Promise<void> {
  if (zones.length === 0) return;

  const rows = zones.map((zone) => zoneToZoneRow(zone, userId));

  const zoneTable = supabase.from("zones") as any;
  const { error } = await zoneTable.upsert(rows, { onConflict: "id" });

  if (error) {
    console.error("Failed to save zones to Supabase:", error.message);
    throw error;
  }
}

export async function deleteZones(
  zoneIds: string[],
  userId: string,
): Promise<void> {
  if (zoneIds.length === 0) return;

  const zoneTable = supabase.from("zones") as any;
  const { error } = await zoneTable
    .delete()
    .eq("user_id", userId)
    .in("id", zoneIds);

  if (error) {
    console.error("Failed to delete zones from Supabase:", error.message);
    throw error;
  }
}
