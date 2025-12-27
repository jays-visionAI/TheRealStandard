import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth'
import { auth } from './firebase'

const googleProvider = new GoogleAuthProvider()
// 구글 로그인 시 권한 요청 (선택 사항)
googleProvider.setCustomParameters({
    prompt: 'select_account'
})

// Google 로그인 (Popup 방식)
export async function signInWithGoogle() {
    try {
        console.log('Attempting Google Popup Sign-In...')
        const result = await signInWithPopup(auth, googleProvider)
        const user = result.user

        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
        }
    } catch (error: any) {
        console.error('Google Popup Sign-In error:', error)

        // Popup이 차단되었거나 COOP 이슈가 있을 경우 Redirect 방식 시도 안내
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            throw new Error('팝업이 차단되었습니다. 브라우저 설정을 확인하거나 다시 시도해 주세요.')
        }

        throw new Error(error.message || '구글 로그인에 실패했습니다.')
    }
}

// Google 로그인 (Redirect 방식 - 팝업 이슈 해결용)
export async function signInWithGoogleRedirect() {
    try {
        console.log('Attempting Google Redirect Sign-In...')
        await signInWithRedirect(auth, googleProvider)
    } catch (error: any) {
        console.error('Google Redirect Sign-In error:', error)
        throw new Error(error.message || '구글 로그인 페이지로 이동하는 중 오류가 발생했습니다.')
    }
}

// Redirect 결과 처리 (App 초기화 시 호출 가능)
export async function handleGoogleRedirectResult() {
    try {
        const result = await getRedirectResult(auth)
        if (result) {
            return result.user
        }
        return null
    } catch (error: any) {
        console.error('Google Redirect Result error:', error)
        return null
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
