import { TruckDeliveryIcon, BuildingIcon, UserIcon, PhoneIcon, ClockIcon } from './Icons'
import './ShippingCard.css'

// 로컬 타입 정의
interface Shipment {
    id: string
    status: string
    customerName: string
    driverName?: string
    driverPhone?: string
    vehicleNumber?: string
    vehicleType?: string
    company?: string
    eta: string | Date
}

interface Props {
    shipment: Shipment
}

export default function ShippingCard({ shipment }: Props) {
    const formatDate = (dateStr: string | Date) => {
        const date = new Date(dateStr)
        return date.toLocaleString('ko-KR', {
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="shipping-card scale-in">
            <div className="card-header">
                <div className="shipment-no">
                    <span className="no-label">SHIPMENT NO</span>
                    <span className="no-value">{shipment.id}</span>
                </div>
                <div className={`status-badge ${shipment.status.toLowerCase()}`}>
                    {shipment.status === 'READY' ? '배차완료' : '배송중'}
                </div>
            </div>

            <div className="card-workflow">
                <div className="node">
                    <div className="node-icon"><BuildingIcon size={16} /></div>
                    <span className="node-label">물류센터</span>
                </div>
                <div className="path-line">
                    <TruckDeliveryIcon size={16} className="truck-indicator" />
                </div>
                <div className="node">
                    <div className="node-icon"><UserIcon size={16} /></div>
                    <span className="node-label">{shipment.customerName}</span>
                </div>
            </div>

            <div className="vehicle-info">
                <div className="info-item">
                    <span className="info-label">물류사</span>
                    <span className="info-value">{shipment.company || '-'}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">기사님</span>
                    <span className="info-value"><UserIcon size={12} className="mr-1" />{shipment.driverName || '-'}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">연락처</span>
                    <span className="info-value"><PhoneIcon size={12} className="mr-1" />{shipment.driverPhone || '-'}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">차량번호</span>
                    <span className="info-value">{shipment.vehicleNumber || '-'}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">차량타입</span>
                    <span className="info-value">{shipment.vehicleType || '-'}</span>
                </div>
            </div>

            <div className="eta-box">
                <ClockIcon size={18} className="eta-icon" />
                <span className="eta-text">예상 도착: {formatDate(shipment.eta)}</span>
            </div>
        </div>
    )
}
