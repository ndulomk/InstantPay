import { FieldWrapper } from './text-field'

interface MoneyInputProps {
  label?: string
  required?: boolean
  error?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

const baseInputCls = (err?: string) =>
  `w-full pl-12 pr-3 py-2.5 text-sm rounded-lg border ${
    err ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
  } bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors`

/**
 * Input numérico com prefixo "Kz" fixo — usar em qualquer campo monetário
 * (preço, custo, valor de recibo, top-up de wallet). Mantém o valor como string
 * bruta (sem máscara) para simplificar validação manual — só decora visualmente.
 */
export const MoneyInput = ({ label, required, error, value, onChange, placeholder = '0,00', disabled }: MoneyInputProps) => (
  <FieldWrapper label={label} required={required} error={error}>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 dark:text-gray-500">Kz</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={baseInputCls(error)}
      />
    </div>
  </FieldWrapper>
)
