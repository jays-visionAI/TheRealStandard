import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getUserById, updateUser } from '../../lib/userService'
import { UserIcon, LockIcon } from '../../components/Icons'

/**
 * 직원(ADMIN/OPS/SALES/PURCHASE/ACCOUNTING/WAREHOUSE) 전용 프로필 페이지.
 *
 * 거래처용 ProfileSetup(/order/profile-setup)과 분리:
 * - 사업자정보 입력 X
 * - 이름·연락처·비밀번호 변경만 가능
 *
 * 첫 로그인 시 mustChangePassword=true 이면 ProtectedRoute가 이 페이지로
 * 강제 라우팅 (Step 3-C 이후 적용).
 */
export default function AccountProfile() {
    const { user, updateUserPassword } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [pwChanging, setPwChanging] = useState(false)
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    useEffect(() => {
        const load = async () => {
            if (!user?.id) return
            try {
                const u = await getUserById(user.id)
                if (u) {
                    setName(u.name || '')
                    setPhone(u.phone || '')
                }
            } catch (err) {
                console.error('Failed to load account:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [user])

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user?.id) return
        setSaving(true)
        try {
            await updateUser(user.id, { name, phone })
            alert('정보가 저장되었습니다.')
        } catch (err: any) {
            console.error('Save failed:', err)
            alert(err?.message || '저장에 실패했습니다.')
        } finally {
            setSaving(false)
        }
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            alert('비밀번호가 일치하지 않습니다.')
            return
        }
        if (newPassword.length < 6) {
            alert('비밀번호는 최소 6자 이상이어야 합니다.')
            return
        }
        setPwChanging(true)
        try {
            await updateUserPassword(newPassword)
            // mustChangePassword 플래그 해제
            if (user?.id) {
                try {
                    await updateUser(user.id, { mustChangePassword: false })
                } catch (e) {
                    console.warn('mustChangePassword flag clear failed:', e)
                }
            }
            alert('비밀번호가 변경되었습니다.')
            setNewPassword('')
            setConfirmPassword('')
            // 강제 리디렉션 해제를 위해 리로드
            window.location.href = '/'
        } catch (err: any) {
            alert(err.message)
        } finally {
            setPwChanging(false)
        }
    }

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>로딩 중...</div>

    return (
        <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px' }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1F2937', marginBottom: 6 }}>내 정보</h1>
                <p style={{ fontSize: 14, color: '#6B7280' }}>
                    이름·연락처·비밀번호를 관리합니다. ({user?.role})
                </p>
                {user?.mustChangePassword && (
                    <div style={{
                        marginTop: 16, padding: 12, borderRadius: 8,
                        background: '#FEF3C7', border: '1px solid #FDE68A',
                        color: '#92400E', fontSize: 13,
                    }}>
                        ⚠ 임시 비밀번호로 발급된 계정입니다. 보안을 위해 새 비밀번호로 변경해주세요.
                    </div>
                )}
            </div>

            {/* 비밀번호 변경 — 우선 표시 */}
            <form onSubmit={handleChangePassword} style={cardStyle}>
                <h2 style={sectionTitle}><LockIcon size={18} /> 비밀번호 변경</h2>
                <div style={fieldGroup}>
                    <label style={labelStyle}>새 비밀번호 *</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="6자 이상"
                        style={inputStyle}
                    />
                </div>
                <div style={fieldGroup}>
                    <label style={labelStyle}>비밀번호 확인 *</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <button
                    type="submit"
                    disabled={pwChanging || !newPassword}
                    style={{ ...btnPrimary, marginTop: 4 }}
                >
                    {pwChanging ? '변경 중...' : '비밀번호 변경'}
                </button>
            </form>

            {/* 기본 정보 */}
            <form onSubmit={handleSaveProfile} style={cardStyle}>
                <h2 style={sectionTitle}><UserIcon size={18} /> 기본 정보</h2>
                <div style={fieldGroup}>
                    <label style={labelStyle}>이름</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div style={fieldGroup}>
                    <label style={labelStyle}>이메일 (로그인 ID — 변경 불가)</label>
                    <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        style={{ ...inputStyle, background: '#F3F4F6', color: '#6B7280' }}
                    />
                </div>
                <div style={fieldGroup}>
                    <label style={labelStyle}>연락처</label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="010-0000-0000"
                        style={inputStyle}
                    />
                </div>
                <div style={fieldGroup}>
                    <label style={labelStyle}>역할</label>
                    <input
                        type="text"
                        value={user?.role || ''}
                        disabled
                        style={{ ...inputStyle, background: '#F3F4F6', color: '#6B7280' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        style={btnSecondary}
                    >취소</button>
                    <button
                        type="submit"
                        disabled={saving}
                        style={btnPrimary}
                    >{saving ? '저장 중...' : '저장하기'}</button>
                </div>
            </form>
        </div>
    )
}

// 스타일 토큰
const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
    padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}
const sectionTitle: React.CSSProperties = {
    fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 8,
}
const fieldGroup: React.CSSProperties = { marginBottom: 14 }
const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: 14,
    border: '1px solid #E5E7EB', borderRadius: 8, outline: 'none',
}
const btnPrimary: React.CSSProperties = {
    background: '#047857', color: '#fff', border: 0,
    borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600,
    cursor: 'pointer',
}
const btnSecondary: React.CSSProperties = {
    background: '#fff', color: '#374151',
    border: '1px solid #E5E7EB', borderRadius: 8,
    padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
