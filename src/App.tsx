import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { initKakao } from './lib/kakaoService'
import ProtectedRoute, { PublicRoute } from './components/ProtectedRoute'

// Auth Pages
import LandingPage from './pages/LandingPage'
import Login from './pages/auth/Login'
import InviteActivation from './pages/auth/InviteActivation'

// Workflow Pages (ADMIN - v1.0)
import WorkflowHome from './pages/workflow/WorkflowHome'
import StepReview from './pages/workflow/StepReview'
import StepDispatch from './pages/workflow/StepDispatch'
import StepPO from './pages/workflow/StepPO'

// Warehouse Pages (WAREHOUSE 등급)
import WarehouseDashboard from './pages/warehouse/WarehouseDashboard'
import WarehouseReceive from './pages/warehouse/WarehouseReceive'
import WarehouseRelease from './pages/warehouse/WarehouseRelease'

// Accounting Pages - TBD (placeholder)

// Legacy Admin Pages (설정용)
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import OrderSheetList from './pages/admin/OrderSheetList'
import OrderSheetCreate from './pages/admin/OrderSheetCreate'
import OrderReview from './pages/admin/OrderReview'
import SalesOrderList from './pages/admin/SalesOrderList'
import SalesOrderDetail from './pages/admin/SalesOrderDetail'
import POList from './pages/admin/POList'
import PurchaseOrderCreate from './pages/admin/PurchaseOrderCreate'
import ConfirmedPurchaseOrderList from './pages/admin/ConfirmedPurchaseOrderList'
import ShipmentList from './pages/admin/ShipmentList'
import ShipmentDetail from './pages/admin/ShipmentDetail'
import DocumentInbox from './pages/admin/DocumentInbox'
import WarehouseGate from './pages/admin/WarehouseGate'
import CatalogManager from './pages/admin/CatalogManager'
import VehicleTypeSettings from './pages/admin/VehicleTypeSettings'
import ProductMaster from './pages/admin/ProductMaster'
import PriceListManager from './pages/admin/PriceListManager'
import OrganizationMaster from './pages/admin/OrganizationMaster'
import SupplierMaster from './pages/admin/SupplierMaster'
import CarrierMaster from './pages/admin/CarrierMaster'
import UserList from './pages/admin/UserList'
import UserManagement from './pages/admin/UserManagement'
import DocumentHub from './pages/admin/DocumentHub'
import SystemSettings from './pages/admin/SystemSettings'
import LLMSettings from './pages/admin/LLMSettings'

// Public Pages
import OrderSheetView from './pages/front/OrderSheetView'
import PurchaseOrderView from './pages/front/PurchaseOrderView'
import DispatchView from './pages/public/DispatchView'
import PriceListGuestView from './pages/front/PriceListGuestView'

// Front (Customer) Pages
import FrontLayout from './layouts/FrontLayout'
import InviteLanding from './pages/front/InviteLanding'
import B2BOrderGrid from './pages/front/B2BOrderGrid'
import CustomerConfirm from './pages/front/CustomerConfirm'
import DeliveryTracking from './pages/front/DeliveryTracking'
import CustomerDashboard from './pages/front/CustomerDashboard'
import CustomerOrderList from './pages/front/CustomerOrderList'
import ProductCatalog from './pages/front/ProductCatalog'
import ProfileSetup from './pages/front/ProfileSetup'
import FleetManagement from './pages/front/FleetManagement'

