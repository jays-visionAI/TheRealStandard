import { useState, useEffect } from 'react'
import { createSalesOrder, setSalesOrderItems } from '../../lib/orderService'
import { getAllCustomerUsers } from '../../lib/userService'
import { Timestamp } from 'firebase/firestore'

// 태윤유통 거래처원장 데이터 (Excel에서 추출)
const TAEYOON_ORDERS: Record<string, { product: string; origin: string; qty: number; weight: number; unitPrice: number; totalPrice: number }[]> = {
    '25/11/06': [
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 40, weight: 720, unitPrice: 15000, totalPrice: 10800000 },
        { product: 'A전지(냉장)', origin: '국내산', qty: 20, weight: 260, unitPrice: 8500, totalPrice: 2210000 },
        { product: '미전지(진공/냉장)', origin: '국내산', qty: 30, weight: 495, unitPrice: 8200, totalPrice: 4059000 },
        { product: '등갈비(진공/냉장)', origin: '국내산', qty: 10, weight: 125, unitPrice: 1400, totalPrice: 175000 },
    ],
    '25/11/12': [
        { product: '갈비(진공/냉동)', origin: '국내산', qty: 7, weight: 102.2, unitPrice: 8000, totalPrice: 817600 },
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 55, weight: 935.3, unitPrice: 13000, totalPrice: 12158900 },
        { product: '미삼겹살(진공/냉장)', origin: '국내산', qty: 20, weight: 364.5, unitPrice: 12800, totalPrice: 4665600 },
        { product: '등심(PE/냉동)', origin: '국내산', qty: 10, weight: 200.0, unitPrice: 7000, totalPrice: 1400000 },
        { product: '전지(진공/냉장)', origin: '국내산', qty: 10, weight: 123.3, unitPrice: 8000, totalPrice: 986400 },
        { product: '미전지(진공/냉장)', origin: '국내산', qty: 30, weight: 465.2, unitPrice: 7600, totalPrice: 3535520 },
        { product: '무항생제 삼겹(진공/냉장)', origin: '국내산', qty: 30, weight: 465.5, unitPrice: 13200, totalPrice: 6144600 },
        { product: '무항생제 암미삼겹(진공/냉장)', origin: '국내산', qty: 5, weight: 95.1, unitPrice: 13200, totalPrice: 1255320 },
        { product: '무항생제 등심(PE/냉동)', origin: '국내산', qty: 10, weight: 200.0, unitPrice: 7000, totalPrice: 1400000 },
        { product: '무항생제 A돈피(냉동)', origin: '국내산', qty: 3, weight: 60.0, unitPrice: 700, totalPrice: 42000 },
        { product: 'A 돈피(냉장)', origin: '국내산', qty: 10, weight: 200.0, unitPrice: 700, totalPrice: 140000 },
        { product: '등갈비(진공/냉장)', origin: '국내산', qty: 5, weight: 63.1, unitPrice: 12500, totalPrice: 788750 },
        { product: '무항생제 갈비(진공/냉동)', origin: '국내산', qty: 3, weight: 48.0, unitPrice: 8000, totalPrice: 384000 },
        { product: '무항생제 A돈피(냉장)', origin: '국내산', qty: 5, weight: 100.0, unitPrice: 700, totalPrice: 70000 },
    ],
    '25/12/12': [
        { product: '돈등뼈(냉동)', origin: '국내산', qty: 30, weight: 533.3, unitPrice: 1600, totalPrice: 853280 },
        { product: '갈비(진공/냉장)', origin: '국내산', qty: 10, weight: 143.4, unitPrice: 8500, totalPrice: 1218900 },
        { product: '등갈비(진공/냉장)', origin: '국내산', qty: 11, weight: 138.7, unitPrice: 13800, totalPrice: 1914060 },
        { product: '등심(진공/냉장)', origin: '국내산', qty: 5, weight: 72.2, unitPrice: 7000, totalPrice: 505400 },
        { product: '목심(진공/냉장)', origin: '국내산', qty: 40, weight: 400.4, unitPrice: 10500, totalPrice: 4204200 },
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 60, weight: 1056.2, unitPrice: 13500, totalPrice: 14258700 },
        { product: '미삼겹살(진공/냉장)', origin: '국내산', qty: 20, weight: 366.3, unitPrice: 13500, totalPrice: 4945050 },
        { product: '전지(진공/냉장)', origin: '국내산', qty: 20, weight: 258.3, unitPrice: 8000, totalPrice: 2066400 },
        { product: '미전지(진공/냉장)', origin: '국내산', qty: 40, weight: 652.2, unitPrice: 7600, totalPrice: 4956720 },
        { product: '무항생제 돈등뼈(냉장)', origin: '국내산', qty: 13, weight: 236.6, unitPrice: 1600, totalPrice: 378560 },
        { product: '무항생제 갈비(진공/냉장)', origin: '국내산', qty: 7, weight: 109.9, unitPrice: 8500, totalPrice: 934150 },
        { product: '무항생제 목심(진공/냉장)', origin: '국내산', qty: 22, weight: 216.2, unitPrice: 10500, totalPrice: 2270100 },
        { product: '무항생제 삼겹(진공/냉장)', origin: '국내산', qty: 55, weight: 966.2, unitPrice: 14000, totalPrice: 13526800 },
        { product: '무항생제 전지(진공/냉장)', origin: '국내산', qty: 20, weight: 242.9, unitPrice: 8000, totalPrice: 1943200 },
        { product: '무항생제 미전지(진공/냉장)', origin: '국내산', qty: 20, weight: 311.1, unitPrice: 7600, totalPrice: 2364360 },
        { product: '무항생제 등갈비(진공/냉장)', origin: '국내산', qty: 5, weight: 62.0, unitPrice: 13800, totalPrice: 855600 },
        { product: '무항생제 등심(진공/냉장)', origin: '국내산', qty: 2, weight: 27.9, unitPrice: 7000, totalPrice: 195300 },
        { product: '안심(진공/냉장)', origin: '국내산', qty: 3, weight: 36.1, unitPrice: 6500, totalPrice: 234650 },
    ],
    '25/12/31': [
        { product: '연골 (냉동)', origin: '국내산', qty: 1, weight: 11.6, unitPrice: 2700, totalPrice: 31320 },
        { product: '갈비(진공/냉장)', origin: '국내산', qty: 5, weight: 79.8, unitPrice: 8500, totalPrice: 678300 },
        { product: '등갈비(진공/냉장)', origin: '국내산', qty: 6, weight: 81.0, unitPrice: 13800, totalPrice: 1117800 },
        { product: '삼겹(진공/냉동)', origin: '국내산', qty: 10, weight: 178.1, unitPrice: 13700, totalPrice: 2439970 },
        { product: '무항생제 목심(진공/냉장)', origin: '국내산', qty: 39, weight: 389.9, unitPrice: 10500, totalPrice: 4093950 },
        { product: '무항생제 전지(진공/냉장)', origin: '국내산', qty: 29, weight: 350.0, unitPrice: 8000, totalPrice: 2800000 },
        { product: '무항생제 미전지(진공/냉장)', origin: '국내산', qty: 50, weight: 787.2, unitPrice: 8000, totalPrice: 6297600 },
        { product: '목심(진공/냉장)', origin: '국내산', qty: 1, weight: 11.0, unitPrice: 10500, totalPrice: 115500 },
        { product: '미삼겹살(진공/냉장)', origin: '국내산', qty: 10, weight: 193.4, unitPrice: 13500, totalPrice: 2610900 },
        { product: '전지(진공/냉장)', origin: '국내산', qty: 11, weight: 147.0, unitPrice: 8000, totalPrice: 1176000 },
        { product: '무항생제 돈등뼈(냉장)', origin: '국내산', qty: 10, weight: 193.9, unitPrice: 1600, totalPrice: 310240 },
        { product: '무항생제 A돈피(냉장)', origin: '국내산', qty: 4, weight: 80.0, unitPrice: 1000, totalPrice: 80000 },
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 17, weight: 313.5, unitPrice: 14500, totalPrice: 4545750 },
        { product: '무항생제 삼겹(진공/냉장)', origin: '국내산', qty: 63, weight: 1086.3, unitPrice: 14500, totalPrice: 15751350 },
    ],
    '26/01/08': [
        { product: '갈비(진공/냉장)', origin: '국내산', qty: 6, weight: 86.3, unitPrice: 9000, totalPrice: 776700 },
        { product: '무항생제 삼겹(진공/냉장)', origin: '국내산', qty: 25, weight: 428.7, unitPrice: 14400, totalPrice: 6173280 },
        { product: '무항생제 미삼겹(진공/냉장)', origin: '국내산', qty: 10, weight: 182.8, unitPrice: 13500, totalPrice: 2467800 },
        { product: '무항생제 돈등뼈(냉장)', origin: '국내산', qty: 15, weight: 291.3, unitPrice: 1800, totalPrice: 524340 },
        { product: '목심(진공/냉장)', origin: '국내산', qty: 9, weight: 84.7, unitPrice: 10500, totalPrice: 889350 },
        { product: '미전지(진공/냉장)', origin: '국내산', qty: 20, weight: 278.5, unitPrice: 8000, totalPrice: 2228000 },
        { product: '무항생제 갈비(진공/냉장)', origin: '국내산', qty: 4, weight: 64.4, unitPrice: 9000, totalPrice: 579600 },
        { product: '무항생제 목심(진공/냉장)', origin: '국내산', qty: 1, weight: 9.9, unitPrice: 10500, totalPrice: 103950 },
        { product: '무항생제 미전지(진공/냉장)', origin: '국내산', qty: 20, weight: 310.5, unitPrice: 8000, totalPrice: 2484000 },
        { product: '무항생제 삼겹(진공/냉장)', origin: '국내산', qty: 24, weight: 409.7, unitPrice: 14000, totalPrice: 5735800 },
        { product: '무항생제 삼겹(진공/냉장)', origin: '국내산', qty: 1, weight: 18.1, unitPrice: 14000, totalPrice: 253400 },
        { product: 'A 돈피(냉장)', origin: '국내산', qty: 2, weight: 40.0, unitPrice: 1000, totalPrice: 40000 },
        { product: '등갈비(진공/냉장)', origin: '국내산', qty: 30, weight: 317.8, unitPrice: 14500, totalPrice: 4608100 },
    ],
    '26/01/21': [
        { product: '돈등뼈(냉장)', origin: '국내산', qty: 20, weight: 379.6, unitPrice: 1800, totalPrice: 683280 },
        { product: 'A 돈피(냉장)', origin: '국내산', qty: 9, weight: 180.0, unitPrice: 1000, totalPrice: 180000 },
        { product: '등갈비(진공/냉장)', origin: '국내산', qty: 10, weight: 126.0, unitPrice: 15500, totalPrice: 1953000 },
        { product: '목심(진공/냉장)', origin: '국내산', qty: 40, weight: 410.2, unitPrice: 10500, totalPrice: 4307100 },
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 24, weight: 409.6, unitPrice: 14000, totalPrice: 5734400 },
        { product: '미삼겹살(진공/냉장)', origin: '국내산', qty: 9, weight: 169.9, unitPrice: 13500, totalPrice: 2293650 },
        { product: '전지(진공/냉장)', origin: '국내산', qty: 30, weight: 441.9, unitPrice: 8000, totalPrice: 3535200 },
        { product: '무항생제 삼겹(진공/냉장)', origin: '국내산', qty: 16, weight: 262.5, unitPrice: 14000, totalPrice: 3675000 },
        { product: '무항생제 미삼겹(진공/냉장)', origin: '국내산', qty: 6, weight: 109.3, unitPrice: 13500, totalPrice: 1475550 },
        { product: '등갈비(진공/냉장)', origin: '국내산', qty: 10, weight: 128.7, unitPrice: 15500, totalPrice: 1994850 },
        { product: '연골 (냉동)', origin: '국내산', qty: 20, weight: 313.0, unitPrice: 2700, totalPrice: 845100 },
        { product: '안심(진공/냉장)', origin: '국내산', qty: 3, weight: 34.3, unitPrice: 6500, totalPrice: 222950 },
        { product: '무항생제 안심(진공/냉장)', origin: '국내산', qty: 1, weight: 11.5, unitPrice: 6500, totalPrice: 74750 },
    ],
    '26/01/29': [
        { product: 'A 돈피(냉장)', origin: '국내산', qty: 10, weight: 200.0, unitPrice: 1000, totalPrice: 200000 },
        { product: '등갈비(진공/냉장)', origin: '국내산', qty: 1, weight: 12.2, unitPrice: 16000, totalPrice: 195200 },
        { product: '미삼겹살(진공/냉장)', origin: '국내산', qty: 21, weight: 387.9, unitPrice: 13500, totalPrice: 5236650 },
        { product: '안심(진공/냉장)', origin: '국내산', qty: 2, weight: 22.2, unitPrice: 6500, totalPrice: 144300 },
        { product: '전지(진공/냉장)', origin: '국내산', qty: 7, weight: 91.2, unitPrice: 7800, totalPrice: 711360 },
        { product: '미전지(진공/냉장)', origin: '국내산', qty: 30, weight: 491.1, unitPrice: 8000, totalPrice: 3928800 },
        { product: '무항생제 등갈비(진공/냉장)', origin: '국내산', qty: 1, weight: 11.7, unitPrice: 16000, totalPrice: 187200 },
        { product: '무항생제 목심(진공/냉장)', origin: '국내산', qty: 9, weight: 92.1, unitPrice: 10500, totalPrice: 967050 },
        { product: '무항생제 전지(진공/냉장)', origin: '국내산', qty: 3, weight: 37.2, unitPrice: 7800, totalPrice: 290160 },
        { product: '무항생제 삼겹(진공/냉장)', origin: '국내산', qty: 10, weight: 169.3, unitPrice: 14000, totalPrice: 2370200 },
        { product: '무항생제 미삼겹(진공/냉장)', origin: '국내산', qty: 4, weight: 68.5, unitPrice: 13500, totalPrice: 924750 },
        { product: '무항생제 안심(진공/냉장)', origin: '국내산', qty: 1, weight: 11.3, unitPrice: 6500, totalPrice: 73450 },
        { product: '무항생제 돈등뼈(냉장)', origin: '국내산', qty: 3, weight: 55.1, unitPrice: 1800, totalPrice: 99180 },
    ],
    '26/02/04': [
        { product: '돈등뼈(냉장)', origin: '국내산', qty: 25, weight: 425.8, unitPrice: 2000, totalPrice: 851600 },
        { product: '갈비(진공/냉장)', origin: '국내산', qty: 20, weight: 337.8, unitPrice: 10500, totalPrice: 3546900 },
        { product: '등갈비(진공/냉장)', origin: '국내산', qty: 6, weight: 79.3, unitPrice: 16000, totalPrice: 1268800 },
        { product: '등심(진공/냉장)', origin: '국내산', qty: 2, weight: 31.6, unitPrice: 7000, totalPrice: 221200 },
        { product: '목심(진공/냉장)', origin: '국내산', qty: 18, weight: 171.3, unitPrice: 11500, totalPrice: 1969950 },
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 31, weight: 511.4, unitPrice: 14900, totalPrice: 7619860 },
        { product: '미삼겹살(진공/냉장)', origin: '국내산', qty: 25, weight: 437.7, unitPrice: 14500, totalPrice: 6346650 },
        { product: '안심(진공/냉장)', origin: '국내산', qty: 4, weight: 46.3, unitPrice: 6500, totalPrice: 300950 },
        { product: '전지(진공/냉장)', origin: '국내산', qty: 15, weight: 201.5, unitPrice: 8000, totalPrice: 1612000 },
        { product: '미전지(진공/냉장)', origin: '국내산', qty: 32, weight: 484.4, unitPrice: 7900, totalPrice: 3826760 },
        { product: '무항생제 등갈비(진공/냉장)', origin: '국내산', qty: 4, weight: 55.2, unitPrice: 16000, totalPrice: 883200 },
        { product: '무항생제 등심(진공/냉장)', origin: '국내산', qty: 1, weight: 17.7, unitPrice: 7000, totalPrice: 123900 },
        { product: '무항생제 목심(진공/냉장)', origin: '국내산', qty: 42, weight: 402.1, unitPrice: 11500, totalPrice: 4624150 },
        { product: '무항생제 전지(진공/냉장)', origin: '국내산', qty: 25, weight: 356.5, unitPrice: 8000, totalPrice: 2852000 },
        { product: '무항생제 미전지(진공/냉장)', origin: '국내산', qty: 8, weight: 129.4, unitPrice: 7900, totalPrice: 1022260 },
        { product: '무항생제 삼겹(진공/냉장)', origin: '국내산', qty: 39, weight: 638.8, unitPrice: 14900, totalPrice: 9518120 },
        { product: '무항생제 안심(진공/냉장)', origin: '국내산', qty: 4, weight: 45.3, unitPrice: 6500, totalPrice: 294450 },
    ],
    '26/02/13': [
        { product: '무항생제 돈등뼈(냉동)', origin: '국내산', qty: 21, weight: 378.3, unitPrice: 800, totalPrice: 302640 },
        { product: '돈등뼈(냉동)', origin: '국내산', qty: 105, weight: 1873.1, unitPrice: 800, totalPrice: 1498480 },
        { product: '돈우콤마(,)[냉장]', origin: '국내산', qty: 1, weight: 12.6, unitPrice: 20500, totalPrice: 259120 },
        { product: '갈비(진공/냉장)', origin: '국내산', qty: 17, weight: 283.0, unitPrice: 11000, totalPrice: 3113000 },
        { product: '등갈비(진공/냉장)', origin: '국내산', qty: 13, weight: 176.9, unitPrice: 18000, totalPrice: 3184200 },
        { product: '등심(진공/냉장)', origin: '국내산', qty: 5, weight: 75.4, unitPrice: 7000, totalPrice: 527800 },
        { product: '목심(진공/냉장)', origin: '국내산', qty: 50, weight: 485.7, unitPrice: 12000, totalPrice: 5828400 },
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 20, weight: 345.2, unitPrice: 15500, totalPrice: 5350600 },
        { product: '미전지(진공/냉장)', origin: '국내산', qty: 20, weight: 343.5, unitPrice: 8000, totalPrice: 2748000 },
        { product: '무항생제 갈비(진공/냉장)', origin: '국내산', qty: 3, weight: 49.4, unitPrice: 11000, totalPrice: 543400 },
        { product: '무항생제 등갈비(진공/냉장)', origin: '국내산', qty: 7, weight: 100.0, unitPrice: 18000, totalPrice: 1800000 },
        { product: '안심(진공/냉장)', origin: '국내산', qty: 3, weight: 33.8, unitPrice: 6500, totalPrice: 219700 },
        { product: '무항생제 돈등뼈(냉장)', origin: '국내산', qty: 5, weight: 90.8, unitPrice: 2000, totalPrice: 181600 },
        { product: '전지(진공/냉장)', origin: '국내산', qty: 20, weight: 269.9, unitPrice: 8300, totalPrice: 2240170 },
        { product: '무항생제 전지(진공/냉장)', origin: '국내산', qty: 20, weight: 283.3, unitPrice: 8300, totalPrice: 2351390 },
        { product: '무항생제 삼겹(진공/냉장)', origin: '국내산', qty: 30, weight: 519.0, unitPrice: 15500, totalPrice: 8044500 },
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 20, weight: 352.5, unitPrice: 15500, totalPrice: 5463750 },
        { product: '미삼겹살(진공/냉장)', origin: '국내산', qty: 20, weight: 368.7, unitPrice: 15000, totalPrice: 5530500 },
    ],
    '26/02/20': [
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 50, weight: 890.4, unitPrice: 15000, totalPrice: 13356000 },
        { product: '미삼겹살(진공/냉장)', origin: '국내산', qty: 1, weight: 19.5, unitPrice: 15000, totalPrice: 292500 },
        { product: '미삼겹살(진공/냉장)', origin: '국내산', qty: 19, weight: 360.5, unitPrice: 15000, totalPrice: 5407500 },
        { product: '미후지(진공/냉장)', origin: '국내산', qty: 10, weight: 264.4, unitPrice: 5100, totalPrice: 1348440 },
        { product: '돈등뼈(냉장)', origin: '국내산', qty: 10, weight: 181.1, unitPrice: 2000, totalPrice: 362200 },
        { product: '갈비(진공/냉장)', origin: '국내산', qty: 10, weight: 170.6, unitPrice: 8000, totalPrice: 1364800 },
        { product: '등갈비(진공/냉장)', origin: '국내산', qty: 10, weight: 151.9, unitPrice: 16000, totalPrice: 2430400 },
        { product: '목심(진공/냉장)', origin: '국내산', qty: 30, weight: 312.1, unitPrice: 13000, totalPrice: 4057300 },
    ],
    '26/03/10': [
        { product: '등갈비(진공/냉장)', origin: '국내산', qty: 5, weight: 54.4, unitPrice: 14000, totalPrice: 761600 },
        { product: '돈우콤마(,)[냉장]', origin: '국내산', qty: 2, weight: 24.0, unitPrice: 20500, totalPrice: 492000 },
        { product: '목심(진공/냉장)', origin: '국내산', qty: 6, weight: 59.9, unitPrice: 12500, totalPrice: 748750 },
        { product: '무항생제 목심(진공/냉장)', origin: '국내산', qty: 4, weight: 41.4, unitPrice: 12500, totalPrice: 517500 },
        { product: '미삼겹살(진공/냉장)', origin: '국내산', qty: 10, weight: 199.4, unitPrice: 14500, totalPrice: 2891300 },
        { product: '무항생제 삼겹(진공/냉장)', origin: '국내산', qty: 13, weight: 235.6, unitPrice: 15000, totalPrice: 3534000 },
        { product: '삼겹(진공/냉동)', origin: '국내산', qty: 49, weight: 845.1, unitPrice: 13500, totalPrice: 11408850 },
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 12, weight: 207.6, unitPrice: 15000, totalPrice: 3114000 },
        { product: '안심(진공/냉장)', origin: '국내산', qty: 2, weight: 11.3, unitPrice: 6500, totalPrice: 73450 },
    ],
    '26/03/12': [
        { product: '무항생제 돈등뼈(냉장)', origin: '국내산', qty: 8, weight: 142.7, unitPrice: 1800, totalPrice: 256860 },
        { product: '목심(진공/냉장)', origin: '국내산', qty: 10, weight: 98.1, unitPrice: 12000, totalPrice: 1177200 },
        { product: '무항생제 목심(진공/냉장)', origin: '국내산', qty: 10, weight: 103.3, unitPrice: 12000, totalPrice: 1239600 },
        { product: '무항생제 미삼겹(진공/냉장)', origin: '국내산', qty: 1, weight: 15.6, unitPrice: 13500, totalPrice: 210600 },
        { product: '미삼겹살(진공/냉장)', origin: '국내산', qty: 10, weight: 175.5, unitPrice: 13500, totalPrice: 2369250 },
        { product: '미삼겹살(진공/냉장)', origin: '국내산', qty: 9, weight: 168.1, unitPrice: 13500, totalPrice: 2269350 },
        { product: '미전지(진공/냉장)', origin: '국내산', qty: 23, weight: 380.2, unitPrice: 7500, totalPrice: 2851500 },
        { product: '미전지(진공/냉장)', origin: '국내산', qty: 45, weight: 750.7, unitPrice: 7500, totalPrice: 5630250 },
        { product: '무항생제 삼겹(진공/냉동)', origin: '국내산', qty: 5, weight: 106.9, unitPrice: 13200, totalPrice: 1411080 },
        { product: '무항생제 삼겹(진공/냉장)', origin: '국내산', qty: 19, weight: 323.7, unitPrice: 13200, totalPrice: 4272840 },
        { product: '무항생제 삼겹살(진공/냉장)', origin: '국내산', qty: 36, weight: 614.5, unitPrice: 14000, totalPrice: 8603000 },
        { product: '삼겹(진공/냉동)', origin: '국내산', qty: 24, weight: 415.5, unitPrice: 13200, totalPrice: 5484600 },
        { product: '삼겹(진공/냉동)', origin: '국내산', qty: 1, weight: 22.3, unitPrice: 13200, totalPrice: 294360 },
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 4, weight: 72.7, unitPrice: 14000, totalPrice: 1017800 },
        { product: '안심(진공/냉장)', origin: '국내산', qty: 2, weight: 23.7, unitPrice: 6500, totalPrice: 154050 },
        { product: '전지(진공/냉장)', origin: '국내산', qty: 31, weight: 426.4, unitPrice: 7500, totalPrice: 3198000 },
        { product: '전지(진공/냉장)', origin: '국내산', qty: 20, weight: 286.2, unitPrice: 7500, totalPrice: 2146500 },
    ],
}

