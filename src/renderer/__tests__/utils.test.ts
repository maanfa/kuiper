import { describe, it, expect, vi } from 'vitest'
import { formatSize } from '../utils/file-inspector'

describe('formatSize (file-inspector)', () => {
  it('格式化 B', () => {
    expect(formatSize(0)).toBe('0 B')
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(1023)).toBe('1023 B')
  })

  it('格式化 KB', () => {
    expect(formatSize(1024)).toBe('1.0 KB')
    expect(formatSize(1536)).toBe('1.5 KB')
    expect(formatSize(1024 * 1024 - 1)).toBe('1024.0 KB')
  })

  it('格式化 MB', () => {
    expect(formatSize(1048576)).toBe('1.0 MB')
    expect(formatSize(1048576 * 100)).toBe('100.0 MB')
    expect(formatSize(1048576 * 1023)).toBe('1023.0 MB')
  })

  it('格式化 GB', () => {
    expect(formatSize(1073741824)).toBe('1.00 GB')
    expect(formatSize(1073741824 * 5)).toBe('5.00 GB')
  })
})
