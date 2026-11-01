import { useRef } from 'react'
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline'

interface ImageDropzoneProps {
  onFiles: (files: FileList | null) => void
  uploading?: boolean
  label?: string
  hint?: string
  accept?: string
  multiple?: boolean
}

/**
 * Zona de drag-and-drop + click-to-upload. Não sabe nada de preview/grid —
 * combinar com `image-grid.tsx` por cima para o gestor de imagens de um módulo.
 */
export const ImageDropzone = ({
  onFiles,
  uploading = false,
  label = 'Clica ou arrasta imagens aqui',
  hint = 'PNG, JPG, WEBP — máx. 5MB',
  accept = 'image/jpeg,image/png,image/webp',
  multiple = true,
}: ImageDropzoneProps) => {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onClick={() => fileRef.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); onFiles(e.dataTransfer.files) }}
      className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-all"
    >
      <ArrowUpTrayIcon className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{uploading ? 'A carregar...' : label}</p>
      <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{hint}</p>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={e => onFiles(e.target.files)}
      />
    </div>
  )
}
