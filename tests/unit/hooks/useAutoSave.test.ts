import { act, renderHook, cleanup } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { useAutoSave, useFolderSaveStatus } from '@/hooks/useAutoSave'
import { useRecipeStore } from '@/stores/useRecipeStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { fileSystemStorage } from '@/utils/storage/fileSystemStorage'

vi.mock('@/utils/storage/fileSystemStorage', () => ({ fileSystemStorage: {
  isDirectorySelected: vi.fn(() => true), initialize: vi.fn(async () => true), writeFile: vi.fn(async () => {}),
} }))

const change = (name: string) => act(() => useRecipeStore.setState({ recipes: [{ id: name, name } as any] }))
const tick = () => act(async () => { await vi.advanceTimersByTimeAsync(2000) })

describe('folder backup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.mocked(fileSystemStorage.isDirectorySelected).mockReturnValue(true)
    vi.mocked(fileSystemStorage.writeFile).mockResolvedValue(undefined)
    useRecipeStore.setState({ recipes: [] })
    useSettingsStore.setState(state => ({ storage: { ...state.storage, type: 'filesystem', directoryName: 'test', autoSave: true } }))
    useFolderSaveStatus.setState({ failed: false })
  })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  it('does not overwrite on mount and debounces rapid edits to the latest saved recipe', async () => {
    renderHook(() => useAutoSave())
    await tick()
    expect(fileSystemStorage.writeFile).not.toHaveBeenCalled()
    change('first')
    change('latest')
    expect(fileSystemStorage.writeFile).not.toHaveBeenCalled()
    await tick()
    expect(fileSystemStorage.writeFile).toHaveBeenCalledTimes(2)
    expect(fileSystemStorage.writeFile).toHaveBeenNthCalledWith(1, 'RECIPES', [{ id: 'latest', name: 'latest' }])
  })

  it('serializes an in-flight write and still writes a return to the initial recipe list', async () => {
    let finish!: () => void
    vi.mocked(fileSystemStorage.writeFile).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    renderHook(() => useAutoSave())
    change('first')
    await tick()
    act(() => useRecipeStore.setState({ recipes: [] }))
    await tick()
    expect(fileSystemStorage.writeFile).toHaveBeenCalledTimes(1)
    await act(async () => { finish(); await Promise.resolve() })
    expect(fileSystemStorage.writeFile).toHaveBeenNthCalledWith(2, 'RECIPES', [])
    expect(fileSystemStorage.writeFile).toHaveBeenCalledTimes(3)
  })

  it('shows failure and clears it after a later successful write', async () => {
    vi.mocked(fileSystemStorage.writeFile).mockRejectedValueOnce(new Error('disk full'))
    renderHook(() => useAutoSave())
    change('first')
    await tick()
    expect(useFolderSaveStatus.getState().failed).toBe(true)
    change('next')
    await tick()
    expect(useFolderSaveStatus.getState().failed).toBe(false)
  })

  it('does not write a pending stale snapshot on unmount', async () => {
    const hook = renderHook(() => useAutoSave())
    change('first')
    hook.unmount()
    await tick()
    expect(fileSystemStorage.writeFile).not.toHaveBeenCalled()
  })
})
