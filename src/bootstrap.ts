import { initializeStorage } from './utils/storage/bootstrap'

// Zustand 스토어가 복원되기 전에 최초 데이터를 준비한다.
try {
  initializeStorage(window.localStorage)
} catch {
  // 저장소 접근이 차단된 브라우저에서도 앱은 실행한다.
}
