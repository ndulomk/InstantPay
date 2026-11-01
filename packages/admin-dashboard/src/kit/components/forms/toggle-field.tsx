interface ToggleFieldProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/**
 * Switch on/off com label + descrição, usado em forms (Ativo, Em Stock, etc).
 * Empilhar dentro de um container `divide-y` (ver exemplo abaixo).
 *
 * Exemplo:
 *   <div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-4 divide-y divide-gray-200 dark:divide-gray-800">
 *     <ToggleField label="Produto Ativo" description="Visível na loja pública" checked={form.isActive} onChange={v => setForm(p => ({...p, isActive: v}))} />
 *   </div>
 */
export const ToggleField = ({ label, description, checked, onChange }: ToggleFieldProps) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
)
