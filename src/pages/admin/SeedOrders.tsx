import { useState, useEffect } from 'react'
import { createSalesOrder, setSalesOrderItems, getAllSalesOrders } from '../../lib/orderService'
import { getAllCustomerUsers } from '../../lib/userService'
import { getAllProducts, updateProduct } from '../../lib/productService'
import { Timestamp, collection, getDocs, deleteDoc, doc, setDoc, addDoc, query, where, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'

// 태윤유통 거래처원장 데이터 (Excel에서 추출)
const TAEYOON_ORDERS: Record<string, { product: string; origin: string; qty: number; weight: number; unitPrice: number; totalPrice: number }[]> = {
    '25/11/06': [
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 40, weight: 720, unitPrice: 15000, totalPrice: 10800000 },
        { product: 'A전지(냉장)', origin: '국내산', qty: 20, weight: 260, unitPrice: 8500, totalPrice: 2210000 },
        { product: '미전지(진공/냉장)', origin: '국내산', qty: 30, weight: 495, unitPrice: 8200, totalPrice: 4059000 },
        { product: '등갈비(진공/냉장)', origin: '국내산', qty: 10, weight: 125, unitPrice: 1400, totalPrice: 175000 },
        { product: '기타 품목(목살/등뼈/갈비/가브리/항정)', origin: '국내산', qty: 0, weight: 0, unitPrice: 0, totalPrice: 1086770 },
    ],
    '25/11/13': [
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 40, weight: 720, unitPrice: 14491, totalPrice: 10433233 },
        { product: 'A전지(냉장)', origin: '국내산', qty: 30, weight: 390, unitPrice: 8308, totalPrice: 3240096 },
        { product: '미전지(진공/냉장)', origin: '국내산', qty: 80, weight: 1320, unitPrice: 8018, totalPrice: 10583811 },
    ],
    '25/11/21': [
        { product: '삼겹살(진공/냉장)', origin: '국내산', qty: 100, weight: 1750, unitPrice: 14500, totalPrice: 25375000 },
        { product: '목살(진공/냉장)', origin: '국내산', qty: 10, weight: 105, unitPrice: 12500, totalPrice: 1312500 },
        { product: '미전지(진공/냉장)', origin: '국내산', qty: 100, weight: 1650, unitPrice: 8400, totalPrice: 13860000 },
        { product: 'A전지(냉장)', origin: '국내산', qty: 60, weight: 780, unitPrice: 8800, totalPrice: 6864000 },
        { product: '등갈비(진공/냉장)', origin: '국내산', qty: 20, weight: 250, unitPrice: 13500, totalPrice: 3375000 },
        { product: '등뼈(냉장)', origin: '국내산', qty: 5, weight: 92.5, unitPrice: 2200, totalPrice: 203500 },
        { product: '갈비(진공/냉장)', origin: '국내산', qty: 1, weight: 33.4, unitPrice: 7800, totalPrice: 260520 },
        { product: '가브리', origin: '국내산', qty: 0, weight: 5, unitPrice: 1800, totalPrice: 9000 },
        { product: '항정', origin: '국내산', qty: 0, weight: 5, unitPrice: 2900, totalPrice: 14500 },
        { product: '시가조정분/돈후지샘플', origin: '국내산', qty: 0, weight: 0, unitPrice: 0, totalPrice: 399230 },
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

    // ============ 공개 카탈로그 진열 시드 ============
    // 기존 활성 상품 중 처음 10개에 mediaImages + displayOnPublic=true 적용.
    // public/images/meat-1~6.jpg 를 돌려쓰며 일부 상품에 샘플 YouTube URL 도 부여.
    const seedPublicCatalog = async () => {
        setRunning(true)
        addLog('공개 카탈로그 진열 시드 시작...')
        try {
            const products = await getAllProducts()
            const activeProducts = products.filter(p => p.isActive).slice(0, 10)
            if (activeProducts.length === 0) {
                addLog('⚠ 활성 상품이 없습니다. 먼저 ProductMaster에서 상품을 추가하세요.')
                return
            }
            const photoUrls = [
                '/images/category-meat.jpg',
                '/images/hero-meat.jpg',
                '/images/meat-1.jpg',
                '/images/meat-2.jpg',
                '/images/meat-3.jpg',
                '/images/meat-4.jpg',
                '/images/meat-5.jpg',
                '/images/meat-6.jpg',
            ]
            // 데모용 YouTube — Big Buck Bunny 공식 (저작권 안전)
            const demoVideoUrl = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'

            let count = 0
            for (const p of activeProducts) {
                const primaryPhoto = photoUrls[count % photoUrls.length]
                const secondaryPhoto = photoUrls[(count + 3) % photoUrls.length]
                await updateProduct(p.id, {
                    displayOnPublic: true,
                    mediaImages: [
                        {
                            url: primaryPhoto,
                            thumbnailUrl: primaryPhoto,
                            storagePath: 'static-seed',
                            isPrimary: true,
                        },
                        {
                            url: secondaryPhoto,
                            thumbnailUrl: secondaryPhoto,
                            storagePath: 'static-seed',
                            isPrimary: false,
                        },
                    ],
                    // 3개 상품마다 1개씩 영상 부여 (Phase 1.3 임베드 모달 확인용)
                    videoUrl: count % 3 === 0 ? demoVideoUrl : undefined,
                })
                count++
                addLog(`✓ ${p.name} → 진열용 미디어 적용 (${count}/${activeProducts.length})`)
            }
            addLog(`완료: ${count}개 상품을 공개 카탈로그에 진열 (메인 + 보조 이미지 + 영상 일부)`)
        } catch (err: any) {
            addLog(`⚠ 오류: ${err?.message || err}`)
        } finally {
            setRunning(false)
        }
    }

    const resetPublicCatalog = async () => {
        if (!confirm('모든 상품을 공개 카탈로그에서 숨기고 시드 미디어를 제거하시겠습니까?')) return
        setRunning(true)
        addLog('공개 카탈로그 시드 리셋 시작...')
        try {
            const products = await getAllProducts()
            let count = 0
            for (const p of products) {
                // 시드로 만든 mediaImages만 제거 (storagePath가 'static-seed')
                const isSeed = p.mediaImages?.some(m => m.storagePath === 'static-seed')
                if (isSeed || p.displayOnPublic) {
                    await updateProduct(p.id, {
                        displayOnPublic: false,
                        mediaImages: isSeed ? undefined : p.mediaImages,
                        videoUrl: isSeed ? undefined : p.videoUrl,
                    })
                    count++
                }
            }
            addLog(`완료: ${count}개 상품을 비공개로 전환 + 시드 미디어 제거`)
        } catch (err: any) {
            addLog(`⚠ 오류: ${err?.message || err}`)
        } finally {
            setRunning(false)
        }
    }

    // 주문 삭제 함수
    const deleteOrder = async (orderId: string) => {
        setRunning(true)
        setLogs([])
        addLog(`주문 ${orderId} 삭제 시작...`)
        try {
            // salesOrderItems 삭제
            const itemsSnap = await getDocs(collection(db, 'salesOrderItems'))
            let deleted = 0
            for (const d of itemsSnap.docs) {
                if (d.data().salesOrderId === orderId) {
                    await deleteDoc(doc(db, 'salesOrderItems', d.id))
                    deleted++
                }
            }
            addLog(`품목 ${deleted}건 삭제`)
            // salesOrder 삭제
            await deleteDoc(doc(db, 'salesOrders', orderId))
            addLog(`주문 ${orderId} 삭제 완료!`)
        } catch (err: any) {
            addLog(`ERROR: ${err.message}`)
        }
        setRunning(false)
    }
    // 임시 금액만 등록 함수 (품목 없이 총액만, 미등록 고객사 자동 생성)
    const seedAmountOnly = async (
        searchName: string,
        displayName: string,
        dateStr: string,
        totalAmount: number
    ) => {
        setRunning(true)
        setLogs([])

        let customer = customers.find(c =>
            c.business?.companyName?.includes(searchName) || c.name?.includes(searchName)
        )

        // 고객사 미등록 시 자동 생성
        if (!customer) {
            addLog(`${displayName} 미등록 - 자동 생성 중...`)
            try {
                const newId = `AUTO-${searchName}-${Date.now()}`
                const now = Timestamp.now()
                await setDoc(doc(db, 'users', newId), {
                    email: `${searchName.toLowerCase()}@temp.meatgo.kr`,
                    name: displayName,
                    role: 'CUSTOMER',
                    status: 'ACTIVE',
                    business: {
                        companyName: displayName,
                        bizRegNo: '',
                        ceoName: '',
                        address: '',
                        tel: '',
                    },
                    createdAt: now,
                    updatedAt: now,
                })
                customer = { id: newId, name: displayName, business: { companyName: displayName } }
                // 목록 업데이트
                setCustomers(prev => [...prev, customer])
                addLog(`${displayName} 거래처 자동 생성 완료: ${newId}`)
            } catch (err: any) {
                addLog(`ERROR 거래처 생성 실패: ${err.message}`)
                setRunning(false)
                return
            }
        } else {
            addLog(`${displayName} 발견: ${customer.id}`)
        }

        const orderDate = parseDate(dateStr)

        try {
            const so = await createSalesOrder({
                sourceOrderSheetId: `TEMP-${searchName}-${dateStr.replace(/\//g, '')}`,
                customerOrgId: customer.id,
                customerName: customer.business?.companyName || customer.name || displayName,
                status: 'CREATED',
                totalsKg: 0,
                totalsBoxes: 0,
                totalsAmount: totalAmount,
                orderUnit: 'box',
                confirmedAt: Timestamp.fromDate(orderDate),
            })

            await setSalesOrderItems(so.id, [{
                productId: 'TEMP-AMOUNT-ONLY',
                productName: `임시 등록 (총액만 - ${displayName})`,
                qtyKg: 0,
                qtyBox: 0,
                boxWeight: 0,
                unit: 'etc',
                unitPrice: 0,
                amount: totalAmount,
            }])

            addLog(`[${dateStr}] ${displayName} 임시 등록 / ${totalAmount.toLocaleString()}원 -> ${so.id}`)
        } catch (err: any) {
            addLog(`ERROR: ${err.message}`)
        }

        addLog('완료!')
        setRunning(false)
    }

    // 매출발주(orderSheet) 등록 함수 (SUBMITTED 상태로)
    const seedOrderSheet = async (
        searchName: string,
        displayName: string,
        dateStr: string,
        totalAmount: number
    ) => {
        setRunning(true)
        setLogs([])

        let customer = customers.find(c =>
            c.business?.companyName?.includes(searchName) || c.name?.includes(searchName)
        )

        if (!customer) {
            addLog(`ERROR: ${displayName} 고객사를 찾을 수 없습니다.`)
            setRunning(false)
            return
        }

        addLog(`${displayName} 발견: ${customer.id}`)
        const orderDate = parseDate(dateStr)
        const now = Timestamp.now()

        try {
            const docRef = await addDoc(collection(db, 'orderSheets'), {
                customerOrgId: customer.id,
                customerName: customer.business?.companyName || customer.name || displayName,
                status: 'SUBMITTED',
                totalAmount: totalAmount,
                totalKg: 0,
                totalBoxes: 0,
                totalItems: 0,
                shipTo: '',
                cutOffAt: Timestamp.fromDate(orderDate),
                shipDate: Timestamp.fromDate(orderDate),
                createdAt: now,
                updatedAt: now,
                adminComment: '3/18 예정 납품 - 임시 등록',
            })

            addLog(`[${dateStr}] ${displayName} 매출발주 등록 (SUBMITTED) / ${totalAmount.toLocaleString()}원 -> ${docRef.id}`)
        } catch (err: any) {
            addLog(`ERROR: ${err.message}`)
        }

        addLog('완료!')
        setRunning(false)
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
                    qtyBox: item.qty || 0,
                    boxWeight: item.qty > 0 ? Math.round((item.weight / item.qty) * 10) / 10 : 0,
                    unit: item.qty > 0 ? 'box' : 'etc',
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

    // 미확정 발주서에 직전 주문 비율로 상품항목 채우기
    const seedPendingAsConfirmed = async (
        searchName: string,
        displayName: string,
        totalAmount: number
    ) => {
        setRunning(true)
        setLogs([])

        const customer = customers.find(c =>
            c.business?.companyName?.includes(searchName) || c.name?.includes(searchName)
        )

        if (!customer) {
            addLog(`ERROR: ${displayName} 고객사를 찾을 수 없습니다.`)
            setRunning(false)
            return
        }

        addLog(`${displayName} 발견: ${customer.id}`)

        try {
            // 1. 해당 거래처의 SUBMITTED 상태 orderSheet 찾기
            const osSnap = await getDocs(collection(db, 'orderSheets'))
            const pendingOS = osSnap.docs.find(d => {
                const data = d.data()
                return data.customerOrgId === customer.id && data.status === 'SUBMITTED'
            })

            if (!pendingOS) {
                addLog(`ERROR: ${displayName}에 SUBMITTED 상태의 발주서가 없습니다.`)
                setRunning(false)
                return
            }

            addLog(`발주서 발견: ${pendingOS.id} (${totalAmount.toLocaleString()}원)`)

            // 2. 해당 거래처의 모든 확정 주문(salesOrders) 조회
            const allSO = await getAllSalesOrders()
            const soData = allSO.map(so => ({
                ...so,
                confirmedAt: so.confirmedAt?.toDate?.() || new Date(),
            }))

            // 3. salesOrderItems 전체 조회
            const itemsSnap = await getDocs(collection(db, 'salesOrderItems'))
            const allItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any))

            // 4. TEMP-AMOUNT-ONLY가 아닌 실제 상품이 있는 최신 주문 찾기
            const customerOrders = soData
                .filter(so => so.customerOrgId === customer.id)
                .sort((a, b) => (b.confirmedAt?.getTime?.() || 0) - (a.confirmedAt?.getTime?.() || 0))

            let referenceOrder: typeof soData[0] | null = null
            let referenceItems: any[] = []

            for (const so of customerOrders) {
                const items = allItems.filter((item: any) => item.salesOrderId === so.id)
                const hasRealItems = items.some((item: any) => item.productId !== 'TEMP-AMOUNT-ONLY')
                if (hasRealItems) {
                    referenceOrder = so
                    referenceItems = items.filter((item: any) => item.productId !== 'TEMP-AMOUNT-ONLY')
                    break
                }
            }

            if (!referenceOrder || referenceItems.length === 0) {
                addLog(`ERROR: ${displayName}에 참조할 실제 상품 주문이 없습니다. 상품항목을 채울 수 없습니다.`)
                setRunning(false)
                return
            }

            addLog(`참조 주문 발견: ${referenceOrder.id} (${referenceItems.length}개 품목)`)

            // 참조 주문의 총액 계산
            const refTotal = referenceItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
            addLog(`참조 주문 총액: ${refTotal.toLocaleString()}원`)

            // 비율 계산 및 orderSheetItems 형식으로 분배
            const distributedItems = referenceItems.map((item: any) => {
                const ratio = refTotal > 0 ? (item.amount || 0) / refTotal : 0
                const distributedAmount = Math.round(totalAmount * ratio)
                const distributedKg = item.qtyKg ? Math.round(item.qtyKg * (totalAmount / refTotal) * 10) / 10 : 0
                const distributedBox = item.qtyBox ? Math.round(item.qtyBox * (totalAmount / refTotal)) : 0
                return {
                    productId: item.productId,
                    productName: item.productName,
                    category1: '',
                    unit: item.unit || 'box',
                    unitPrice: item.unitPrice || 0,
                    qtyRequested: distributedBox,
                    estimatedKg: distributedKg,
                    amount: distributedAmount,
                }
            })

            // 반올림 차이 보정 (마지막 아이템에 합산)
            const distributedTotal = distributedItems.reduce((sum: number, i: any) => sum + i.amount, 0)
            const diff = totalAmount - distributedTotal
            if (diff !== 0 && distributedItems.length > 0) {
                distributedItems[distributedItems.length - 1].amount += diff
            }

            // 5. setOrderSheetItems로 발주서에 상품항목 저장
            const { setOrderSheetItems } = await import('../../lib/orderService')
            await setOrderSheetItems(pendingOS.id, distributedItems)

            // 6. orderSheet 헤더 수치 업데이트 (상태는 변경하지 않음)
            const totalKg = distributedItems.reduce((sum: number, i: any) => sum + (i.estimatedKg || 0), 0)
            const totalBoxes = distributedItems.reduce((sum: number, i: any) => sum + (i.qtyRequested || 0), 0)
            await updateDoc(doc(db, 'orderSheets', pendingOS.id), {
                totalItems: distributedItems.length,
                totalKg,
                totalBoxes,
                totalAmount,
                updatedAt: Timestamp.now(),
            })

            addLog(`${distributedItems.length}개 품목으로 분배 완료:`)
            distributedItems.forEach((item: any) => {
                const pct = ((item.amount / totalAmount) * 100).toFixed(1)
                addLog(`  - ${item.productName}: ${item.amount.toLocaleString()}원 (${pct}%)`)
            })
            addLog(`발주서 ${pendingOS.id}에 상품항목 저장 완료 (상태: SUBMITTED 유지)`)

        } catch (err: any) {
            addLog(`ERROR: ${err.message}`)
        }

        addLog('완료!')
        setRunning(false)
    }

    // 잘못 생성된 salesOrders 정리 (이전 실행에서 잘못 만든 것들)
    const cleanupDuplicateSalesOrders = async () => {
        setRunning(true)
        setLogs([])
        addLog('잘못 생성된 salesOrders 검색 중...')

        try {
            // orderSheets 중 SUBMITTED 또는 CONFIRMED 상태인 것의 ID 수집
            const osSnap = await getDocs(collection(db, 'orderSheets'))
            const orderSheetIds = new Set(
                osSnap.docs
                    .filter(d => ['SUBMITTED', 'CONFIRMED'].includes(d.data().status))
                    .map(d => d.id)
            )

            // salesOrders에서 sourceOrderSheetId가 이 목록에 있는 것 찾기
            const allSO = await getAllSalesOrders()
            const duplicates = allSO.filter(so => orderSheetIds.has(so.sourceOrderSheetId))

            if (duplicates.length === 0) {
                addLog('잘못 생성된 salesOrders가 없습니다.')
            } else {
                addLog(`${duplicates.length}개 잘못 생성된 salesOrders 발견:`)
                for (const so of duplicates) {
                    // 해당 salesOrder의 items도 삭제
                    const itemsSnap = await getDocs(
                        query(collection(db, 'salesOrderItems'), where('salesOrderId', '==', so.id))
                    )
                    for (const itemDoc of itemsSnap.docs) {
                        await deleteDoc(doc(db, 'salesOrderItems', itemDoc.id))
                    }
                    await deleteDoc(doc(db, 'salesOrders', so.id))
                    addLog(`  삭제: ${so.id} (${so.customerName}, ${so.totalsAmount.toLocaleString()}원, items: ${itemsSnap.size}개)`)
                }
            }

            // CONFIRMED로 잘못 변경된 orderSheets를 SUBMITTED로 복원
            for (const osDoc of osSnap.docs) {
                if (osDoc.data().status === 'CONFIRMED' && orderSheetIds.has(osDoc.id)) {
                    await updateDoc(doc(db, 'orderSheets', osDoc.id), {
                        status: 'SUBMITTED',
                        updatedAt: Timestamp.now(),
                    })
                    addLog(`  발주서 ${osDoc.id} 상태 CONFIRMED -> SUBMITTED 복원`)
                }
            }

        } catch (err: any) {
            addLog(`ERROR: ${err.message}`)
        }

        addLog('완료!')
        setRunning(false)
    }

    // 발송됨 -> 승인요청 상태 변경
    const updateSentToSubmitted = async () => {
        setRunning(true)
        setLogs([])
        const ids = ['20260317-001', '20260317-002', '20260317-003']
        addLog(`${ids.length}건 발주서 상태 변경 (SENT -> SUBMITTED)...`)

        for (const id of ids) {
            try {
                const docRef = doc(db, 'orderSheets', id)
                const snap = await getDocs(collection(db, 'orderSheets'))
                const found = snap.docs.find(d => d.id === id)
                if (found) {
                    await updateDoc(docRef, {
                        status: 'SUBMITTED',
                        updatedAt: Timestamp.now(),
                    })
                    const data = found.data()
                    addLog(`  ${id} (${data.customerName}): SENT -> SUBMITTED 완료`)
                } else {
                    addLog(`  ${id}: 문서를 찾을 수 없습니다`)
                }
            } catch (err: any) {
                addLog(`  ERROR ${id}: ${err.message}`)
            }
        }

        addLog('완료!')
        setRunning(false)
    }

    // 20260317-003 거래처명 수정 (에이치앤더블유미트 → 주식회사대경햄)
    const fixOrderSheet003Customer = async () => {
        setRunning(true)
        setLogs([])
        addLog('20260317-003 거래처 변경 시작...')

        try {
            // 대경햄 고객 찾기
            const daekyungHam = customers.find(c =>
                c.business?.companyName?.includes('대경햄') || c.name?.includes('대경햄')
            )

            const newName = '주식회사 대경햄'
            const newOrgId = daekyungHam?.id || ''

            if (daekyungHam) {
                addLog(`대경햄 고객 발견: ${daekyungHam.id} / ${daekyungHam.business?.companyName || daekyungHam.name}`)
            } else {
                addLog(`WARNING: 대경햄 고객을 찾을 수 없습니다. customerName만 변경합니다.`)
            }

            const docRef = doc(db, 'orderSheets', '20260317-003')
            const updateData: Record<string, any> = {
                customerName: newName,
                updatedAt: Timestamp.now(),
            }
            if (newOrgId) {
                updateData.customerOrgId = newOrgId
            }
            await updateDoc(docRef, updateData)
            addLog(`20260317-003: 거래처 → ${newName} (orgId: ${newOrgId || 'N/A'}) 완료`)
        } catch (err: any) {
            addLog(`ERROR: ${err.message}`)
        }

        addLog('완료!')
        setRunning(false)
    }

    // 대경햄 003 확정 처리
    const confirmDaekyung003 = async () => {
        setRunning(true)
        setLogs([])
        const sheetId = '20260317-003'
        addLog(`${sheetId} 확정 처리 시작...`)

        try {
            // orderSheet 정보 가져오기
            const sheetRef = doc(db, 'orderSheets', sheetId)
            const sheetSnap = await getDocs(collection(db, 'orderSheets'))
            const sheetDoc = sheetSnap.docs.find(d => d.id === sheetId)

            if (!sheetDoc) {
                addLog('ERROR: orderSheet를 찾을 수 없습니다.')
                setRunning(false)
                return
            }

            const sheetData = sheetDoc.data()
            addLog(`orderSheet: ${sheetData.customerName}, ${sheetData.totalAmount?.toLocaleString()}원`)

            // orderSheetItems 가져오기
            const itemsSnap = await getDocs(
                query(collection(db, 'orderSheetItems'), where('orderSheetId', '==', sheetId))
            )
            addLog(`orderSheetItems: ${itemsSnap.size}개`)

            const items = itemsSnap.docs.map(d => d.data())

            // salesOrder 생성
            const totalsKg = items.reduce((s, i) => s + (i.estimatedKg || 0), 0)
            const totalsBoxes = items.reduce((s, i) => s + ((i.unit === 'box' ? i.qtyRequested : 0) || 0), 0)
            const totalsAmount = items.reduce((s, i) => s + (i.amount || 0), 0)

            const salesOrder = await createSalesOrder({
                sourceOrderSheetId: sheetId,
                customerOrgId: sheetData.customerOrgId || '',
                customerName: sheetData.customerName || '주식회사 대경햄',
                status: 'CREATED',
                totalsKg,
                totalsBoxes,
                totalsAmount,
                orderUnit: items[0]?.unit || 'kg',
                confirmedAt: Timestamp.now(),
            })
            addLog(`salesOrder 생성: ${salesOrder.id} (${totalsAmount.toLocaleString()}원)`)

            // salesOrderItems 생성
            const soItems = items.map(i => ({
                productId: i.productId || '',
                productName: i.productName || '',
                qtyKg: i.estimatedKg || 0,
                qtyBox: (i.unit === 'box' ? i.qtyRequested : 0) || 0,
                unit: i.unit || 'kg',
                unitPrice: i.unitPrice || 0,
                amount: i.amount || 0,
            }))
            await setSalesOrderItems(salesOrder.id, soItems)
            addLog(`salesOrderItems ${soItems.length}개 생성`)

            for (const item of soItems) {
                addLog(`  + ${item.productName}: ${item.amount.toLocaleString()}원`)
            }

            // orderSheet 상태 CONFIRMED로 변경
            await updateDoc(sheetRef, {
                status: 'CONFIRMED',
                updatedAt: Timestamp.now(),
            })
            addLog(`orderSheet 상태: CONFIRMED`)

        } catch (err: any) {
            addLog(`ERROR: ${err.message}`)
        }

        addLog('완료!')
        setRunning(false)
    }

    // 태윤유통 12/12 매출 데이터 수정 (매출거래처원장 기준)
    const fixTaeyoon1212 = async () => {
        setRunning(true)
        setLogs([])
        addLog('태윤유통 12/12 매출 데이터 수정 시작...')

        const correctItems = [
            { productName: '돈등뼈(냉장)', origin: '국내산', qtyBox: 15, qtyKg: 285.7, unitPrice: 1800, amount: 514260 },
            { productName: '등갈비(진공/냉장)', origin: '국내산', qtyBox: 15, qtyKg: 197.6, unitPrice: 14500, amount: 2865200 },
            { productName: '목심(진공/냉장)', origin: '국내산', qtyBox: 5, qtyKg: 47.4, unitPrice: 12000, amount: 568800 },
            { productName: '삼겹살(진공/냉장)', origin: '국내산', qtyBox: 71, qtyKg: 1222.6, unitPrice: 15500, amount: 18950300 },
            { productName: '양미삼겹살(진공/냉장)', origin: '국내산', qtyBox: 1, qtyKg: 20.7, unitPrice: 15000, amount: 310500 },
            { productName: '미삼겹살(진공/냉장)', origin: '국내산', qtyBox: 16, qtyKg: 308.5, unitPrice: 15000, amount: 4627500 },
            { productName: '미전지(진공/냉장)', origin: '국내산', qtyBox: 25, qtyKg: 397.1, unitPrice: 9500, amount: 3772450 },
            { productName: '무항생제 목심(진공/냉장)', origin: '국내산', qtyBox: 15, qtyKg: 153.3, unitPrice: 12000, amount: 1839600 },
            { productName: '무항생제 전지(진공/냉장)', origin: '국내산', qtyBox: 35, qtyKg: 441.5, unitPrice: 9700, amount: 4282550 },
            { productName: '무항생제 미전지(진공/냉장)', origin: '국내산', qtyBox: 10, qtyKg: 152.7, unitPrice: 9500, amount: 1450650 },
            { productName: '무항생제 삼겹(진공/냉장)', origin: '국내산', qtyBox: 19, qtyKg: 301.8, unitPrice: 15500, amount: 4677900 },
            { productName: '무항생제 이삼겹(진공/냉장)', origin: '국내산', qtyBox: 2, qtyKg: 33.9, unitPrice: 15000, amount: 508500 },
            { productName: '무항생제 양미삼겹(진공/냉장)', origin: '국내산', qtyBox: 1, qtyKg: 16.7, unitPrice: 15000, amount: 250500 },
        ]

        const totalAmount = correctItems.reduce((s, i) => s + i.amount, 0) // 44,618,710
        const totalKg = correctItems.reduce((s, i) => s + i.qtyKg, 0) // 3,579.5
        const totalBoxes = correctItems.reduce((s, i) => s + i.qtyBox, 0) // 230

        try {
            // 태윤유통 12/12 salesOrder 찾기
            const allSO = await getAllSalesOrders()
            const taeyoonSO = allSO.filter(so =>
                so.customerName?.includes('태윤') &&
                so.confirmedAt &&
                new Date(so.confirmedAt instanceof Timestamp ? so.confirmedAt.toDate() : so.confirmedAt).getMonth() === 11 &&
                new Date(so.confirmedAt instanceof Timestamp ? so.confirmedAt.toDate() : so.confirmedAt).getDate() === 12
            )

            if (taeyoonSO.length === 0) {
                addLog('ERROR: 태윤유통 12/12 salesOrder를 찾을 수 없습니다.')
                setRunning(false)
                return
            }

            const so = taeyoonSO[0]
            addLog(`salesOrder 발견: ${so.id} (${so.customerName}, ${so.totalsAmount.toLocaleString()}원)`)

            // 기존 items 삭제
            const existingItems = await getDocs(
                query(collection(db, 'salesOrderItems'), where('salesOrderId', '==', so.id))
            )
            addLog(`기존 items ${existingItems.size}개 삭제 중...`)
            for (const d of existingItems.docs) {
                await deleteDoc(doc(db, 'salesOrderItems', d.id))
            }

            // 새로운 items 추가
            for (const item of correctItems) {
                const itemRef = doc(collection(db, 'salesOrderItems'))
                await setDoc(itemRef, {
                    id: itemRef.id,
                    salesOrderId: so.id,
                    productId: item.productName,
                    productName: `${item.productName} (${item.origin})`,
                    qtyKg: item.qtyKg,
                    qtyBox: item.qtyBox,
                    unit: 'box',
                    unitPrice: item.unitPrice,
                    amount: item.amount,
                })
                addLog(`  + ${item.productName}: ${item.qtyBox}box, ${item.qtyKg}kg, ${item.amount.toLocaleString()}원`)
            }

            // salesOrder 총액 업데이트
            await updateDoc(doc(db, 'salesOrders', so.id), {
                totalsKg: totalKg,
                totalsBoxes: totalBoxes,
                totalsAmount: totalAmount,
                updatedAt: Timestamp.now(),
            })
            addLog(`salesOrder 총액 업데이트: ${totalAmount.toLocaleString()}원 (${totalKg}kg, ${totalBoxes}box)`)

        } catch (err: any) {
            addLog(`ERROR: ${err.message}`)
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

            {/* 공개 카탈로그 진열 시드 */}
            <div style={{ marginBottom: '2rem', padding: '16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#065F46' }}>🥩 공개 카탈로그 진열 시드</h3>
                <p style={{ fontSize: '13px', color: '#374151', margin: '0 0 12px 0' }}>
                    Phase 1.1+1.2 (멀티미디어 모델 + MediaUploader) 검증용. 활성 상품 10개에
                    실사 이미지 2장씩 + 일부 YouTube 영상을 자동 적용하고 공개 카탈로그(/products)에 노출시킵니다.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={seedPublicCatalog} disabled={running} style={btnStyle('#047857')}>
                        ▶ 진열 시드 적용 (10개 상품)
                    </button>
                    <button onClick={resetPublicCatalog} disabled={running} style={btnStyle('#6B7280')}>
                        ↺ 시드 리셋 (비공개로 되돌림)
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => deleteOrder('V1gUx1EMrGHO7nvOtwNT')} disabled={running} style={btnStyle('#d32f2f')}>
                    25/11/13 기존 주문 삭제
                </button>
                <button onClick={() => deleteOrder('KvApgu3B5aAsUfKqaPYD')} disabled={running} style={btnStyle('#d32f2f')}>
                    25/11/06 잘못된 주문 삭제
                </button>
                <button onClick={() => seedCompany('태윤', '(주)태윤유통', TAEYOON_ORDERS, ['25/11/06'])} disabled={running} style={btnStyle('#ff5722')}>
                    태윤유통 25/11/06 복원 1건
                </button>
                <button onClick={() => seedCompany('태윤', '(주)태윤유통', TAEYOON_ORDERS, ['25/11/13'])} disabled={running} style={btnStyle('#ff5722')}>
                    태윤유통 25/11/13 복원 1건
                </button>
                <button onClick={() => seedCompany('태윤', '(주)태윤유통', TAEYOON_ORDERS, ['25/11/21'])} disabled={running} style={btnStyle('#ff5722')}>
                    태윤유통 25/11/21 복원 1건
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
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#444', alignSelf: 'center' }}>복원 (엄마네한우/푸드고/어반나이프):</span>
                <button onClick={() => seedAmountOnly('엄마네', '엄마네한우', '25/12/19', 6801050)} disabled={running} style={btnStyle('#e65100')}>
                    엄마네한우 12/19 6,801,050원
                </button>
                <button onClick={() => seedAmountOnly('푸드고', '푸드고', '26/01/23', 8232000)} disabled={running} style={btnStyle('#e65100')}>
                    푸드고 01/23 8,232,000원
                </button>
                <button onClick={() => seedAmountOnly('어반', '어반나이프', '26/02/25', 8736000)} disabled={running} style={btnStyle('#e65100')}>
                    어반나이프 02/25 8,736,000원
                </button>
                <button onClick={() => seedAmountOnly('어반', '어반나이프', '26/03/09', 6119010)} disabled={running} style={btnStyle('#e65100')}>
                    어반나이프 03/09 6,119,010원
                </button>
                <button onClick={() => seedAmountOnly('어반', '어반나이프', '26/03/11', 8700000)} disabled={running} style={btnStyle('#e65100')}>
                    어반나이프 03/11 8,700,000원
                </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#444', alignSelf: 'center' }}>3/18 매출발주 (승인요청 상태):</span>
                <button onClick={() => seedOrderSheet('태윤', '(주)태윤유통', '26/03/18', 42586840)} disabled={running} style={btnStyle('#795548')}>
                    태윤유통 42,586,840원
                </button>
                <button onClick={() => seedOrderSheet('백운', '(주)백운유통', '26/03/18', 47910330)} disabled={running} style={btnStyle('#795548')}>
                    백운유통 47,910,330원
                </button>
                <button onClick={() => seedOrderSheet('어반', '어반나이프', '26/03/18', 8700000)} disabled={running} style={btnStyle('#795548')}>
                    어반나이프 8,700,000원
                </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e65100', alignSelf: 'center' }}>미확정 발주 상품항목 채우기 (직전주문 비율):</span>
                <button onClick={() => seedPendingAsConfirmed('태윤', '(주)태윤유통', 42586840)} disabled={running} style={btnStyle('#1b5e20')}>
                    태윤유통 42,586,840원 상품채우기
                </button>
                <button onClick={() => seedPendingAsConfirmed('백운', '(주)백운유통', 47910330)} disabled={running} style={btnStyle('#1b5e20')}>
                    백운유통 47,910,330원 상품채우기
                </button>
                <button onClick={() => seedPendingAsConfirmed('어반', '어반나이프', 8700000)} disabled={running} style={btnStyle('#1b5e20')}>
                    어반나이프 8,700,000원 상품채우기
                </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#d32f2f', alignSelf: 'center' }}>데이터 정리:</span>
                <button onClick={cleanupDuplicateSalesOrders} disabled={running} style={btnStyle('#d32f2f')}>
                    잘못 생성된 salesOrders 정리
                </button>
                <button onClick={updateSentToSubmitted} disabled={running} style={btnStyle('#ff6f00')}>
                    3/17 발주서 3건 SENT → SUBMITTED
                </button>
                <button onClick={fixTaeyoon1212} disabled={running} style={btnStyle('#0d47a1')}>
                    태윤유통 12/12 매출 수정
                </button>
                <button onClick={fixOrderSheet003Customer} disabled={running} style={btnStyle('#6a1b9a')}>
                    003 거래처 → 대경햄
                </button>
                <button onClick={confirmDaekyung003} disabled={running} style={btnStyle('#00695c')}>
                    대경햄 003 확정처리
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
