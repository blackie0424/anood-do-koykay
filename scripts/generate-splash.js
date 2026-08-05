import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const ICON_SOURCE = path.join(ROOT, 'public/icons/icon-512.png')
const OUTPUT_DIR = path.join(ROOT, 'public/icons/splash')
const BACKGROUND_COLOR = '#fffbeb'

// iOS 裝置的 startup image 尺寸。多個裝置共用相同實體像素尺寸時
// （例如 14 Pro / 15 / 15 Pro 都是 393x852pt @3x），只需要一張圖。
export const SPLASH_SIZES = [
    { width: 750, height: 1334, cssWidth: 375, cssHeight: 667, dpr: 2, devices: ['iPhone SE (3rd)'] },
    { width: 1170, height: 2532, cssWidth: 390, cssHeight: 844, dpr: 3, devices: ['iPhone 12', 'iPhone 13', 'iPhone 14'] },
    { width: 1284, height: 2778, cssWidth: 428, cssHeight: 926, dpr: 3, devices: ['iPhone 14 Plus'] },
    { width: 1179, height: 2556, cssWidth: 393, cssHeight: 852, dpr: 3, devices: ['iPhone 14 Pro', 'iPhone 15', 'iPhone 15 Pro'] },
    { width: 1290, height: 2796, cssWidth: 430, cssHeight: 932, dpr: 3, devices: ['iPhone 14 Pro Max', 'iPhone 15 Plus', 'iPhone 15 Pro Max'] },
    { width: 1668, height: 2388, cssWidth: 834, cssHeight: 1194, dpr: 2, devices: ['iPad Air', 'iPad Pro 11"'] },
    { width: 2048, height: 2732, cssWidth: 1024, cssHeight: 1366, dpr: 2, devices: ['iPad Pro 12.9"'] },
]

export function splashFilename({ width, height }) {
    return `splash-${width}x${height}.png`
}

// 圖示尺寸對齊網頁版 splash（.splash-icon-wrap 120 CSS px）× 該裝置的 DPR
export async function generateSplashImage(size) {
    const iconSize = Math.round(120 * size.dpr)

    const icon = await sharp(ICON_SOURCE)
        .resize(iconSize, iconSize)
        .toBuffer()

    const background = sharp({
        create: {
            width: size.width,
            height: size.height,
            channels: 3,
            background: BACKGROUND_COLOR,
        },
    })

    return background
        .composite([
            {
                input: icon,
                left: Math.round((size.width - iconSize) / 2),
                top: Math.round((size.height - iconSize) / 2),
            },
        ])
        .png()
        .toFile(path.join(OUTPUT_DIR, splashFilename(size)))
}

export async function generateAllSplashImages() {
    mkdirSync(OUTPUT_DIR, { recursive: true })

    for (const size of SPLASH_SIZES) {
        await generateSplashImage(size)
    }
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
    await generateAllSplashImages()
    console.log(`已產生 ${SPLASH_SIZES.length} 張 splash images 於 ${OUTPUT_DIR}`)
}
