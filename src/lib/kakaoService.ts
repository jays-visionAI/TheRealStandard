/**
 * Kakao SDK Service
 * 카카오 개발자 콘솔에서 발행한 Javascript 키가 필요합니다.
 */

declare global {
    interface Window {
        Kakao: any;
    }
}

import { useSystemStore } from '../stores/systemStore';

export const initKakao = () => {
    const { settings } = useSystemStore.getState();
    const key = settings.kakaoJsKey;

    if (window.Kakao && !window.Kakao.isInitialized() && key) {
        window.Kakao.init(key);
        console.log('Kakao SDK Initialized with key:', key.substring(0, 5) + '...');
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
            title: '[MEATGO] 신규 거래처 초대장',
            description: `${customerName}님, MEATGO(믿고) 육류유통 통합 관리 시스템에 초대되었습니다. 아래 링크를 통해 주문장 작성을 시작하세요.`,
            imageUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?q=80&w=1000&auto=format&fit=crop',
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
            title: '[MEATGO] 출고 및 배정 안내',
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

export const kakaoLogin = (): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (!window.Kakao) {
            reject('Kakao SDK not loaded');
            return;
        }

        console.log('Kakao SDK Structure:', window.Kakao);
        console.log('Kakao.Auth exists:', !!window.Kakao.Auth);

        if (!window.Kakao.Auth || typeof window.Kakao.Auth.login !== 'function') {
            const errorMsg = 'Kakao.Auth.login is not available. Using authorize as fallback.';
            console.warn(errorMsg);

            // Redirect based login as fallback if popup login is missing
            try {
                window.Kakao.Auth.authorize({
                    redirectUri: window.location.origin + '/login'
                });
            } catch (err) {
                reject('Kakao Auth failed completely');
            }
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
/**
 * 사내 문서/지식 공유 메시지 전송
 */
export const shareDocument = (title: string, excerpt: string, docId: string) => {
    if (!window.Kakao) return;

    const docUrl = `${window.location.origin}/admin/documents?id=${docId}`;

    window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: `[MEATGO 지식창고] ${title}`,
            description: excerpt || '상세 내용을 문서에서 확인하세요.',
            imageUrl: 'https://images.unsplash.com/photo-1456324504439-367cef3bafc3?q=80&w=1000&auto=format&fit=crop',
            link: {
                mobileWebUrl: docUrl,
                webUrl: docUrl,
            },
        },
        buttons: [
            {
                title: '문서 읽기',
                link: {
                    mobileWebUrl: docUrl,
                    webUrl: docUrl,
                },
            },
        ],
    });
};

/**
 * 카카오톡 채널 추가
 * @param channelId 채널 공개 ID (예: _zeXxjG)
 */
export const addKakaoChannel = (channelId?: string) => {
    if (!window.Kakao) return;
    if (!window.Kakao.isInitialized()) initKakao();

    const { settings } = useSystemStore.getState();
    const finalChannelId = channelId || settings.kakaoChannelId || '_zeXxjG';

    window.Kakao.Channel.addChannel({
        channelPublicId: finalChannelId,
    });
};

/**
 * 배차 요청 메시지 전송 (물류사 담당자용)
 */
export const sendDispatchRequestMessage = (carrierName: string, dispatchUrl: string) => {
    if (!window.Kakao) return;

    window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: '[MEATGO] 배차 요청',
            description: `${carrierName} 담당자님, 신규 배차 요청이 접수되었습니다. 아래 링크를 통해 배차 정보를 입력해 주세요.`,
            imageUrl: 'https://images.unsplash.com/photo-1590682680695-43b964a3ae17?q=80&w=1000&auto=format&fit=crop',
            link: {
                mobileWebUrl: dispatchUrl,
                webUrl: dispatchUrl,
            },
        },
        buttons: [
            {
                title: '배차 정보 입력하기',
                link: {
                    mobileWebUrl: dispatchUrl,
                    webUrl: dispatchUrl,
                },
            },
        ],
    });
};

/**
 * 배차 확정 알림 (관리자/물류팀용)
 */
export const sendDispatchConfirmedMessage = (driverName: string, vehicleNo: string) => {
    if (!window.Kakao) return;

    window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: '[MEATGO] 배차 확정 알림',
            description: `배차가 확정되었습니다.\n기사: ${driverName}\n차량: ${vehicleNo}`,
            imageUrl: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=1000&auto=format&fit=crop',
            link: {
                mobileWebUrl: window.location.origin + '/admin/shipments',
                webUrl: window.location.origin + '/admin/shipments',
            },
        },
    });
};

