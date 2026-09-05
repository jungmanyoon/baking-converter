/**
 * Toast Container Component
 * Renders all active toasts in a fixed position
 */

import React from 'react'
import { useToastStore } from '@stores/useToastStore'
import { Toast } from './Toast'

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)
  const pauseToast = useToastStore((state) => state.pauseToast)
  const resumeToast = useToastStore((state) => state.resumeToast)

  if (toasts.length === 0) {
    return null
  }

  return (
    <div
      // 접근성: 알림 "영역" 표식만 유지. 실제 낭독(aria-live)은 개별 Toast가 담당
      // (일반=polite / error=assertive를 Toast에서 직접 지정 → 컨테이너 중복 live region 제거)
      role="region"
      aria-label="알림"
      className="toast-stack fixed z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            toast={toast}
            onDismiss={removeToast}
            onPause={pauseToast}
            onResume={resumeToast}
          />
        </div>
      ))}
    </div>
  )
}