type OrderItem = { product: string; origin: string; qty: number; weight: number; unitPrice: number; totalPrice: number }
type CompanyOrders = Record<string, OrderItem[]>

// 백운유통 거래내역서 데이터
const BAEKWOON_ORDERS: CompanyOrders = {
    '26/03/06': [
        { product: '돈등뼈(냉장)', origin: '국내산', qty: 24, weight: 480.3, unitPrice: 1800, totalPrice: 864540 },
        { product: '돈등뼈(냉장)', origin: '국내산', qty: 6, weight: 122.7, unitPrice: 1800, totalPrice: 220860 },
        { product: '목심(진공/냉장)', origin: '국내산', qty: 12, weight: 116.0, unitPrice: 13000, totalPrice: 1508000 },
        { product: '목심(진공/냉장)', origin: '국내산', qty: 22, weight: 224.9, unitPrice: 13000, totalPrice: 2923700 },
        { product: '무항생제 목심(진공/냉장)', origin: '국내산', qty: 16, weight: 152.3, unitPrice: 13000, totalPrice: 1979900 },
        { product: '무항생제 미전지(진공/냉장)', origin: '국내산', qty: 35, weight: 555.0, unitPrice: 8000, totalPrice: 4440000 },
        { product: '미전지(진공/냉장)', origin: '국내산', qty: 17, weight: 276.7, unitPrice: 8000, totalPrice: 2213600 },
        { product: '미전지(진공/냉장)', origin: '국내산', qty: 28, weight: 457.6, unitPrice: 8000, totalPrice: 3660800 },
        { product: '무항생제 삼겹(진공/냉장)', origin: '국내산', qty: 45, weight: 760.1, unitPrice: 15000, totalPrice: 11401500 },
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 35, weight: 615.0, unitPrice: 15000, totalPrice: 9225000 },
        { product: '무항생제 전지(진공/냉장)', origin: '국내산', qty: 40, weight: 560.5, unitPrice: 8500, totalPrice: 4764250 },
        { product: '전지(진공/냉장)', origin: '국내산', qty: 40, weight: 553.9, unitPrice: 8500, totalPrice: 4708150 },
    ],
}