function App() {
    useEffect(() => {
        initKakao();

        // Note: Firebase seed 데이터는 Firebase Console에서 직접 추가하거나
        // 관리자 로그인 후 수동으로 실행해야 합니다.
        // 자동 시드는 보안 규칙으로 인해 비활성화됨
        console.log('MEATGO App initialized')
    }, []);

    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                    <Route path="/order-sheet/:token" element={<OrderSheetView />} />
                    <Route path="/purchase-order/:token" element={<PurchaseOrderView />} />
                    <Route path="/dispatch/:token" element={<DispatchView />} />
                    <Route path="/invite/:token" element={<InviteActivation />} />
                    <Route path="/price-view/:token" element={<PriceListGuestView />} />


                    {/* ========================================
                          WAREHOUSE (창고직원) - 반입/출고
                       ======================================== */}
                    <Route
                        path="/warehouse"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'WAREHOUSE']}>
                                <WarehouseDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/warehouse/receive/:id"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'WAREHOUSE']}>
                                <WarehouseReceive />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/warehouse/release/:id"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'WAREHOUSE']}>
                                <WarehouseRelease />
                            </ProtectedRoute>
                        }
                    />

                    {/* ========================================
                          ACCOUNTANT (경리직원) - 정산 (TBD - 임시 워크플로우로 리디렉션)
                       ======================================== */}
                    <Route
                        path="/accounting"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'ACCOUNTING']}>
                                <Navigate to="/admin/workflow" replace />
                            </ProtectedRoute>
                        }
                    />

                    {/* ========================================
                          ADMIN (관리자) - 사이드바 레이아웃
                       ======================================== */}
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'ACCOUNTING']}>
                                <AdminLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        <Route path="documents" element={<DocumentHub />} />
                        <Route path="users/list" element={<UserManagement />} />
                        <Route path="users" element={<UserList />} />
                        <Route path="users/staff" element={<UserList />} />
                        <Route path="users/customers" element={<OrganizationMaster />} />
                        <Route path="users/suppliers" element={<SupplierMaster />} />
                        <Route path="users/carriers" element={<CarrierMaster />} />
                        {/* Products */}
                        <Route path="products/b2b" element={<ProductMaster channel="B2B" />} />
                        <Route path="products/b2c" element={<ProductMaster channel="B2C" />} />
                        <Route path="products/price-lists" element={<PriceListManager />} />
                        {/* Order Book */}
                        <Route path="order-sheets" element={<OrderSheetList />} />
                        <Route path="order-sheets/create" element={<OrderSheetCreate />} />
                        <Route path="order-sheets/:id/review" element={<OrderReview />} />
                        <Route path="sales-orders" element={<SalesOrderList />} />
                        <Route path="sales-orders/:id" element={<SalesOrderDetail />} />
                        {/* 거래내역 */}
                        <Route path="purchase-orders" element={<POList />} />
                        <Route path="purchase-orders/create" element={<PurchaseOrderCreate />} />
                        <Route path="confirmed-purchase-orders" element={<ConfirmedPurchaseOrderList />} />
                        <Route path="shipments" element={<ShipmentList />} />
                        <Route path="shipments/:id" element={<ShipmentDetail />} />
                        <Route path="transactions" element={<Dashboard />} />
                        {/* Settings */}
                        <Route path="settings/catalogs" element={<CatalogManager />} />
                        <Route path="settings/vehicles" element={<VehicleTypeSettings />} />
                        <Route path="settings/documents" element={<DocumentInbox />} />
                        <Route path="settings/warehouse" element={<WarehouseGate />} />
                        <Route path="settings/system" element={<SystemSettings />} />
                        <Route path="settings/llm" element={<LLMSettings />} />
                        {/* Legacy: workflow */}
                        <Route path="workflow" element={<WorkflowHome />} />
                        <Route path="workflow/finalize/:id" element={<StepReview />} />
                        <Route path="workflow/po/:id" element={<StepPO />} />
                        <Route path="workflow/dispatch/:id" element={<StepDispatch />} />
                        <Route path="workflow/order-create" element={<OrderSheetCreate />} />
                    </Route>

                    {/* ========================================
                          PUBLIC - Purchase Order View (Supplier)
                       ======================================== */}
                    <Route path="/purchase-order/:token" element={<PurchaseOrderView />} />

                    {/* ========================================
                          CUSTOMER (고객) - 주문/확인/배송조회
                          (토큰 기반 접근이므로 별도 권한 검사 불필요)
                       ======================================== */}
                    <Route path="/order" element={<FrontLayout />}>
                        <Route path="dashboard" element={
                            <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                                <CustomerDashboard />
                            </ProtectedRoute>
                        } />
                        <Route path="list" element={
                            <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                                <CustomerOrderList />
                            </ProtectedRoute>
                        } />
                        <Route path="history" element={
                            <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                                <CustomerOrderList />
                            </ProtectedRoute>
                        } />
                        <Route path="catalog" element={<ProductCatalog />} />
                        <Route path="tracking" element={<DeliveryTracking />} />
                        <Route path="profile-setup" element={
                            <ProtectedRoute allowedRoles={['CUSTOMER', '3PL', 'ADMIN']}>
                                <ProfileSetup />
                            </ProtectedRoute>
                        } />
                        <Route path="fleet" element={
                            <ProtectedRoute allowedRoles={['3PL', 'ADMIN']}>
                                <FleetManagement />
                            </ProtectedRoute>
                        } />

                        {/* 토큰 기반 개별 주문서 접근 */}
                        <Route path=":token" element={<InviteLanding />} />
                        <Route path=":token/edit" element={<B2BOrderGrid />} />
                        <Route path=":token/confirm" element={<CustomerConfirm />} />
                        <Route path=":token/tracking" element={<DeliveryTracking />} />
                    </Route>

                    {/* Default: 로그인 페이지로 */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}

export default App
