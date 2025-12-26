import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface VehicleType {
    id: string
    name: string
    capacityKg: number
    enabled: boolean
    createdAt: Date
    updatedAt: Date
}

interface VehicleStore {
    vehicleTypes: VehicleType[]
    addVehicleType: (name: string, capacityKg: number) => void
    updateVehicleType: (id: string, name: string, capacityKg: number) => void
    toggleVehicleEnabled: (id: string) => void
    initializeStore: () => void
}

const initialVehicleTypes: VehicleType[] = [
    { id: 'vt-1', name: '1톤 냉탑', capacityKg: 1000, enabled: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'vt-2', name: '3.5톤', capacityKg: 3500, enabled: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'vt-3', name: '5톤 트럭', capacityKg: 5000, enabled: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'vt-4', name: '11톤', capacityKg: 11000, enabled: true, createdAt: new Date(), updatedAt: new Date() },
]

export const useVehicleStore = create<VehicleStore>()(
    persist(
        (set, get) => ({
            vehicleTypes: initialVehicleTypes,

            addVehicleType: (name, capacityKg) => set((state) => ({
                vehicleTypes: [...state.vehicleTypes, {
                    id: 'vt-' + Date.now(),
                    name,
                    capacityKg,
                    enabled: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }]
            })),

            updateVehicleType: (id, name, capacityKg) => set((state) => ({
                vehicleTypes: state.vehicleTypes.map(vt =>
                    vt.id === id ? { ...vt, name, capacityKg, updatedAt: new Date() } : vt
                )
            })),

            toggleVehicleEnabled: (id) => set((state) => ({
                vehicleTypes: state.vehicleTypes.map(vt =>
                    vt.id === id ? { ...vt, enabled: !vt.enabled } : vt
                )
            })),

            initializeStore: () => {
                if (get().vehicleTypes.length === 0) {
                    set({ vehicleTypes: initialVehicleTypes })
                }
            }
        }),
        {
            name: 'trs-vehicle-storage'
        }
    )
)
