import type { UserRole } from '../types'

export interface CurrentActor {
    uid: string
    name: string
    role: UserRole
}

export interface CreatorStamp {
    createdBy: string         // Firebase UID (또는 'system' / 'guest')
    createdByName: string     // 표시용 이름 (디노멀라이즈)
    createdByRole: UserRole | 'GUEST' | 'SYSTEM'
}

let currentActor: CurrentActor | null = null

export function setCurrentActor(actor: CurrentActor | null): void {
    currentActor = actor
}

export function getCurrentActor(): CurrentActor | null {
    return currentActor
}

export function getCreatorStamp(): CreatorStamp {
    if (currentActor) {
        return {
            createdBy: currentActor.uid,
            createdByName: currentActor.name,
            createdByRole: currentActor.role,
        }
    }
    return {
        createdBy: 'guest',
        createdByName: '비회원',
        createdByRole: 'GUEST',
    }
}
