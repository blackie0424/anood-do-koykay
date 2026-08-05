import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const manifestPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../public/manifest.json',
)
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

describe('manifest.json', () => {
    it('scope 為 /', () => {
        expect(manifest.scope).toBe('/')
    })

    it('orientation 為 portrait', () => {
        expect(manifest.orientation).toBe('portrait')
    })

    it('id 為 /', () => {
        expect(manifest.id).toBe('/')
    })

    it('PNG icon 標 any maskable purpose', () => {
        const pngIcons = manifest.icons.filter((icon) => icon.type === 'image/png')
        expect(pngIcons.length).toBeGreaterThan(0)
        for (const icon of pngIcons) {
            expect(icon.purpose).toBe('any maskable')
        }
    })

    it('SVG icon（內嵌點陣圖，非真正向量）不標 maskable，避免 safe zone 裁切', () => {
        const svgIcon = manifest.icons.find((icon) => icon.type === 'image/svg+xml')
        expect(svgIcon.purpose).toBe('any')
    })
})
