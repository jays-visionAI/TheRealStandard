import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { OrderSheet, OrderSheetItem, SalesOrder, SalesOrderItem } from '../types'

interface OrderStore {
    orderSheets: OrderSheet[]
    orderItems: Record<string, OrderSheetItem[]> // orderSheetId -> items
    salesOrders: SalesOrder[]
    salesOrderItems: Record<string, SalesOrderItem[]> // salesOrderId -> items

    // Actions
    addOrderSheet: (order: OrderSheet, items: OrderSheetItem[]) => void
    updateOrderSheet: (id: string, data: Partial<OrderSheet>) => void
    updateOrderItems: (orderSheetId: string, items: OrderSheetItem[]) => void
    deleteOrderSheet: (id: string) => void
    getOrderSheetById: (id: string) => OrderSheet | undefined
    getOrderSheetByToken: (token: string) => OrderSheet | undefined
    getOrderItems: (orderSheetId: string) => OrderSheetItem[]

    // SalesOrder Actions
    createSalesOrder: (orderSheet: OrderSheet, items: OrderSheetItem[]) => void
    getSalesOrderById: (id: string) => SalesOrder | undefined
    getSalesOrderItems: (salesOrderId: string) => SalesOrderItem[]
}

export const useOrderStore = create<OrderStore>()(
    persist(
        (set, get) => ({
            orderSheets: [],
            orderItems: {},
            salesOrders: [],
            salesOrderItems: {},

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

            deleteOrderSheet: (id) => set((state) => {
                const { [id]: _, ...remainingItems } = state.orderItems;
                return {
                    orderSheets: state.orderSheets.filter(o => o.id !== id),
                    orderItems: remainingItems
                };
            }),

            getOrderSheetById: (id) => {
                return get().orderSheets.find(o => o.id === id)
            },

            getOrderSheetByToken: (token) => {
                return get().orderSheets.find(o => o.inviteTokenId === token)
            },

            getOrderItems: (orderSheetId) => {
                return get().orderItems[orderSheetId] || []
            },

            createSalesOrder: (orderSheet, items) => {
                const salesOrderId = `SO-${Date.now()}`
                const totalKg = items.reduce((sum, item) => sum + (item.estimatedKg || 0), 0)
                const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)

                const newSalesOrder: SalesOrder = {
                    id: salesOrderId,
                    sourceOrderSheetId: orderSheet.id,
                    confirmedAt: new Date(),
                    customerOrgId: orderSheet.customerOrgId,
                    customerName: orderSheet.customerName,
                    status: 'CREATED',
                    totalsKg: totalKg,
                    totalsAmount: totalAmount,
                    createdAt: new Date(),
                }

                const newSalesOrderItems: SalesOrderItem[] = items.map((item, idx) => ({
                    id: `so-item-${salesOrderId}-${idx}`,
                    salesOrderId: salesOrderId,
                    productId: item.productId,
                    productName: item.productName,
                    qtyKg: item.estimatedKg,
                    unitPrice: item.unitPrice,
                    amount: item.amount,
                }))

                set((state) => ({
                    salesOrders: [...state.salesOrders, newSalesOrder],
                    salesOrderItems: { ...state.salesOrderItems, [salesOrderId]: newSalesOrderItems }
                }))
            },

            getSalesOrderById: (id) => {
                return get().salesOrders.find(so => so.id === id)
            },

            getSalesOrderItems: (salesOrderId) => {
                return get().salesOrderItems[salesOrderId] || []
            }
        }),
        {
            name: 'trs-order-storage',
            // Dates are stored as strings in JSON, we might need to handle transformation 
            // but for a demo, simple strings are often enough or we can use a custom storage
        }
    )
)