// 대경빌 거래내역서 데이터
const DAEKYUNG_ORDERS: CompanyOrders = {
    '26/03/09': [
        { product: '무항생제 잡육(PE/냉동)', origin: '국내산', qty: 2, weight: 40.0, unitPrice: 4200, totalPrice: 168000 },
        { product: '무항생제 잡육(PE/냉동)', origin: '국내산', qty: 5, weight: 100.0, unitPrice: 4200, totalPrice: 420000 },
        { product: '잡육(PE/냉동)', origin: '국내산', qty: 10, weight: 200.0, unitPrice: 4200, totalPrice: 840000 },
        { product: '잡육(PE/냉동)', origin: '국내산', qty: 9, weight: 180.0, unitPrice: 4200, totalPrice: 756000 },
        { product: '잡육(PE/냉동)', origin: '국내산', qty: 14, weight: 280.0, unitPrice: 4200, totalPrice: 1176000 },
        { product: '잡육(PE/냉동)', origin: '국내산', qty: 14, weight: 280.0, unitPrice: 4200, totalPrice: 1176000 },
        { product: '잡육(PE/냉동)', origin: '국내산', qty: 17, weight: 340.0, unitPrice: 4200, totalPrice: 1428000 },
        { product: '무항생제 후지(PE/냉동)', origin: '국내산', qty: 1, weight: 21.7, unitPrice: 5300, totalPrice: 115010 },
        { product: '무항생제 A지방(냉동)', origin: '국내산', qty: 1, weight: 20.0, unitPrice: 2000, totalPrice: 40000 },
    ],
}

