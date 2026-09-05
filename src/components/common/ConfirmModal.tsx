/**
 * ConfirmModal - 범용 확인 모달 (H5)
 *
 * window.confirm 을 대체하는 접근성 있는 모달. actions 배열 방식이라
 * 2버튼/3버튼(덮어쓰기/사본으로/취소 등)을 모두 표현하고 재사용 가능하다.
 * 프로젝트 모달 컨벤션(fixed inset-0 bg-black/50, surface-paper, lucide) 준수.
 */
import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface ConfirmModalAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'danger' | 'ghost'
}

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message?: string
  actions: ConfirmModalAction[]
}

const VARIANT_CLASS: Record<NonNullable<ConfirmModalAction['variant']>, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600',
  danger: 'bg-danger text-white hover:opacity-90',
  ghost: 'border border-line text-ink hover:bg-surface-muted',
}

export default function ConfirmModal({
  isOpen,
  onClose,
  title,
  message,
  actions,
}: ConfirmModalProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Escape 로 닫기
  useEffect(() => {
    if (!isOpen) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key === 'Tab') {
        const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
        if (!buttons?.length) return
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="bg-surface-paper rounded-lg shadow-xl w-full max-w-md max-h-[90dvh] overflow-auto p-5 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
            <h3 className="text-lg font-semibold text-ink truncate">{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.cancel')}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 -mt-2 hover:bg-surface-muted rounded focus-ring"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {message && (
          <p className="text-sm text-ink-muted whitespace-pre-line mb-5">{message}</p>
        )}

        {/* 모바일: 세로 스택 / 데스크톱: 우측 정렬 가로 배치 */}
        <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap gap-2 sm:justify-end">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              type="button"
              className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-ring ${VARIANT_CLASS[action.variant ?? 'ghost']}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
