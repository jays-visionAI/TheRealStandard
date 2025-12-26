import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Shipment {
    id: string             // 배송번호 SH-xxxx
    orderId: string        // 연결된 SalesOrder ID
    customerName: string   // 고객사명
    company: string        // 배송업체
    driverName: string     // 기사명
    driverPhone: string    // 연락처
    vehicleNumber: string  // 차량번호
    vehicleType: string    // 차량타입
    eta: string            // 도착예정시간 (ISO String)
    status: 'READY' | 'SHIPPING' | 'DELIVERED'
    createdAt: string
}

interface ShipmentStore {
    shipments: Shipment[]
    addShipment: (shipment: Shipment) => void
    updateShipmentStatus: (id: string, status: Shipment['status']) => void
    getShipmentByOrderId: (orderId: string) => Shipment | undefined
}

export const useShipmentStore = create<ShipmentStore>()(
    persist(
        (set, get) => ({
            shipments: [],

            addShipment: (shipment) => set((state) => ({
                shipments: [shipment, ...state.shipments]
            })),

            updateShipmentStatus: (id, status) => set((state) => ({
                shipments: state.shipments.map(s => s.id === id ? { ...s, status } : s)
            })),

            getShipmentByOrderId: (orderId) => {
                return get().shipments.find(s => s.orderId === orderId)
            }
        }),
        {
            name: 'trs-shipment-storage'
        }
    )
)
