import { useState, useEffect } from 'react'
import { TrashIcon, PlusIcon, EditIcon, CheckIcon, XIcon, CarIcon, AlertTriangleIcon } from '../../components/Icons'
import {
    getAllVehicleTypes,
    createVehicleType,
    updateVehicleType as updateVehicleTypeFirebase,
    type FirestoreVehicleType
} from '../../lib/vehicleService'

// VehicleType 타입 정의
type VehicleType = Omit<FirestoreVehicleType, 'createdAt' | 'updatedAt'> & {
    createdAt?: Date
    updatedAt?: Date
}

export default function VehicleTypeSettings() {
    const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [showModal, setShowModal] = useState(false)
    const [editingType, setEditingType] = useState<VehicleType | null>(null)
    const [name, setName] = useState('')
    const [capacityKg, setCapacityKg] = useState('')
    const [saving, setSaving] = useState(false)

    // Firebase에서 차량 타입 목록 로드
    const loadVehicleTypes = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getAllVehicleTypes()
            setVehicleTypes(data.map(v => ({
                ...v,
                createdAt: v.createdAt?.toDate?.() || new Date(),
                updatedAt: v.updatedAt?.toDate?.() || new Date(),
            })))
        } catch (err) {
            console.error('Failed to load vehicle types:', err)
            setError('차량 타입 목록을 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    // 초기 로드
    useEffect(() => {
        loadVehicleTypes()
    }, [])

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

    const handleSave = async () => {
        if (!name || !capacityKg) {
            alert('모든 필드를 입력해주세요.')
            return
        }

        try {
            setSaving(true)

            if (editingType) {
                await updateVehicleTypeFirebase(editingType.id, {
                    name,
                    capacityKg: parseInt(capacityKg)
                })
            } else {
                await createVehicleType({
                    name,
                    capacityKg: parseInt(capacityKg),
                    enabled: true
                })
            }

            await loadVehicleTypes()
            setShowModal(false)
        } catch (err) {
            console.error('Save failed:', err)
            alert('저장에 실패했습니다.')
        } finally {
            setSaving(false)
        }
    }

    const toggleVehicleEnabled = async (id: string) => {
        const vt = vehicleTypes.find(v => v.id === id)
        if (!vt) return

        try {
            await updateVehicleTypeFirebase(id, { enabled: !vt.enabled })
            await loadVehicleTypes()
        } catch (err) {
            console.error('Toggle failed:', err)
            alert('상태 변경에 실패했습니다.')
        }
    }

    // 로딩 상태
    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>차량 타입 목록을 불러오는 중...</p>
                </div>
            </div>
        )
    }

    // 에러 상태
    if (error) {
        return (
            <div className="page-container">
                <div className="error-state">
                    <p>
                        <span style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                            <AlertTriangleIcon size={24} color="#ef4444" />
                        </span>
                        {error}
                    </p>
                    <button className="btn btn-primary" onClick={loadVehicleTypes}>
                        다시 시도
                    </button>
                </div>
            </div>
        )
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
                                            onClick={() => toggleVehicleEnabled(vt.id)}
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
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>취소</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? '저장 중...' : '저장'}
                            </button>
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
