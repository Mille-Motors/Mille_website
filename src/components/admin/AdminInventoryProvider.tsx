"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { computeStats } from "@/lib/vehicles";
import { slugify, vehicleTitle } from "@/lib/format";
import type { InventoryStats, Vehicle, VehicleDraft, VehicleStatus } from "@/types/vehicle";

interface AdminInventory {
  vehicles: Vehicle[];
  stats: InventoryStats;
  getById: (id: string) => Vehicle | undefined;
  create: (draft: VehicleDraft) => Vehicle;
  update: (id: string, draft: VehicleDraft) => void;
  setStatus: (id: string, status: VehicleStatus) => void;
  remove: (id: string) => void;
}

const AdminInventoryContext = createContext<AdminInventory | null>(null);

/**
 * Session-scoped inventory state.
 *
 * Deliberately in-memory: this phase is about finishing the interaction
 * design, so a refresh resets to the seed. Swapping this for server actions
 * later means keeping this same interface.
 */
export function AdminInventoryProvider({
  seed,
  children,
}: {
  seed: Vehicle[];
  children: React.ReactNode;
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(seed);

  const getById = useCallback(
    (id: string) => vehicles.find((v) => v.id === id),
    [vehicles],
  );

  const create = useCallback((draft: VehicleDraft) => {
    const id = `veh-${Math.random().toString(36).slice(2, 9)}`;
    const vehicle: Vehicle = {
      ...draft,
      id,
      slug: slugify(`${vehicleTitle(draft)}-${draft.year}`),
      createdAt: new Date().toISOString(),
    };
    setVehicles((current) => [vehicle, ...current]);
    return vehicle;
  }, []);

  const update = useCallback((id: string, draft: VehicleDraft) => {
    setVehicles((current) =>
      current.map((v) =>
        v.id === id
          ? { ...v, ...draft, slug: slugify(`${vehicleTitle(draft)}-${draft.year}`) }
          : v,
      ),
    );
  }, []);

  const setStatus = useCallback((id: string, status: VehicleStatus) => {
    setVehicles((current) =>
      current.map((v) => (v.id === id ? { ...v, status } : v)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setVehicles((current) => current.filter((v) => v.id !== id));
  }, []);

  const value = useMemo<AdminInventory>(
    () => ({
      vehicles,
      stats: computeStats(vehicles),
      getById,
      create,
      update,
      setStatus,
      remove,
    }),
    [vehicles, getById, create, update, setStatus, remove],
  );

  return (
    <AdminInventoryContext.Provider value={value}>
      {children}
    </AdminInventoryContext.Provider>
  );
}

export function useAdminInventory(): AdminInventory {
  const context = useContext(AdminInventoryContext);
  if (!context) {
    throw new Error(
      "useAdminInventory must be used inside an AdminInventoryProvider",
    );
  }
  return context;
}
