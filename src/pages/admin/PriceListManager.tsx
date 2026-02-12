import { useState, useMemo, useEffect } from 'react'
import { Timestamp } from 'firebase/firestore'
import {
    PackageIcon,
    PlusIcon,
    SearchIcon,
    EditIcon,
    EyeIcon,
    XIcon,
    FileTextIcon,
    TrashIcon,
    ClipboardListIcon,
    CheckCircleIcon,
    AlertTriangleIcon,
    CopyIcon,
    ExternalLinkIcon,
    TrendingUpIcon,
    UsersIcon,
    MousePointerClickIcon
} from '../../components/Icons'
import { getAllProducts, type FirestoreProduct } from '../../lib/productService'
import { compareProductOrder } from '../../lib/productSortOrder'
import { getAllOrderSheets, createOrderSheet, setOrderSheetItems, type FirestoreOrderSheet } from '../../lib/orderService'
import {
    createPriceList,
    updatePriceList,
    getAllPriceLists,
    deletePriceList,
    type FirestorePriceList,
    type PriceListItem
} from '../../lib/priceListService'
import './ProductMaster.css' // Using same styles for consistency

export default function PriceListManager() {
    const [priceLists, setPriceLists] = useState<FirestorePriceList[]>([])
    const [products, setProducts] = useState<FirestoreProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [orderSheets, setOrderSheets] = useState<FirestoreOrderSheet[]>([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [showOrdersModal, setShowOrdersModal] = useState(false)
    const [selectedList, setSelectedList] = useState<FirestorePriceList | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [showShareModal, setShowShareModal] = useState(false)
    const [recipientName, setRecipientName] = useState('')
    const [activeTab, setActiveTab] = useState<'templates' | 'history'>('templates')

    // 모달 통보 전용 상태
    const [confirmConfig, setConfirmConfig] = useState<{
        title: string,
        message: string,
        onConfirm?: () => void,
        onCancel?: () => void,
        isDanger?: boolean,
        confirmText?: string,
        cancelText?: string,
        type: 'alert' | 'confirm' | 'copy'
    } | null>(null)

    // 알림창 헬퍼
    const showAlert = (title: string, message: string, isDanger = false) => {
        setConfirmConfig({
            title,
            message,
            type: 'alert',
            isDanger,
            confirmText: '확인'
        })
    }

    // 확인창 헬퍼
    const showConfirm = (title: string, message: string, onConfirm: () => void, isDanger = false) => {
        setConfirmConfig({
            title,
            message,
            type: 'confirm',
            isDanger,
            confirmText: '확인',
            cancelText: '취소',
            onConfirm: () => {
                onConfirm()
                setConfirmConfig(null)
            },
            onCancel: () => setConfirmConfig(null)
        })
    }

    // Form state for creating/editing
    const [title, setTitle] = useState('')
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
    const [supplyPrices, setSupplyPrices] = useState<Record<string, number>>({})
    const [productSearch, setProductSearch] = useState('')
    const [validUntil, setValidUntil] = useState('')

    // Filter products based on search query
    const filteredProducts = useMemo(() => {
        let list = [...products]
        if (productSearch.trim()) {
            const query = productSearch.toLowerCase()
            list = list.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.category1 && p.category1.toLowerCase().includes(query))
            )
        }

        // Sort: Prioritize selected items, then alphabetical
        return list.sort((a, b) => {
            const aSelected = selectedProductIds.has(a.id) ? 1 : 0
            const bSelected = selectedProductIds.has(b.id) ? 1 : 0
            if (aSelected !== bSelected) return bSelected - aSelected
            return compareProductOrder(a, b)
        })
    }, [products, productSearch, selectedProductIds])

    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)
            const [pLists, pData, oData] = await Promise.all([
                getAllPriceLists(),
                getAllProducts(),
                getAllOrderSheets()
            ])
            setPriceLists(pLists)
            setOrderSheets(oData)

            // Robustly filter products: default isActive to true and category2 to B2B if missing
            const b2bProducts = pData.map(p => ({
                ...p,
                isActive: p.isActive !== false,
                category2: p.category2 || 'B2B',
                category1: p.category1 || (p as any).category || '냉장'
            }))
                .filter(p => p.isActive && (p.category2 === 'B2B' || p.category2 === 'BOTH'))
                .sort(compareProductOrder)

            setProducts(b2bProducts)
        } catch (err) {
            console.error('Failed to load PriceListManager data:', err)
            setError('데이터를 불러오는 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleOpenCreateModal = () => {
        setIsEditing(false)
        setSelectedList(null)
        setTitle('')
        setSelectedProductIds(new Set())
        const initialPrices: Record<string, number> = {}
        products.forEach(p => {
            initialPrices[p.id] = p.wholesalePrice
        })
        setSupplyPrices(initialPrices)
        setValidUntil('')
        setShowCreateModal(true)
    }

    const handleOpenEditModal = (list: FirestorePriceList) => {
        setIsEditing(true)
        setSelectedList(list)
        setTitle(list.title)

        const newSelectedIds = new Set<string>()
        const newPrices: Record<string, number> = {}

        // Populate with existing items
        list.items.forEach(item => {
            newSelectedIds.add(item.productId)
            newPrices[item.productId] = item.supplyPrice
        })

        // Add default prices for other products not in the list (just in case)
        products.forEach(p => {
            if (!newPrices[p.id]) {
                newPrices[p.id] = p.wholesalePrice
            }
        })

        setSelectedProductIds(newSelectedIds)
        setSupplyPrices(newPrices)
        setValidUntil(list.validUntil?.toDate ? list.validUntil.toDate().toISOString().split('T')[0] : '')
        setShowCreateModal(true)
    }

    const toggleProductSelection = (productId: string) => {
        const newSet = new Set(selectedProductIds)
        if (newSet.has(productId)) {
            newSet.delete(productId)
        } else {
            newSet.add(productId)
        }
        setSelectedProductIds(newSet)
    }

    const handleSupplyPriceChange = (productId: string, value: string) => {
        const num = parseFloat(value) || 0
        setSupplyPrices(prev => ({ ...prev, [productId]: num }))
    }

    const handleDuplicate = (list: FirestorePriceList) => {
        setIsEditing(false)
        setSelectedList(null)
        setTitle(`${list.title} (복사본)`)

        const newSelectedIds = new Set<string>()
        const newPrices: Record<string, number> = { ...supplyPrices }

        list.items.forEach(item => {
            newSelectedIds.add(item.productId)
            newPrices[item.productId] = item.supplyPrice
        })

        setSelectedProductIds(newSelectedIds)
        setSupplyPrices(newPrices)
        setValidUntil(list.validUntil?.toDate ? list.validUntil.toDate().toISOString().split('T')[0] : '')
        setShowDetailModal(false)
        setShowCreateModal(true)
        setProductSearch('') // Reset search to show all items (with selected at top)
    }

    const handleSave = async () => {
        if (!title.trim()) {
            showAlert('입력 오류', '단가표 제목을 입력하세요.', true)
            return
        }
        if (selectedProductIds.size === 0) {
            showAlert('입력 오류', '최소 하나 이상의 품목을 선택하세요.', true)
            return
        }

        try {
            setSaving(true)
            const items: PriceListItem[] = products
                .filter(p => selectedProductIds.has(p.id))
                .map(p => ({
                    productId: p.id,
                    name: p.name || '',
                    costPrice: p.costPrice ?? 0,
                    wholesalePrice: p.wholesalePrice ?? 0,
                    supplyPrice: supplyPrices[p.id] ?? 0,
                    unit: p.unit || 'kg',
                    category1: p.category1 || '기타',
                    boxWeight: p.boxWeight ?? null
                }))

            if (isEditing && selectedList) {
                await updatePriceList(selectedList.id, {
                    title,
                    items,
                    validUntil: validUntil ? Timestamp.fromDate(new Date(validUntil)) : null
                })
                showAlert('수정 완료', '단가표가 수정되었습니다.')
            } else {
                await createPriceList({
                    title,
                    items,
                    validUntil: validUntil ? Timestamp.fromDate(new Date(validUntil)) : null
                })
                showAlert('생성 완료', '단가표가 생성되었습니다.')
            }

            setShowCreateModal(false)
            loadData()
        } catch (err) {
            console.error(err)
            showAlert('저장 실패', '저장에 실패했습니다.', true)
        } finally {
            setSaving(false)
        }
    }

    const handleShare = (list: FirestorePriceList) => {
        setSelectedList(list)
        setRecipientName('')
        setShowShareModal(true)
    }

    const confirmShare = async () => {
        if (!selectedList) return

        const name = recipientName.trim()
        if (!name) {
            showAlert('입력 오류', '수신 고객명을 입력해 주세요.', true)
            return
        }

        try {
            setSaving(true)
            const tokenId = 'OS-' + Math.random().toString(36).substr(2, 9)

            // 1. 단가표 템플릿 정보를 기반으로 예비발주서(OrderSheet) 생성
            // 이제 개별 단가표를 새로 만들지 않고, 템플릿을 참조하는 발주서를 바로 만듭니다.
            const newOrderSheet = await createOrderSheet({
                customerOrgId: 'GUEST-PL-' + Date.now(),
                customerName: name,
                isGuest: true,
                status: 'SENT', // 'SENT' 상태는 고객에게 발송되어 확인 대기 중임을 의미
                inviteTokenId: tokenId,
                sourcePriceListId: selectedList.id,
                cutOffAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 기본 1주일 뒤 마감
                shipTo: '',
                adminComment: selectedList.adminComment || `단가표[${selectedList.title}]를 통한 견적 발송`,
                reachCount: 0
            })

            // 2. 단가표의 품목들을 발주서 항목으로 복사
            const orderItems = selectedList.items.map(item => ({
                productId: item.productId,
                productName: item.name,
                category1: item.category1,
                unit: 'box',
                unitPrice: item.supplyPrice,
                qtyRequested: 0,
                estimatedKg: 0,
                amount: 0
            }))
            await setOrderSheetItems(newOrderSheet.id, orderItems)

            const link = `${window.location.origin}/price-view/${tokenId}`
            const shareMessage = `안녕하세요, ${name} 귀하.\n요청하신 단가표(견적서) 링크입니다.\n\n${link}`

            try {
                await navigator.clipboard.writeText(shareMessage)
                showAlert('생성 및 복사 완료', `[${name} 귀하] 전용 견적(발주서) 링크가 생성되었으며 공유 메시지가 복사되었습니다.`)
                setShowShareModal(false)
                loadData()
            } catch (err) {
                console.error('Clipboard copy failed:', err)
                setConfirmConfig({
                    title: '링크 생성 완료',
                    message: `[${name} 귀하] 전용 견적 링크가 생성되었습니다.\n아래 내용을 직접 복사해 주세요:`,
                    type: 'copy',
                    confirmText: '확인',
                    cancelText: shareMessage
                })
                setShowShareModal(false)
                loadData()
            }
        } catch (err) {
            console.error('Failed to create preliminary order:', err)
            showAlert('오류', '견적 생성에 실패했습니다.', true)
        } finally {
            setSaving(false)
        }
    }



    const handleDelete = (id: string) => {
        showConfirm('단가표 삭제', '이 단가표를 정말 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.', async () => {
            try {
                await deletePriceList(id)
                loadData()
                showAlert('완료', '단가표가 삭제되었습니다.')
            } catch (err) {
                console.error(err)
                showAlert('실패', '삭제 중 오류가 발생했습니다.', true)
            }
        }, true)
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(val)

    if (loading) return (
        <div className="p-20 text-center">
            <div className="spinner mb-4" style={{ margin: '0 auto' }}></div>
            <p>데이터를 불러오는 중...</p>
        </div>
    )

    if (error) return (
        <div className="p-20 text-center text-error">
            <p className="mb-4">
                <span style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                    <AlertTriangleIcon size={24} color="#ef4444" />
                </span>
                {error}
            </p>
            <button className="btn btn-primary" onClick={loadData}>다시 시도</button>
        </div>
    )

    return (
        <div className="product-master">
            <header className="page-header">
                <div className="header-left">
                    <h2>
                        <ClipboardListIcon size={24} color="var(--color-primary)" className="mr-2" />
                        단가표 및 견적 관리
                    </h2>
                    <div className="header-tips glass-card mt-3">
                        <ul className="tips-list">
                            <li><TrendingUpIcon size={14} /> <strong>템플릿 활용</strong>: 마스터 단가표를 만들어 복제해서 사용하세요.</li>
                            <li><ExternalLinkIcon size={14} /> <strong>견적 발송</strong>: 공유 시마다 고객전용 견적서가 생성되어 개별 추적됩니다.</li>
                            <li><UsersIcon size={14} /> <strong>도달/전환</strong>: 발송 내역 탭에서 고객별 반응을 실시간 확인하세요.</li>
                        </ul>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={handleOpenCreateModal}>
                        <PlusIcon size={18} /> 새 템플릿 생성
                    </button>
                </div>
            </header>

            <div className="tabs-container mb-8" style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '24px' }}>
                <button
                    className={`tab-item ${activeTab === 'templates' ? 'active' : ''}`}
                    onClick={() => setActiveTab('templates')}
                    style={{
                        padding: '12px 4px',
                        fontSize: '15px',
                        fontWeight: activeTab === 'templates' ? 'bold' : 'normal',
                        color: activeTab === 'templates' ? 'var(--color-primary)' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'templates' ? '2px solid var(--color-primary)' : 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    마스터 템플릿 ({priceLists.filter(l => !l.shareTokenId).length})
                </button>
                <button
                    className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                    style={{
                        padding: '12px 4px',
                        fontSize: '15px',
                        fontWeight: activeTab === 'history' ? 'bold' : 'normal',
                        color: activeTab === 'history' ? 'var(--color-primary)' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'history' ? '2px solid var(--color-primary)' : 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    견적/공유 발송 내역 ({priceLists.filter(l => l.shareTokenId).length + orderSheets.filter(o => o.sourcePriceListId).length})
                </button>
            </div>

            <div className="stats-grid">
                <div className="stat-card glass-card">
                    <span className="stat-label">전체 단가표 템플릿</span>
                    <span className="stat-value">{priceLists.filter(l => !l.shareTokenId).length}</span>
                </div>
                <div className="stat-card glass-card clickable" onClick={() => setShowOrdersModal(true)}>
                    <span className="stat-label">누적 발주 전환</span>
                    <span className="stat-value">
                        {(() => {
                            const legacyPriceListConv = priceLists.filter(l => l.shareTokenId).reduce((sum, l) => sum + (l.conversionCount || 0), 0)
                            const orderSheetConv = orderSheets.filter(o => o.sourcePriceListId && o.status !== 'SENT').length
                            return legacyPriceListConv + orderSheetConv
                        })()}
                    </span>
                    <span className="stat-hint">클릭 시 리스트 확인</span>
                </div>
                <div className="stat-card glass-card">
                    <span className="stat-label">누적 도달 수 (견적 확인)</span>
                    <span className="stat-value">
                        {(() => {
                            const priceListReach = priceLists.reduce((sum, l) => sum + (l.reachCount || 0), 0)
                            const orderReach = orderSheets.reduce((sum, o) => sum + (o.reachCount || 0), 0)
                            return priceListReach + orderReach
                        })()}
                    </span>
                </div>
                <div className="stat-card glass-card">
                    <span className="stat-label">평균 전환율</span>
                    <span className="stat-value">
                        {(() => {
                            const priceListReach = priceLists.reduce((sum, l) => sum + (l.reachCount || 0), 0)
                            const orderReach = orderSheets.reduce((sum, o) => sum + (o.reachCount || 0), 0)
                            const totalReach = priceListReach + orderReach

                            const legacyPriceListConv = priceLists.filter(l => l.shareTokenId).reduce((sum, l) => sum + (l.conversionCount || 0), 0)
                            const orderSheetConv = orderSheets.filter(o => o.sourcePriceListId && o.status !== 'SENT').length
                            const totalConv = legacyPriceListConv + orderSheetConv

                            return totalReach > 0 ? ((totalConv / totalReach) * 100).toFixed(1) : 0
                        })()}%
                    </span>
                </div>
            </div>

            <div className="table-container glass-card">
                {activeTab === 'templates' ? (
                    <table className="product-table">
                        <thead>
                            <tr>
                                <th>단가표 템플릿 제목</th>
                                <th>품목 수</th>
                                <th>누적 발송 / 주문</th>
                                <th>최종수정일</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {priceLists
                                .filter(l => !l.shareTokenId)
                                .map(list => {
                                    const linkedOrders = orderSheets.filter(o => o.sourcePriceListId === list.id)
                                    const reach = (list.reachCount || 0) + linkedOrders.reduce((sum, o) => sum + (o.reachCount || 0), 0)
                                    const conv = (list.conversionCount || 0) + linkedOrders.filter(o => o.status !== 'SENT').length
                                    return (
                                        <tr key={list.id}>
                                            <td><strong>{list.title}</strong></td>
                                            <td>{list.items.length}개 품목</td>
                                            <td>
                                                <div className="reach-stats">
                                                    <span className="reach" title="총 도달수"><MousePointerClickIcon size={12} /> {reach}</span>
                                                    <span className="divider">/</span>
                                                    <span className="conv"><FileTextIcon size={12} /> {conv}</span>
                                                </div>
                                            </td>
                                            <td>{list.updatedAt?.toDate ? list.updatedAt.toDate().toLocaleDateString() : '-'}</td>
                                            <td className="actions">
                                                <button className="btn btn-ghost btn-sm" title="상세보기" onClick={() => { setSelectedList(list); setShowDetailModal(true); }}>
                                                    <EyeIcon size={16} />
                                                </button>
                                                <button className="btn btn-ghost btn-sm text-primary" title="이 템플릿으로 견적 공유" onClick={() => handleShare(list)}>
                                                    <ExternalLinkIcon size={16} />
                                                </button>
                                                <button className="btn btn-ghost btn-sm" title="템플릿 복제" onClick={() => handleDuplicate(list)}>
                                                    <CopyIcon size={16} />
                                                </button>
                                                <button className="btn btn-ghost btn-sm" title="수정" onClick={() => handleOpenEditModal(list)}>
                                                    <EditIcon size={16} />
                                                </button>
                                                <button className="btn btn-ghost btn-sm danger" title="템플릿 삭제" onClick={() => handleDelete(list.id)}>
                                                    <TrashIcon size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                        </tbody>
                    </table>
                ) : (
                    <table className="product-table">
                        <thead>
                            <tr>
                                <th>수신 고객/업체명</th>
                                <th>원본 템플릿</th>
                                <th>도달 / 상태</th>
                                <th className="text-right">품목수</th>
                                <th className="text-right">무게수 (kg)</th>
                                <th className="text-right">박스수</th>
                                <th className="text-right">금액</th>
                                <th>발송일시</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                ...priceLists.filter(l => l.shareTokenId).map(l => ({
                                    id: l.id,
                                    name: l.title,
                                    templateName: '직속 공유',
                                    reach: l.reachCount || 0,
                                    status: l.conversionCount ? 'ORDERED' : 'SENT',
                                    date: l.sharedAt || l.createdAt,
                                    type: 'LEGACY',
                                    token: l.shareTokenId,
                                    stats: {
                                        items: l.items.length,
                                        kg: 0,
                                        boxes: 0,
                                        amount: 0
                                    }
                                })),
                                ...orderSheets.filter(o => o.sourcePriceListId).map(o => ({
                                    id: o.id,
                                    name: o.customerName,
                                    templateName: priceLists.find(l => l.id === o.sourcePriceListId)?.title || '삭제된 템플릿',
                                    reach: o.reachCount || 0,
                                    status: o.status === 'SENT' ? 'SENT' : 'ORDERED',
                                    date: o.createdAt,
                                    type: 'NEW',
                                    token: o.inviteTokenId,
                                    stats: {
                                        items: o.totalItems || 0,
                                        kg: o.totalKg || 0,
                                        boxes: o.totalBoxes || 0,
                                        amount: o.totalAmount || 0
                                    }
                                }))
                            ].sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0)).map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <div className="name-cell">
                                            <strong>{item.name}</strong>
                                            {item.type === 'LEGACY' && <span className="category-tag">이전방식</span>}
                                        </div>
                                    </td>
                                    <td className="text-muted text-sm">{item.templateName}</td>
                                    <td>
                                        <div className="reach-stats">
                                            <span className="reach"><MousePointerClickIcon size={12} /> {item.reach}</span>
                                            <span className="divider">|</span>
                                            <span className={`status-badge ${item.status === 'ORDERED' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'} text-[10px] font-bold px-2 py-0.5 rounded`}>
                                                {item.status === 'ORDERED' ? '주문완료' : '확인중'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-right">{item.stats.items}</td>
                                    <td className="text-right">{item.stats.kg > 0 ? formatCurrency(item.stats.kg) : '-'}</td>
                                    <td className="text-right">{item.stats.boxes > 0 ? item.stats.boxes : '-'}</td>
                                    <td className="text-right"><strong>{item.stats.amount > 0 ? `₩${formatCurrency(item.stats.amount)}` : '-'}</strong></td>
                                    <td>{item.date?.toDate ? item.date.toDate().toLocaleString() : '-'}</td>
                                    <td className="actions">
                                        <button className="btn btn-ghost btn-sm" title="링크 복사" onClick={() => {
                                            const link = `${window.location.origin}/price-view/${item.token}`;
                                            navigator.clipboard.writeText(link);
                                            showAlert('복사 완료', '견적서 링크가 복사되었습니다.');
                                        }}>
                                            <CopyIcon size={16} />
                                        </button>
                                        <button className="btn btn-ghost btn-sm danger" title="내역 삭제" onClick={() => {
                                            if (item.type === 'LEGACY') handleDelete(item.id);
                                            else {
                                                showConfirm('내역 삭제', '발송 내역을 삭제하시겠습니까? (실제 주문서가 지워지지는 않습니다)', async () => {
                                                    showAlert('참고', '발주서 삭제 기능은 발주 관리 메뉴를 이용해 주세요.');
                                                });
                                            }
                                        }}>
                                            <TrashIcon size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create / Edit Modal */}
            {showCreateModal && (
                <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
                    <div className="modal product-modal" style={{ maxWidth: '1100px', width: '96vw', maxHeight: '95vh' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><FileTextIcon size={20} /> {isEditing ? '단가표 수정' : '새 단가표 생성'}</h3>
                            <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="price-list-form-header px-4 py-2">
                                <div className="form-group mb-4">
                                    <label className="label">단가표 제목</label>
                                    <input
                                        className="input"
                                        style={{ fontSize: '1.2rem', padding: '12px 16px' }}
                                        placeholder="단가표 제목을 입력하세요 (예: 거래처명/기간)"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group mb-4">
                                    <label className="label">유효기간 설정</label>
                                    <input
                                        type="date"
                                        className="input"
                                        style={{ maxWidth: '200px' }}
                                        value={validUntil}
                                        onChange={e => setValidUntil(e.target.value)}
                                    />
                                    <p className="description" style={{ marginTop: '8px', fontSize: '13px' }}>
                                        지정한 날짜가 지나면 공개 단가표 하단에 '만료됨' 안내가 표시됩니다. (미설정 시 무기한)
                                    </p>
                                </div>
                            </div>

                            {/* Product Search */}
                            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <SearchIcon size={18} color="var(--text-secondary)" />
                                <input
                                    type="text"
                                    className="input"
                                    style={{ flex: 1, padding: '8px 12px', fontSize: '14px' }}
                                    placeholder="상품명으로 검색..."
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                />
                                {productSearch && (
                                    <button
                                        type="button"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                        onClick={() => setProductSearch('')}
                                    >
                                        <XIcon size={16} color="var(--text-secondary)" />
                                    </button>
                                )}
                            </div>

                            <div className="table-container-scroll" style={{ maxHeight: '800px', overflowY: 'auto' }}>
                                <table className="product-table price-selection-table compact-table">
                                    <thead>
                                        <tr>
                                            <th className="checkbox-col">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedProductIds(new Set(filteredProducts.map(p => p.id)))
                                                        } else {
                                                            setSelectedProductIds(new Set())
                                                        }
                                                    }}
                                                />
                                            </th>
                                            <th className="name-col">품목명</th>
                                            <th className="price-col">매입가</th>
                                            <th className="price-col">도매가 (기준)</th>
                                            <th className="price-col">공급가 (수정가능)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map((p) => {
                                            const isSelected = selectedProductIds.has(p.id)
                                            const sPrice = supplyPrices[p.id] || 0
                                            const isBelowCost = isSelected && sPrice < p.costPrice
                                            const diff = sPrice - p.costPrice

                                            return (
                                                <tr key={p.id} className={isSelected ? 'selected-row' : ''}>
                                                    <td className="checkbox-col">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleProductSelection(p.id)}
                                                        />
                                                    </td>
                                                    <td className="name-col">
                                                        <div className="name-cell">
                                                            <span className="name">{p.name}</span>
                                                            <span className="category-tag">{p.category1}</span>
                                                        </div>
                                                    </td>
                                                    <td className="price-col">₩{formatCurrency(p.costPrice)}</td>
                                                    <td className="price-col text-muted">₩{formatCurrency(p.wholesalePrice)}</td>
                                                    <td className="price-col">
                                                        <div className="supply-input-wrapper">
                                                            <input
                                                                type="number"
                                                                className={`cell-edit-input ${isBelowCost ? 'is-danger' : isSelected ? 'is-active' : ''}`}
                                                                value={sPrice}
                                                                onChange={e => handleSupplyPriceChange(p.id, e.target.value)}
                                                                disabled={!isSelected}
                                                                placeholder={p.wholesalePrice.toString()}
                                                            />
                                                            {isBelowCost && (
                                                                <div className="loss-warning">
                                                                    손실: {formatCurrency(Math.abs(diff))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '20px' }}>
                            <div className="footer-left">
                                <span className="selection-badge">선택됨: {selectedProductIds.size}개</span>
                            </div>
                            <div className="footer-actions" style={{ display: 'flex', gap: '12px' }}>
                                <button className="btn btn-secondary" style={{ minWidth: '100px' }} onClick={() => setShowCreateModal(false)}>취소</button>
                                <button
                                    className="btn btn-primary"
                                    style={{ minWidth: '140px' }}
                                    onClick={handleSave}
                                    disabled={saving || !title.trim() || selectedProductIds.size === 0}
                                >
                                    {saving ? '저장 중...' : isEditing ? '단가표 수정하기' : '단가표 저장하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedList && (
                <div className="modal-backdrop" onClick={() => setShowDetailModal(false)}>
                    <div className="modal product-modal" style={{ maxWidth: '1100px', width: '96vw' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>
                                    <FileTextIcon size={20} color="var(--color-primary)" className="mr-2" />
                                    단가표 상세: {selectedList.title}
                                </h3>
                                <p className="text-sm text-secondary">생성일: {selectedList.createdAt?.toDate?.()?.toLocaleDateString()}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleDuplicate(selectedList)}
                                >
                                    <CopyIcon size={16} /> 복제하기
                                </button>
                                <button className="btn btn-ghost" onClick={() => setShowDetailModal(false)}>✕</button>
                            </div>
                        </div>
                        <div className="modal-body">
                            <div className="table-container">
                                <table className="product-table">
                                    <thead>
                                        <tr>
                                            <th>품목명</th>
                                            <th className="price-col">매입가</th>
                                            <th className="price-col">도매가 (기준)</th>
                                            <th className="price-col">공급가</th>
                                            <th className="price-col">매출이익</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedList.items.map((item, idx) => {
                                            const profit = item.supplyPrice - item.costPrice
                                            const isBelowCost = profit < 0
                                            return (
                                                <tr key={idx}>
                                                    <td>
                                                        <div className="name-cell">
                                                            <span className="name">{item.name}</span>
                                                            <span className="category-badge plain">{item.category1}</span>
                                                        </div>
                                                    </td>
                                                    <td className="price-col">₩{formatCurrency(item.costPrice)}</td>
                                                    <td className="price-col">₩{formatCurrency(item.wholesalePrice)}</td>
                                                    <td className="price-col">
                                                        <strong className={isBelowCost ? 'text-danger' : 'text-primary'}>
                                                            ₩{formatCurrency(item.supplyPrice)}
                                                        </strong>
                                                    </td>
                                                    <td className="price-col">
                                                        <span className={profit > 0 ? 'margin-positive' : 'margin-negative'}>
                                                            ₩{formatCurrency(profit)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Orders Modal (Converted from Price List) */}
            {showOrdersModal && (
                <div className="modal-backdrop" onClick={() => {
                    setShowOrdersModal(false)
                    setSelectedList(null)
                }}>
                    <div className="modal product-modal" style={{ maxWidth: '900px', width: '90vw' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>
                                    <TrendingUpIcon size={20} color="var(--color-primary)" className="mr-2" />
                                    {selectedList ? `[${selectedList.title}] 유입 발주서 목록` : '단가표 유입 발주서 전체 목록'}
                                </h3>
                                <p className="text-sm text-secondary">단가표를 확인한 고객이 새로 생성한 발주서 리스트입니다.</p>
                            </div>
                            <button className="btn btn-ghost" onClick={() => {
                                setShowOrdersModal(false)
                                setSelectedList(null)
                            }}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="table-container">
                                <table className="product-table">
                                    <thead>
                                        <tr>
                                            <th>고객명/업체명</th>
                                            <th>상태</th>
                                            <th>품목</th>
                                            <th>작성일</th>
                                            <th>유입 소스</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orderSheets
                                            .filter(o => selectedList ? o.sourcePriceListId === selectedList.id : o.sourcePriceListId)
                                            .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
                                            .map(order => {
                                                const sourceList = priceLists.find(l => l.id === order.sourcePriceListId)
                                                return (
                                                    <tr key={order.id}>
                                                        <td>
                                                            <div className="name-cell">
                                                                <span className="name">{order.customerName}</span>
                                                                {order.isGuest && <span className="category-tag">비회원</span>}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={`badge badge-${order.status.toLowerCase()}`}>
                                                                {order.status}
                                                            </span>
                                                        </td>
                                                        <td>{order.id}</td>
                                                        <td>{order.createdAt.toDate().toLocaleDateString()}</td>
                                                        <td>
                                                            <span className="text-sm text-primary">{sourceList?.title || '삭제된 단가표'}</span>
                                                        </td>
                                                    </tr>
                                                )
                                            }
                                            )}
                                        {orderSheets.filter(o => selectedList ? o.sourcePriceListId === selectedList.id : o.sourcePriceListId).length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="text-center py-10 text-muted">전환된 발주서가 없습니다.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => {
                                setShowOrdersModal(false)
                                setSelectedList(null)
                            }}>닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div className="modal-backdrop" onClick={() => setShowShareModal(false)}>
                    <div className="modal" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><ExternalLinkIcon size={20} color="var(--color-primary)" /> 단가표 공유</h3>
                            <button className="btn btn-ghost" onClick={() => setShowShareModal(false)}>✕</button>
                        </div>
                        <div className="modal-body p-6">
                            <div className="form-group mb-4">
                                <label className="label">수신 고객명 (선택)</label>
                                <input
                                    className="input"
                                    placeholder="고객명 또는 업체명을 입력하세요"
                                    value={recipientName}
                                    onChange={e => setRecipientName(e.target.value)}
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && confirmShare()}
                                />
                                <p className="description mt-2" style={{ fontSize: '13px' }}>
                                    고객명을 입력하면 링크 접속 시 <strong>"{recipientName || '고객'} 귀하"</strong>로 개인화된 단가표가 표시됩니다.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer p-4" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowShareModal(false)}>취소</button>
                            <button className="btn btn-primary px-6" onClick={confirmShare}>
                                <CopyIcon size={16} /> 링크 및 메시지 복사
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .price-selection-table th, .price-selection-table td {
                    padding: 8px 16px;
                }
                .checkbox-col { width: 40px; text-align: center; }
                .name-col { min-width: 200px; }
                .price-col { width: 150px; text-align: right; }
                
                .name-cell { display: flex; align-items: center; gap: 8px; }
                .name-cell .name { font-weight: 600; color: var(--text-primary); }
                .category-tag { 
                    font-size: 10px; 
                    background: var(--bg-tertiary); 
                    color: var(--text-muted); 
                    padding: 2px 6px; 
                    border-radius: 4px; 
                    width: fit-content;
                }

                .supply-input-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 4px;
                }
                
                .cell-edit-input {
                    width: 100%;
                    max-width: 120px;
                    padding: 6px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    text-align: right;
                    font-family: var(--font-mono);
                    font-weight: 600;
                    transition: all 0.2s;
                    background: var(--bg-card-muted);
                }

                .cell-edit-input.is-active {
                    background: white;
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .cell-edit-input.is-danger {
                    color: #ef4444;
                    border-color: #fca5a5;
                    background: #fef2f2;
                }

                .loss-warning {
                    font-size: 11px;
                    color: #ef4444;
                    font-weight: 500;
                }

                .selected-row {
                    background-color: rgba(59, 130, 246, 0.03);
                }

                .selection-badge {
                    background: rgba(59, 130, 246, 0.1);
                    color: var(--color-primary);
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 600;
                }

                .margin-positive { color: #10b981; font-weight: 600; }
                .margin-negative { color: #ef4444; font-weight: 600; }
                
                .table-container-scroll {
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    margin: 0 16px;
                }

                .header-tips {
                    padding: 12px 20px;
                    background: rgba(59, 130, 246, 0.03);
                    border: 1px solid rgba(59, 130, 246, 0.1);
                    margin-bottom: 8px;
                }

                .tips-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .tips-list li {
                    font-size: 13px;
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .tips-list li strong {
                    color: var(--color-primary);
                }

                .stat-card.clickable {
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .stat-card.clickable:hover {
                    border-color: var(--color-primary);
                    background: rgba(59, 130, 246, 0.05);
                    transform: translateY(-2px);
                }
                .stat-hint {
                    font-size: 11px;
                    color: var(--text-muted);
                    margin-top: 4px;
                }

                .reach-stats {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                }
                .reach-stats .reach { color: var(--text-muted); }
                .reach-stats .divider { color: var(--border-color); }
                .reach-stats .conv { 
                    font-weight: 600; 
                    color: var(--text-secondary);
                }
                .reach-stats .conv.has-conv {
                    color: var(--color-primary);
                    cursor: pointer;
                    text-decoration: underline;
                }

                .badge {
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .badge-submitted { background: #dcfce7; color: #166534; }
                .badge-draft { background: #f1f5f9; color: #475569; }
                .badge-sent { background: #e0f2fe; color: #075985; }
                .badge-confirmed { background: #ede9fe; color: #5b21b6; }
            `}</style>
            {/* Final Global Confirmation/Alert Modal */}
            {confirmConfig && (
                <div className="modal-backdrop" onClick={() => setConfirmConfig(null)} style={{ zIndex: 3000 }}>
                    <div className="modal notification-modal" style={{ maxWidth: '450px', width: '90%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-body text-center py-8">
                            <div className={`notification-icon-wrapper mb-6 mx-auto ${confirmConfig.isDanger ? 'bg-red-50' : 'bg-blue-50'} rounded-full w-20 h-20 flex items-center justify-center`}>
                                {confirmConfig.isDanger ? (
                                    <AlertTriangleIcon size={40} color="#ef4444" />
                                ) : confirmConfig.type === 'copy' ? (
                                    <CopyIcon size={40} color="var(--color-primary)" />
                                ) : (
                                    <FileTextIcon size={40} color="var(--color-primary)" />
                                )}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{confirmConfig.title}</h3>
                            <p className="text-secondary whitespace-pre-wrap mb-4">{confirmConfig.message}</p>

                            {confirmConfig.type === 'copy' && (
                                <div className="p-3 bg-slate-100 rounded-lg text-xs font-mono break-all border border-slate-200 select-all mb-4">
                                    {confirmConfig.cancelText}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px', borderTop: 'none', paddingTop: 0 }}>
                            {confirmConfig.type === 'confirm' && (
                                <button className="btn btn-secondary px-8" onClick={confirmConfig.onCancel}>
                                    {confirmConfig.cancelText || '취소'}
                                </button>
                            )}
                            <button
                                className={`btn ${confirmConfig.isDanger ? 'btn-danger' : 'btn-primary'} px-8`}
                                onClick={confirmConfig.onConfirm || (() => setConfirmConfig(null))}
                                style={confirmConfig.isDanger ? { backgroundColor: '#ef4444', color: 'white' } : {}}
                            >
                                {confirmConfig.confirmText || '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