// 에이치앤더블유미트 거래내역서 데이터
const HNW_ORDERS: CompanyOrders = {
    '26/03/06': [
        { product: '목심(진공/냉장)', origin: '국내산', qty: 1, weight: 8.9, unitPrice: 13500, totalPrice: 120150 },
        { product: '미삼겹살(진공/냉장)', origin: '국내산', qty: 1, weight: 17.2, unitPrice: 15000, totalPrice: 258000 },
        { product: '삼겹(진공/냉동)', origin: '국내산', qty: 1, weight: 20.3, unitPrice: 13500, totalPrice: 274050 },
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 2, weight: 34.8, unitPrice: 15500, totalPrice: 539400 },
        { product: '무항생제 항정(진공/냉장)', origin: '국내산', qty: 1, weight: 10.7, unitPrice: 25000, totalPrice: 267500 },
    ],
}

function parseDate(dateStr: string): Date {
    const parts = dateStr.split('/')
    const year = 2000 + parseInt(parts[0])
    const month = parseInt(parts[1]) - 1
    const day = parseInt(parts[2])
    return new Date(year, month, day, 12, 0, 0)
}

export default function SeedOrders() {
    const [logs, setLogs] = useState<string[]>([])
    const [running, setRunning] = useState(false)
    const [customers, setCustomers] = useState<any[]>([])

    useEffect(() => {
        getAllCustomerUsers().then(setCustomers)
    }, [])

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
    }

    // 범용 시드 함수
    const seedCompany = async (
        searchName: string,
        displayName: string,
        orders: CompanyOrders,
        dateKeys?: string[]
    ) => {
        setRunning(true)
        setLogs([])

        const customer = customers.find(c =>
            c.business?.companyName?.includes(searchName) || c.name?.includes(searchName)
        )

        if (!customer) {
            addLog(`ERROR: ${displayName} 고객사를 찾을 수 없습니다. 먼저 거래처를 등록해주세요.`)
            setRunning(false)
            return
        }

        addLog(`${displayName} 발견: ${customer.id} / ${customer.business?.companyName || customer.name}`)

        const dates = dateKeys || Object.keys(orders).sort()
        addLog(`총 ${dates.length}건 생성 시작...`)

        for (const dateStr of dates) {
            const items = orders[dateStr]
            if (!items) { addLog(`SKIP: ${dateStr} 데이터 없음`); continue }

            const totalsKg = items.reduce((s, i) => s + i.weight, 0)
            const totalsAmount = items.reduce((s, i) => s + i.totalPrice, 0)
            const orderDate = parseDate(dateStr)

            try {
                const totalsBoxes = items.reduce((s, i) => s + i.qty, 0)

                const so = await createSalesOrder({
                    sourceOrderSheetId: `EXCEL-${searchName}-${dateStr.replace(/\//g, '')}`,
                    customerOrgId: customer.id,
                    customerName: customer.business?.companyName || customer.name || displayName,
                    status: 'CREATED',
                    totalsKg,
                    totalsBoxes,
                    totalsAmount,
                    orderUnit: 'box',
                    confirmedAt: Timestamp.fromDate(orderDate),
                })

                await setSalesOrderItems(so.id, items.map(item => ({
                    productId: `PROD-${item.product.replace(/[^가-힣a-zA-Z]/g, '')}`,
                    productName: `${item.product} (${item.origin})`,
                    qtyKg: item.weight,
                    qtyBox: item.qty,
                    boxWeight: item.qty > 0 ? Math.round((item.weight / item.qty) * 10) / 10 : undefined,
                    unit: 'box',
                    unitPrice: item.unitPrice,
                    amount: item.totalPrice,
                })))

                addLog(`[${dateStr}] ${items.length}개 품목 / ${totalsKg.toFixed(1)}kg / ${totalsAmount.toLocaleString()}원 -> ${so.id}`)
            } catch (err: any) {
                addLog(`ERROR [${dateStr}]: ${err.message}`)
            }
        }

        addLog('완료!')
        setRunning(false)
    }

    const btnStyle = (color: string) => ({
        padding: '10px 20px',
        backgroundColor: running ? '#888' : color,
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.9rem',
        fontWeight: 'bold' as const,
        cursor: running ? 'not-allowed' as const : 'pointer' as const,
    })

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1rem' }}>거래내역서 데이터 시드 (관리자 전용)</h1>
            <p style={{ color: '#888', marginBottom: '2rem' }}>거래내역서에서 추출한 데이터를 확정주문으로 등록합니다.</p>

            <div style={{ marginBottom: '1.5rem' }}>
                <h3>등록된 고객사: {customers.length}개</h3>
                <ul>
                    {customers.map(c => (
                        <li key={c.id}>{c.business?.companyName || c.name} ({c.id})</li>
                    ))}
                </ul>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => seedCompany('태윤', '(주)태윤유통', TAEYOON_ORDERS, ['25/11/06'])} disabled={running} style={btnStyle('#ff5722')}>
                    태윤유통 25/11/06 복원 1건
                </button>
                <button onClick={() => seedCompany('태윤', '(주)태윤유통', TAEYOON_ORDERS, ['26/03/10', '26/03/12'])} disabled={running} style={btnStyle('#00c853')}>
                    태윤유통 신규 2건 (3/10, 3/12)
                </button>
                <button onClick={() => seedCompany('백운', '(주)백운유통', BAEKWOON_ORDERS)} disabled={running} style={btnStyle('#2979ff')}>
                    백운유통 1건 (3/6)
                </button>
                <button onClick={() => seedCompany('대경', '(주)대경빌', DAEKYUNG_ORDERS)} disabled={running} style={btnStyle('#ff6d00')}>
                    대경빌 1건 (3/9)
                </button>
                <button onClick={() => seedCompany('에이치', '에이치앤더블유미트', HNW_ORDERS)} disabled={running} style={btnStyle('#d500f9')}>
                    에이치앤더블유미트 1건 (3/6)
                </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => seedCompany('태윤', '(주)태윤유통', TAEYOON_ORDERS)} disabled={running} style={btnStyle('#7c4dff')}>
                    태윤유통 전체 11건
                </button>
            </div>

            <div style={{
                background: '#1e1e2e',
                borderRadius: '12px',
                padding: '1.5rem',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                lineHeight: '1.8',
                maxHeight: '400px',
                overflowY: 'auto',
                color: '#cdd6f4'
            }}>
                {logs.length === 0 ? (
                    <span style={{ color: '#666' }}>로그가 여기에 표시됩니다...</span>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} style={{ color: log.includes('ERROR') ? '#f38ba8' : log.includes('완료') ? '#a6e3a1' : '#cdd6f4' }}>
                            {log}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
