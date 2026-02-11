import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePWAInstall } from '@/core/pwa/usePWAInstall'

// ═══════════════════════════════════════════════════════════════
// usePWAInstall (src/core/pwa/usePWAInstall.ts) — Direct Import + Mock
//
// Mock matchMedia and localStorage for shouldShow() logic.
// ═══════════════════════════════════════════════════════════════

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('usePWAInstall', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    // Default: not standalone — define matchMedia as mock (jsdom doesn't have it)
    window.matchMedia = vi.fn().mockReturnValue({ matches: false } as MediaQueryList)
    // Reset the global install event
    ;(window as any).__pwaInstallEvent = null
  })

  it('returns showPrompt, install, dismiss', () => {
    const { result } = renderHook(() => usePWAInstall())
    expect(result.current).toHaveProperty('showPrompt')
    expect(result.current).toHaveProperty('install')
    expect(result.current).toHaveProperty('dismiss')
  })

  it('showPrompt defaults to false when no beforeinstallprompt event', () => {
    const { result } = renderHook(() => usePWAInstall())
    expect(result.current.showPrompt).toBe(false)
  })

  it('showPrompt is false when app is in standalone mode', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true } as MediaQueryList)
    const { result } = renderHook(() => usePWAInstall())
    expect(result.current.showPrompt).toBe(false)
  })

  it('showPrompt is false when dismissed within 7 days', () => {
    localStorageMock.setItem('pwa-install-dismissed', Date.now().toString())
    const { result } = renderHook(() => usePWAInstall())
    expect(result.current.showPrompt).toBe(false)
  })

  it('picks up __pwaInstallEvent set before mount', () => {
    const mockEvent = { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) }
    ;(window as any).__pwaInstallEvent = mockEvent
    const { result } = renderHook(() => usePWAInstall())
    expect(result.current.showPrompt).toBe(true)
  })

  it('listens for beforeinstallprompt event', () => {
    const origAdd = window.addEventListener
    const addSpy = vi.spyOn(window, 'addEventListener')
    renderHook(() => usePWAInstall())
    expect(addSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    addSpy.mockRestore()
  })

  it('dismiss sets showPrompt to false and saves timestamp', () => {
    const mockEvent = { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) }
    ;(window as any).__pwaInstallEvent = mockEvent
    const { result } = renderHook(() => usePWAInstall())
    expect(result.current.showPrompt).toBe(true)

    act(() => { result.current.dismiss() })
    expect(result.current.showPrompt).toBe(false)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'pwa-install-dismissed',
      expect.any(String),
    )
  })

  it('install calls deferredPrompt.prompt()', async () => {
    const mockPrompt = vi.fn()
    const mockEvent = { prompt: mockPrompt, userChoice: Promise.resolve({ outcome: 'accepted' }) }
    ;(window as any).__pwaInstallEvent = mockEvent
    const { result } = renderHook(() => usePWAInstall())

    await act(async () => { await result.current.install() })
    expect(mockPrompt).toHaveBeenCalledTimes(1)
  })

  it('install hides prompt when outcome is accepted', async () => {
    const mockEvent = {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    }
    ;(window as any).__pwaInstallEvent = mockEvent
    const { result } = renderHook(() => usePWAInstall())

    await act(async () => { await result.current.install() })
    expect(result.current.showPrompt).toBe(false)
  })
})
