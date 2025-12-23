import { useState } from 'react'
import type { VehicleType } from '../../types'

const initialVehicleTypes: VehicleType[] = [
    { id: 'vt-1', name: '1.8톤', capacityKg: 1800, enabled: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'vt-2', name: '3.5톤', capacityKg: 3500, enabled: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'vt-3', name: '5톤', capacityKg: 5000, enabled: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'vt-4', name: '11톤', capacityKg: 11000, enabled: true, createdAt: new Date(), updatedAt: new Date() },
]

export default function VehicleTypeSettings() {
    const [vehicleTypes, setVehicleTypes] = useState(initialVehicleTypes)
    const [showModal, setShowModal] = useState(false)
    const [editingType, setEditingType] = useState<VehicleType | null>(null)
    const [name, setName] = useState('')
    const [capacityKg, setCapacityKg] = useState('')

    const openAddModal = () => {
        setEditingType(null)
        setName('')
        setCapacityKg('')
        setShowModal(true)
    }

    const openEditModal = (vt: VehicleType) => {
        setEditingType(vt)
        setName(vt.name)
        setCapacityKg(String(vt.capacityKg))
        setShowModal(true)
    }

    const handleSave = () => {
        if (!name || !capacityKg) {
            alert('모든 필드를 입력해주세요.')
            return
        }

        if (editingType) {
            setVehicleTypes(vehicleTypes.map(vt =>
                vt.id === editingType.id
                    ? { ...vt, name, capacityKg: parseInt(capacityKg), updatedAt: new Date() }
                    : vt
            ))
        } else {
            const newVt: VehicleType = {
                id: 'vt-' + Date.now(),
                name,
                capacityKg: parseInt(capacityKg),
                enabled: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
            setVehicleTypes([...vehicleTypes, newVt])
        }

        setShowModal(false)
    }

    const toggleEnabled = (id: string) => {
        setVehicleTypes(vehicleTypes.map(vt =>
            vt.id === id ? { ...vt, enabled: !vt.enabled } : vt
        ))
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>차량 타입 설정</h1>
                    <p className="text-secondary">배차에 사용할 차량 타입을 관리합니다</p>
                </div>
                <button className="btn btn-primary" onClick={openAddModal}>
                    + 차량 타입 추가
                </button>
            </div>

            <div className="glass-card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>차량명</th>
                                <th>적재량(kg)</th>
                                <th>사용여부</th>
                                <th>작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vehicleTypes.map(vt => (
                                <tr key={vt.id}>
                                    <td className="font-semibold">{vt.name}</td>
                                    <td>{vt.capacityKg.toLocaleString()} kg</td>
                                    <td>
                                        <button
                                            className={`toggle-btn ${vt.enabled ? 'active' : ''}`}
                                            onClick={() => toggleEnabled(vt.id)}
                                        >
                                            {vt.enabled ? '사용중' : '미사용'}
                                        </button>
                                    </td>
                                    <td>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(vt)}>
                                            편집
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingType ? '차량 타입 수정' : '차량 타입 추가'}</h3>
                        </div>
                        <div className="modal-body">
                            <div className="form-group mb-4">
                                <label className="label">차량명</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="예: 5톤"
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">적재량 (kg)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={capacityKg}
                                    onChange={(e) => setCapacityKg(e.target.value)}
                                    placeholder="예: 5000"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>취소</button>
                            <button className="btn btn-primary" onClick={handleSave}>저장</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .toggle-btn {
          padding: var(--space-1) var(--space-3);
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
          font-weight: var(--font-medium);
          border: none;
          cursor: pointer;
          background: var(--bg-tertiary);
          color: var(--text-muted);
          transition: all var(--transition-fast);
        }
        
        .toggle-btn.active {
          background: rgba(16, 185, 129, 0.2);
          color: var(--color-accent);
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
        }
      `}</style>
        </div>
    )
}
