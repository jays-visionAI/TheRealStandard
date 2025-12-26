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

// Accounting Pages (ACCOUNTANT 등급)
import AccountingDashboard from './pages/accounting/AccountingDashboard'

// Legacy Admin Pages (설정용)
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import OrderSheetList from './pages/admin/OrderSheetList'
import OrderSheetCreate from './pages/admin/OrderSheetCreate'
import OrderReview from './pages/admin/OrderReview'
import SalesOrderList from './pages/admin/SalesOrderList'
import SalesOrderDetail from './pages/admin/SalesOrderDetail'
import POList from './pages/admin/POList'
import ShipmentList from './pages/admin/ShipmentList'
import ShipmentDetail from './pages/admin/ShipmentDetail'
import DocumentInbox from './pages/admin/DocumentInbox'
import WarehouseGate from './pages/admin/WarehouseGate'
import CatalogManager from './pages/admin/CatalogManager'
import VehicleTypeSettings from './pages/admin/VehicleTypeSettings'
import ProductMaster from './pages/admin/ProductMaster'
import OrganizationMaster from './pages/admin/OrganizationMaster'
import SupplierMaster from './pages/admin/SupplierMaster'
import UserList from './pages/admin/UserList'
import DocumentHub from './pages/admin/DocumentHub'

// Front (Customer) Pages
import FrontLayout from './layouts/FrontLayout'
import InviteLanding from './pages/front/InviteLanding'
import B2BOrderGrid from './pages/front/B2BOrderGrid'
import CustomerConfirm from './pages/front/CustomerConfirm'
import DeliveryTracking from './pages/front/DeliveryTracking'

function App() {
    useEffect(() => {
        initKakao();
    }, []);

    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* ========================================
                          로그인/인증
                       ======================================== */}
                    <Route path="/invite/:token" element={<InviteActivation />} />
                    <Route
                        path="/login"
                        element={
                            <PublicRoute>
                                <Login />
                            </PublicRoute>
                        }
                    />


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
                          ACCOUNTANT (경리직원) - 정산
                       ======================================== */}
                    <Route
                        path="/accounting"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'ACCOUNTING']}>
                                <AccountingDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* ========================================
                          ADMIN (관리자) - 사이드바 레이아웃
                       ======================================== */}
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'OPS']}>
                                <AdminLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        <Route path="documents" element={<DocumentHub />} />
                        <Route path="users" element={<UserList />} />
                        <Route path="users/customers" element={<OrganizationMaster />} />
                        <Route path="users/suppliers" element={<SupplierMaster />} />
                        <Route path="users/accounting" element={<Navigate to="/admin/users?role=ACCOUNTING" replace />} />
                        <Route path="users/warehouse" element={<Navigate to="/admin/users?role=WAREHOUSE" replace />} />
                        <Route path="users/sales" element={<Navigate to="/admin/users?role=OPS" replace />} />
                        {/* Products */}
                        <Route path="products" element={<ProductMaster />} />
                        {/* Order Book */}
                        <Route path="order-sheets" element={<OrderSheetList />} />
                        <Route path="order-sheets/create" element={<OrderSheetCreate />} />
                        <Route path="order-sheets/:id/review" element={<OrderReview />} />
                        <Route path="sales-orders" element={<SalesOrderList />} />
                        <Route path="sales-orders/:id" element={<SalesOrderDetail />} />
                        {/* 거래내역 */}
                        <Route path="purchase-orders" element={<POList />} />
                        <Route path="shipments" element={<ShipmentList />} />
                        <Route path="shipments/:id" element={<ShipmentDetail />} />
                        <Route path="transactions" element={<Dashboard />} />
                        {/* Settings */}
                        <Route path="settings/catalogs" element={<CatalogManager />} />
                        <Route path="settings/vehicles" element={<VehicleTypeSettings />} />
                        <Route path="settings/documents" element={<DocumentInbox />} />
                        <Route path="settings/warehouse" element={<WarehouseGate />} />
                        {/* Legacy: workflow */}
                        <Route path="workflow" element={<WorkflowHome />} />
                        <Route path="workflow/finalize/:id" element={<StepReview />} />
                        <Route path="workflow/po/:id" element={<StepPO />} />
                        <Route path="workflow/dispatch/:id" element={<StepDispatch />} />
                        <Route path="workflow/order-create" element={<OrderSheetCreate />} />
                    </Route>

                    {/* ========================================
                          CUSTOMER (고객) - 주문/확인/배송조회
                          (토큰 기반 접근이므로 별도 권한 검사 불필요)
                       ======================================== */}
                    <Route path="/order" element={<FrontLayout />}>
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
