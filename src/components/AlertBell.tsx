import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    BellIcon,
    PackageIcon,
    AlertTriangleIcon,
    ClipboardListIcon,
    WalletIcon,
} from './Icons'
import {
    getNotificationsForUser,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    runAllDetections,
    type FirestoreNotification,
} from '../lib/notificationService'
import './AlertBell.css'

const SEVERITY_COLOR: Record<string, string> = {
    INFO: '#0EA5E9',
    WARN: '#F59E0B',
    DANGER: '#DC2626',
}

function getTypeIcon(type: string): ReactNode {
    switch (type) {
        case 'INVENTORY_OVERAGE':
        case 'INVENTORY_SHORTAGE':
            return <PackageIcon size={14} />
        case 'PRICELIST_EXPIRING':
        case 'PRICELIST_EXPIRED':
            return <ClipboardListIcon size={14} />
        case 'SETTLEMENT_DUE':
        case 'SETTLEMENT_OVERDUE':
            return <WalletIcon size={14} />
        default:
            return <BellIcon size={14} />
    }
}

export default function AlertBell() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState<FirestoreNotification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const loadNotifications = async () => {
        if (!user) return
        try {
            setLoading(true)
            const [list, count] = await Promise.all([
                getNotificationsForUser(user.id, user.role, 30),
                getUnreadCount(user.id, user.role),
            ])
            setNotifications(list)
            setUnreadCount(count)
        } catch (err) {
            console.error('Failed to load notifications:', err)
        } finally {
            setLoading(false)
        }
    }

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    // 초기 로드 + 5분마다 갱신
    useEffect(() => {
        loadNotifications()
        const interval = setInterval(loadNotifications, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [user])

    const handleBellClick = async () => {
        const willOpen = !open
        setOpen(willOpen)
        if (willOpen && user) {
            await runAllDetections()
            await loadNotifications()
        }
    }

    const handleNotifClick = async (n: FirestoreNotification) => {
        if (!user) return
        await markAsRead(n.id, user.id)
        setOpen(false)
        if (n.linkPath) {
            navigate(n.linkPath)
        }
        loadNotifications()
    }

    const handleMarkAllRead = async () => {
        if (!user) return
        await markAllAsRead(user.id, user.role)
        loadNotifications()
    }

    const formatTime = (ts: any): string => {
        if (!ts?.toDate) return ''
        const d = ts.toDate() as Date
        const diffMs = Date.now() - d.getTime()
        const diffMin = Math.floor(diffMs / 60000)
        if (diffMin < 1) return '방금 전'
        if (diffMin < 60) return `${diffMin}분 전`
        const diffHr = Math.floor(diffMin / 60)
        if (diffHr < 24) return `${diffHr}시간 전`
        const diffDay = Math.floor(diffHr / 24)
        if (diffDay < 7) return `${diffDay}일 전`
        return d.toLocaleDateString('ko-KR')
    }

    const isUnread = (n: FirestoreNotification): boolean => {
        if (!user) return false
        if (n.recipientUserId === user.id) return !n.isRead
        return !(n.readBy || []).includes(user.id)
    }

    return (
        <div className="alert-bell" ref={dropdownRef}>
            <button className="bell-button" onClick={handleBellClick} aria-label="알람">
                <BellIcon size={20} />
                {unreadCount > 0 && (
                    <span className="bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {open && (
                <div className="bell-dropdown">
                    <div className="bell-header">
                        <span className="bell-title">알람 ({unreadCount}건 미읽음)</span>
                        {unreadCount > 0 && (
                            <button className="mark-all-btn" onClick={handleMarkAllRead}>모두 읽음</button>
                        )}
                    </div>

                    <div className="bell-list">
                        {loading ? (
                            <div className="bell-empty">로딩 중...</div>
                        ) : notifications.length === 0 ? (
                            <div className="bell-empty">알람이 없습니다.</div>
                        ) : (
                            notifications.map(n => {
                                const unread = isUnread(n)
                                return (
                                    <div
                                        key={n.id}
                                        className={`bell-item ${unread ? 'unread' : ''}`}
                                        onClick={() => handleNotifClick(n)}
                                    >
                                        <div className="item-icon">{getTypeIcon(n.type)}</div>
                                        <div className="item-content">
                                            <div className="item-header-row">
                                                <span className="item-title" style={{ color: SEVERITY_COLOR[n.severity] }}>
                                                    {n.title}
                                                </span>
                                                <span className="item-time">{formatTime(n.triggeredAt)}</span>
                                            </div>
                                            <div className="item-message">{n.message}</div>
                                            {n.linkLabel && (
                                                <span className="item-link">{n.linkLabel} &rarr;</span>
                                            )}
                                        </div>
                                        {unread && <span className="unread-dot" />}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
