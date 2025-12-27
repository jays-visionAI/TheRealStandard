import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { auth } from './firebase'

const googleProvider = new GoogleAuthProvider()

// Google 로그인
export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider)
        const user = result.user

        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
        }
    } catch (error: any) {
        console.error('Google Sign-In error:', error)
        throw new Error(error.message || '구글 로그인에 실패했습니다.')
    }
}

// 로그아웃
export async function signOutGoogle() {
    try {
        await signOut(auth)
    } catch (error: any) {
        console.error('Sign out error:', error)
        throw new Error('로그아웃에 실패했습니다.')
    }
}

// 현재 로그인된 사용자 가져오기
export function getCurrentUser() {
    return auth.currentUser
}
