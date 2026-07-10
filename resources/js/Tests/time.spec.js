import { describe, it, expect } from 'vitest'
import { parseTime, secondsToMmss } from '../utils/time'

describe('parseTime', () => {
    it('parses mm:ss format', () => {
        expect(parseTime('1:03')).toBe(63)
    })

    it('parses mm:ss.f format', () => {
        expect(parseTime('1:03.5')).toBe(63.5)
    })

    it('parses plain seconds', () => {
        expect(parseTime('63.5')).toBe(63.5)
    })

    it('returns null for empty string', () => {
        expect(parseTime('')).toBeNull()
    })

    it('returns null for null', () => {
        expect(parseTime(null)).toBeNull()
    })

    it('returns null for invalid input', () => {
        expect(parseTime('invalid')).toBeNull()
    })
})

describe('secondsToMmss', () => {
    it('converts whole seconds to mm:ss.f', () => {
        expect(secondsToMmss(63)).toBe('1:03.0')
    })

    it('converts fractional seconds', () => {
        expect(secondsToMmss(63.5)).toBe('1:03.5')
    })

    it('pads seconds with leading zero', () => {
        expect(secondsToMmss(5)).toBe('0:05.0')
    })

    it('returns empty string for null', () => {
        expect(secondsToMmss(null)).toBe('')
    })

    it('returns empty string for undefined', () => {
        expect(secondsToMmss(undefined)).toBe('')
    })
})
