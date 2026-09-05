/** 브라우저 저장본의 변경을 연결한 폴더에 순서대로 백업한다. */
import { useEffect, useMemo, useRef } from 'react'
import { create } from 'zustand'
import { useRecipeStore } from '@/stores/useRecipeStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { fileSystemStorage } from '@/utils/storage/fileSystemStorage'

export const useFolderSaveStatus = create<{ failed: boolean }>(() => ({ failed: false }))

export function useAutoSave() {
  const recipes = useRecipeStore(state => state.recipes)
  const { storage, pan, product, yieldLoss, method, environment, ingredient, advanced } = useSettingsStore()
  const recipesJson = useMemo(() => JSON.stringify(recipes), [recipes])
  const settingsJson = useMemo(() => JSON.stringify({ pan, product, yieldLoss, method, environment, ingredient, advanced }),
    [pan, product, yieldLoss, method, environment, ingredient, advanced])
  const baseline = useRef({ recipesJson, settingsJson, directory: storage.directoryName })
  const queue = useRef(Promise.resolve())
  const writing = useRef(false)

  useEffect(() => {
    // 앱 시작·폴더 교체만으로 기존 백업을 덮어쓰지 않는다.
    if (storage.type !== 'filesystem' || !storage.autoSave || baseline.current.directory !== storage.directoryName) {
      baseline.current = { recipesJson, settingsJson, directory: storage.directoryName }
      useFolderSaveStatus.setState({ failed: false })
      return
    }
    if (!writing.current && baseline.current.recipesJson === recipesJson && baseline.current.settingsJson === settingsJson) return
    let cancelled = false
    const timer = setTimeout(() => {
      queue.current = queue.current.then(async () => {
        if (cancelled) return
        writing.current = true
        try {
          if (!fileSystemStorage.isDirectorySelected() && !await fileSystemStorage.initialize()) {
            if (!cancelled) useFolderSaveStatus.setState({ failed: true })
            return
          }
          if (cancelled) return
          await fileSystemStorage.writeFile('RECIPES', JSON.parse(recipesJson))
          if (cancelled) return
          await fileSystemStorage.writeFile('SETTINGS', JSON.parse(settingsJson))
          if (cancelled) return
          baseline.current = { recipesJson, settingsJson, directory: storage.directoryName }
          useFolderSaveStatus.setState({ failed: false })
          useSettingsStore.getState().updateLastSaved()
        } catch {
          if (!cancelled) useFolderSaveStatus.setState({ failed: true })
        } finally {
          writing.current = false
        }
      })
    }, 2000)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [recipesJson, settingsJson, storage.type, storage.autoSave, storage.directoryName])
}
