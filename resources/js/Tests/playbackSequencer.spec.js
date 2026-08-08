import { describe, it, expect } from 'vitest'
import { buildPlaybackPlan } from '../recording/playbackSequencer.js'

const lines = [
    { id: 1, order: 1, start_time: 2.0, end_time: 6.0 },
    { id: 2, order: 2, start_time: 6.0, end_time: 9.0 },
    { id: 3, order: 3, start_time: 9.0, end_time: 12.0 },
]

describe('buildPlaybackPlan', () => {
    it('無任何錄音時全部走公版切片', () => {
        expect(buildPlaybackPlan(lines, [])).toEqual([
            { lineId: 1, source: 'reference', start: 2.0, end: 6.0 },
            { lineId: 2, source: 'reference', start: 6.0, end: 9.0 },
            { lineId: 3, source: 'reference', start: 9.0, end: 12.0 },
        ])
    })

    it('全部段落都有錄音時全部走使用者', () => {
        expect(buildPlaybackPlan(lines, [1, 2, 3])).toEqual([
            { lineId: 1, source: 'user' },
            { lineId: 2, source: 'user' },
            { lineId: 3, source: 'user' },
        ])
    })

    it('混合：有錄音的段走 user、其餘走公版', () => {
        expect(buildPlaybackPlan(lines, [2])).toEqual([
            { lineId: 1, source: 'reference', start: 2.0, end: 6.0 },
            { lineId: 2, source: 'user' },
            { lineId: 3, source: 'reference', start: 9.0, end: 12.0 },
        ])
    })

    it('end_time 為 null 時取下一段 start_time 作為結尾', () => {
        const l = [
            { id: 1, order: 1, start_time: 2.0, end_time: null },
            { id: 2, order: 2, start_time: 5.0, end_time: 8.0 },
        ]
        expect(buildPlaybackPlan(l, [])).toEqual([
            { lineId: 1, source: 'reference', start: 2.0, end: 5.0 },
            { lineId: 2, source: 'reference', start: 5.0, end: 8.0 },
        ])
    })

    it('最後一段 end_time 為 null 且無下一段時 end 為 null（播到結尾）', () => {
        const l = [{ id: 1, order: 1, start_time: 2.0, end_time: null }]
        expect(buildPlaybackPlan(l, [])).toEqual([
            { lineId: 1, source: 'reference', start: 2.0, end: null },
        ])
    })

    it('無錄音且無時間軸的段落被跳過', () => {
        const l = [
            { id: 1, order: 1, start_time: 2.0, end_time: 6.0 },
            { id: 2, order: 2, start_time: null, end_time: null },
            { id: 3, order: 3, start_time: 9.0, end_time: 12.0 },
        ]
        expect(buildPlaybackPlan(l, [])).toEqual([
            { lineId: 1, source: 'reference', start: 2.0, end: 6.0 },
            { lineId: 3, source: 'reference', start: 9.0, end: 12.0 },
        ])
    })

    it('無時間軸但有錄音的段落仍走 user', () => {
        const l = [{ id: 1, order: 1, start_time: null, end_time: null }]
        expect(buildPlaybackPlan(l, [1])).toEqual([
            { lineId: 1, source: 'user' },
        ])
    })

    it('未依 order 排序的輸入會先排序', () => {
        const l = [
            { id: 3, order: 3, start_time: 9.0, end_time: 12.0 },
            { id: 1, order: 1, start_time: 2.0, end_time: 6.0 },
            { id: 2, order: 2, start_time: 6.0, end_time: 9.0 },
        ]
        const plan = buildPlaybackPlan(l, [])
        expect(plan.map(p => p.lineId)).toEqual([1, 2, 3])
    })

    it('空 lines 回傳空計畫', () => {
        expect(buildPlaybackPlan([], [])).toEqual([])
        expect(buildPlaybackPlan(undefined, [])).toEqual([])
    })

    it('start_time 為 0 仍視為有時間軸（邊界）', () => {
        const l = [{ id: 1, order: 1, start_time: 0, end_time: 3.0 }]
        expect(buildPlaybackPlan(l, [])).toEqual([
            { lineId: 1, source: 'reference', start: 0, end: 3.0 },
        ])
    })
})
