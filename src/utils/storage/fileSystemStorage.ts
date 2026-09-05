/**
 * File System Access API를 사용한 로컬 폴더 저장소
 * Chrome/Edge에서만 지원됨
 */

// IndexedDB에 디렉토리 핸들 저장용 DB 이름
const DB_NAME = 'recipe-app-fs'
const STORE_NAME = 'directory-handles'
const HANDLE_KEY = 'data-directory'

// 파일 이름 상수
export const FILE_NAMES = {
  RECIPES: 'recipes.json',
  SETTINGS: 'settings.json',
  PRESETS: 'presets.json'
} as const

export type FileType = keyof typeof FILE_NAMES

// File System Access API 지원 여부 확인
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window
}

// IndexedDB에서 저장된 디렉토리 핸들 가져오기
async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onerror = () => resolve(null)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const getRequest = store.get(HANDLE_KEY)

        getRequest.onsuccess = () => {
          resolve(getRequest.result || null)
        }
        getRequest.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    }
  })
}

// IndexedDB에 디렉토리 핸들 저장
async function storeDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onerror = () => reject(new Error('IndexedDB 열기 실패'))

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      store.put(handle, HANDLE_KEY)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error('핸들 저장 실패'))
    }
  })
}

// IndexedDB에서 디렉토리 핸들 삭제
async function clearDirectoryHandle(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        store.delete(HANDLE_KEY)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => resolve()
      } catch {
        resolve()
      }
    }

    request.onerror = () => resolve()
  })
}

// 권한 확인 및 요청
async function verifyPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<boolean> {
  const options = { mode }

  if ((await handle.queryPermission(options)) === 'granted') {
    return true
  }

  if ((await handle.requestPermission(options)) === 'granted') {
    return true
  }

  return false
}

/**
 * FileSystemStorage 클래스
 * 로컬 폴더에 데이터를 저장하고 불러오는 기능 제공
 */
export class FileSystemStorage {
  private directoryHandle: FileSystemDirectoryHandle | null = null
  private initialized = false

  /**
   * 저장소 초기화 - 이전에 선택한 폴더가 있으면 복원
   */
  async initialize(): Promise<boolean> {
    if (!isFileSystemAccessSupported()) {
      console.log('File System Access API가 지원되지 않습니다.')
      return false
    }

    try {
      const storedHandle = await getStoredDirectoryHandle()
      if (storedHandle) {
        // 자동 복원에서는 권한 창을 띄우지 않는다. 재연결은 사용자 클릭으로 처리한다.
        const hasPermission = await storedHandle.queryPermission({ mode: 'readwrite' }) === 'granted'
        if (hasPermission) {
          this.directoryHandle = storedHandle
          this.initialized = true
          return true
        }
      }
    } catch (error) {
      console.log('저장된 폴더 복원 실패:', error)
    }

    return false
  }

  /**
   * 폴더 선택 다이얼로그 열기
   */
  async selectDirectory(): Promise<string | null> {
    if (!isFileSystemAccessSupported()) {
      throw new Error('이 브라우저에서는 폴더 선택을 지원하지 않습니다. Chrome 또는 Edge를 사용해주세요.')
    }

    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      })

      const hasPermission = await verifyPermission(handle)
      if (!hasPermission) {
        throw new Error('폴더 접근 권한이 거부되었습니다.')
      }

      this.directoryHandle = handle
      this.initialized = true

      // IndexedDB에 핸들 저장 (브라우저 재시작 후 복원용)
      await storeDirectoryHandle(handle)

      return handle.name
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // 사용자가 취소함
        return null
      }
      throw error
    }
  }

  /**
   * 현재 선택된 폴더 이름 가져오기
   */
  getDirectoryName(): string | null {
    return this.directoryHandle?.name || null
  }

  /**
   * 폴더가 선택되어 있는지 확인
   */
  isDirectorySelected(): boolean {
    return this.initialized && this.directoryHandle !== null
  }

  /**
   * 폴더 연결 해제
   */
  async disconnect(): Promise<void> {
    this.directoryHandle = null
    this.initialized = false
    await clearDirectoryHandle()
  }

  /**
   * 파일에 데이터 쓰기
   */
  async writeFile(fileType: FileType, data: any): Promise<void> {
    if (!this.directoryHandle) {
      throw new Error('저장 폴더가 선택되지 않았습니다.')
    }

    const fileName = FILE_NAMES[fileType]

    try {
      const fileHandle = await this.directoryHandle.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()

      const jsonString = JSON.stringify(data, null, 2)
      await writable.write(jsonString)
      await writable.close()
    } catch (error) {
      console.error(`파일 쓰기 실패 (${fileName}):`, error)
      throw new Error(`데이터 저장 실패: ${fileName}`)
    }
  }

  /**
   * 파일에서 데이터 읽기
   */
  async readFile<T>(fileType: FileType): Promise<T | null> {
    if (!this.directoryHandle) {
      return null
    }

    const fileName = FILE_NAMES[fileType]

    try {
      const fileHandle = await this.directoryHandle.getFileHandle(fileName)
      const file = await fileHandle.getFile()
      const content = await file.text()

      return JSON.parse(content) as T
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        // 파일이 없음 - 정상적인 경우
        return null
      }
      console.error(`파일 읽기 실패 (${fileName}):`, error)
      throw new Error(`데이터 불러오기 실패: ${fileName}`)
    }
  }

  /**
   * 파일 존재 여부 확인
   */
  async fileExists(fileType: FileType): Promise<boolean> {
    if (!this.directoryHandle) {
      return false
    }

    const fileName = FILE_NAMES[fileType]

    try {
      await this.directoryHandle.getFileHandle(fileName)
      return true
    } catch {
      return false
    }
  }

  /**
   * 모든 데이터 파일 목록 가져오기
   */
  async listFiles(): Promise<string[]> {
    if (!this.directoryHandle) {
      return []
    }

    const files: string[] = []

    try {
      for await (const entry of this.directoryHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          files.push(entry.name)
        }
      }
    } catch (error) {
      console.error('파일 목록 가져오기 실패:', error)
    }

    return files
  }
}

// 싱글톤 인스턴스
export const fileSystemStorage = new FileSystemStorage()
