import { describe, it, expect } from 'vitest'
import { SPLASH_SIZES, splashFilename } from '../../../scripts/generate-splash.js'

describe('SPLASH_SIZES', () => {
    it('每個尺寸都是唯一的（沒有重複的實體像素尺寸）', () => {
        const keys = SPLASH_SIZES.map((s) => `${s.width}x${s.height}`)
        expect(new Set(keys).size).toBe(keys.length)
    })

    it('每個尺寸的 width/height 都跟 dpr × cssWidth/cssHeight 一致', () => {
        for (const size of SPLASH_SIZES) {
            expect(size.width).toBe(size.cssWidth * size.dpr)
            expect(size.height).toBe(size.cssHeight * size.dpr)
        }
    })

    it('對應規格列出的 9 個尺寸表格列（2 組尺寸重複，實際輸出 7 張圖）', () => {
        expect(SPLASH_SIZES).toHaveLength(7)

        const allDevices = SPLASH_SIZES.flatMap((s) => s.devices)
        expect(new Set(allDevices).size).toBe(allDevices.length) // 每個裝置只歸類到一組尺寸
        expect(allDevices).toEqual(
            expect.arrayContaining([
                'iPhone SE (3rd)',
                'iPhone 12', 'iPhone 13', 'iPhone 14',
                'iPhone 14 Plus',
                'iPhone 14 Pro', 'iPhone 15', 'iPhone 15 Pro',
                'iPhone 14 Pro Max', 'iPhone 15 Plus', 'iPhone 15 Pro Max',
                'iPad Air', 'iPad Pro 11"',
                'iPad Pro 12.9"',
            ]),
        )
    })

    it('包含規格要求的所有尺寸', () => {
        const sizes = SPLASH_SIZES.map((s) => `${s.width}x${s.height}`)
        expect(sizes).toEqual(
            expect.arrayContaining([
                '750x1334',
                '1170x2532',
                '1284x2778',
                '1179x2556',
                '1290x2796',
                '1668x2388',
                '2048x2732',
            ]),
        )
    })
})

describe('splashFilename', () => {
    it('產生 splash-{width}x{height}.png 格式的檔名', () => {
        expect(splashFilename({ width: 750, height: 1334 })).toBe('splash-750x1334.png')
    })
})
