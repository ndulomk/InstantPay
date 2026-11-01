import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

const baseInputCls = (err?: string) =>
  `w-full px-3 py-2.5 text-sm rounded-lg border ${
    err ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
  } bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors`

interface FieldWrapperProps {
  label?: string
  required?: boolean
  error?: string
  children: ReactNode
}

/** Envolve label + input + mensagem de erro. Usar por baixo dos campos abaixo se precisares de algo custom. */
export const FieldWrapper = ({ label, required, error, children }: FieldWrapperProps) => (
  <div>
    {label && (
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  required?: boolean
  error?: string
}

/**
 * Input de texto/número/etc com label + erro embutidos. Validação é feita manualmente
 * fora do componente (função `validate()` no form-page) — este é só o átomo visual.
 *
 * Exemplo:
 *   <TextField label="Nome" required value={form.name} onChange={e => setForm(p=>({...p, name: e.target.value}))} error={errors.name} />
 */
export const TextField = ({ label, required, error, className = '', ...rest }: TextFieldProps) => (
  <FieldWrapper label={label} required={required} error={error}>
    <input className={`${baseInputCls(error)} ${className}`} {...rest} />
  </FieldWrapper>
)

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  required?: boolean
  error?: string
}

export const TextAreaField = ({ label, required, error, className = '', rows = 3, ...rest }: TextAreaFieldProps) => (
  <FieldWrapper label={label} required={required} error={error}>
    <textarea rows={rows} className={`${baseInputCls(error)} resize-none ${className}`} {...rest} />
  </FieldWrapper>
)

interface SelectOption {
  value: string | number
  label: string
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  required?: boolean
  error?: string
  placeholder?: string
  options?: SelectOption[]
  children?: ReactNode
}

export const SelectField = ({ label, required, error, placeholder, options, className = '', children, ...rest }: SelectFieldProps) => (
  <FieldWrapper label={label} required={required} error={error}>
    <select className={`${baseInputCls(error)} ${className}`} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options
        ? options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))
        : children}
    </select>
  </FieldWrapper>
)
