import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { OrderSheet, OrderSheetStatus, OrderSheetItem } from '../types'

interface OrderStore {
    orderSheets: OrderSheet[]
    orderItems: Record<string, OrderSheetItem[]> // orderSheetId -> items

    // Actions
    addOrderSheet: (order: OrderSheet, items: OrderSheetItem[]) => void
    updateOrderSheet: (id: string, data: Partial<OrderSheet>) => void
    updateOrderItems: (orderSheetId: string, items: OrderSheetItem[]) => void
    getOrderSheetByToken: (token: string) => OrderSheet | undefined
    getOrderItems: (orderSheetId: string) => OrderSheetItem[]
}

export const useOrderStore = create<OrderStore>()(
    persist(
        (set, get) => ({
            orderSheets: [],
            orderItems: {},

            addOrderSheet: (order, items) => set((state) => ({
                orderSheets: [...state.orderSheets, order],
                orderItems: { ...state.orderItems, [order.id]: items }
            })),

            updateOrderSheet: (id, data) => set((state) => ({
                orderSheets: state.orderSheets.map(o =>
                    o.id === id ? { ...o, ...data, updatedAt: new Date() } : o
                )
            })),

            updateOrderItems: (orderSheetId, items) => set((state) => ({
                orderItems: { ...state.orderItems, [orderSheetId]: items }
            })),

            getOrderSheetByToken: (token) => {
                return get().orderSheets.find(o => o.inviteTokenId === token)
            },

            getOrderItems: (orderSheetId) => {
                return get().orderItems[orderSheetId] || []
            }
        }),
        {
            name: 'trs-order-storage',
            // Dates are stored as strings in JSON, we might need to handle transformation 
            // but for a demo, simple strings are often enough or we can use a custom storage
        }
    )
)
