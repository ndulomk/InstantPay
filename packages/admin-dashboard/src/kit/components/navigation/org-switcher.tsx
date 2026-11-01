import { useState, useRef, useEffect } from 'react'
import { IoBusinessOutline, IoCheckmarkOutline, IoChevronDownOutline } from 'react-icons/io5'
import { useOrgSwitch } from '@/hooks/use-org-switch'

export function OrgSwitcher() {
  const { memberships, activeMembership, switchOrg, switching, isLoading } = useOrgSwitch()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (isLoading || memberships.length <= 1) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <IoBusinessOutline className="w-4 h-4 shrink-0 text-gray-400" />
        <span className="flex-1 truncate text-left">
          {activeMembership?.orgName ?? 'Selecionar organização'}
        </span>
        <IoChevronDownOutline className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 py-1.5 z-50">
          {memberships.map(m => (
            <button
              key={m.orgId}
              onClick={() => {
                switchOrg(m.orgId)
                setOpen(false)
              }}
              disabled={switching}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <div className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400 shrink-0">
                {m.orgName.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 truncate text-left">{m.orgName}</span>
              {m.orgId === activeMembership?.orgId && (
                <IoCheckmarkOutline className="w-4 h-4 text-blue-600 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
