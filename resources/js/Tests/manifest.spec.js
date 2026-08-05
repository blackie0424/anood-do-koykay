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

    it('每個 icon 都有 any maskable purpose', () => {
        expect(manifest.icons.length).toBeGreaterThan(0)
        for (const icon of manifest.icons) {
            expect(icon.purpose).toBe('any maskable')
        }
    })
})
