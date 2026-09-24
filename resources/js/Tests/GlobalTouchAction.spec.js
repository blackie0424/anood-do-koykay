import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const appCss = readFileSync(path.join(projectRoot, 'resources/css/app.css'), 'utf-8')
const appBlade = readFileSync(path.join(projectRoot, 'resources/views/app.blade.php'), 'utf-8')

describe('全站觸控縮放設定', () => {
    it('所有元素使用 touch-action manipulation，停用雙擊縮放並保留捏合縮放', () => {
        expect(appCss).toMatch(
            /@layer\s+base\s*{[\s\S]*?\*\s*{\s*touch-action\s*:\s*manipulation\s*;?\s*}/,
        )
    })

    it('viewport 維持可縮放，不用 meta 禁止使用者縮放', () => {
        const viewport = appBlade.match(/<meta\s+name="viewport"\s+content="([^"]+)"/)?.[1]

        expect(viewport).toBe('width=device-width, initial-scale=1')
        expect(viewport).not.toMatch(/user-scalable\s*=\s*no/i)
        expect(viewport).not.toMatch(/maximum-scale/i)
    })
})
