/**
 * Kakao SDK Service
 * 카카오 개발자 콘솔에서 발행한 Javascript 키가 필요합니다.
 */

declare global {
    interface Window {
        Kakao: any;
    }
}

const KAKAO_JS_KEY = '673898687a7442cae2d24608c0f5f7f3'; // 실제 키로 변경해야 합니다.

export const initKakao = () => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(KAKAO_JS_KEY);
        console.log('Kakao SDK Initialized');
    }
};

/**
 * 신규 고객 초대 메시지 전송
 */
export const sendInviteMessage = (customerName: string, inviteUrl: string) => {
    if (!window.Kakao) return;

    window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: '[TRS] 신규 거래처 초대장',
            description: `${customerName}님, TRS 육류유통 통합 관리 시스템에 초대되었습니다. 아래 링크를 통해 주문장 작성을 시작하세요.`,
            imageUrl: 'https://images.unsplash.com/photo-1544022613-e87ce7526a1b?q=80&w=1000&auto=format&fit=crop',
            link: {
                mobileWebUrl: inviteUrl,
                webUrl: inviteUrl,
            },
        },
        buttons: [
            {
                title: '초대장 확인하기',
                link: {
                    mobileWebUrl: inviteUrl,
                    webUrl: inviteUrl,
                },
            },
        ],
    });
};

/**
 * 주문장/출고지시 전송 (배송정보 포함)
 */
export const sendOrderMessage = (customerName: string, orderId: string, vehicleNo: string, eta: string) => {
    if (!window.Kakao) return;

    const orderUrl = `${window.location.origin}/confirm/${orderId}`;

    window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: '[TRS] 출고 및 배정 안내',
            description: `${customerName}님, 주문(${orderId})의 배차가 완료되었습니다.\n차량: ${vehicleNo}\n도착예정: ${eta}`,
            imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1000&auto=format&fit=crop',
            link: {
                mobileWebUrl: orderUrl,
                webUrl: orderUrl,
            },
        },
        social: {
            likeCount: 10,
            commentCount: 20,
            sharedCount: 30,
        },
        buttons: [
            {
                title: '배송 정보 확인',
                link: {
                    mobileWebUrl: orderUrl,
                    webUrl: orderUrl,
                },
            },
        ],
    });
};

/**
 * 카카오 로그인 실행
 */
export const kakaoLogin = (): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (!window.Kakao) {
            reject('Kakao SDK not loaded');
            return;
        }

        window.Kakao.Auth.login({
            success: function (authObj: any) {
                console.log('Kakao Login Success:', authObj);
                // 사용자 정보 가져오기
                window.Kakao.API.request({
                    url: '/v2/user/me',
                    success: function (res: any) {
                        console.log('Kakao User Info:', res);
                        resolve({ auth: authObj, user: res });
                    },
                    fail: function (error: any) {
                        console.error('Kakao User Info Fail:', error);
                        reject(error);
                    },
                });
            },
            fail: function (err: any) {
                console.error('Kakao Login Fail:', err);
                reject(err);
            },
        });
    });
};
