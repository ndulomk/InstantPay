import { PhotoIcon, TrashIcon, StarIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { EmptyState } from '../feedback/empty-state'

export interface ImageGridItem {
  id: string
  url: string
  alt?: string | null
  isCover?: boolean
}

interface ImageGridProps {
  images: ImageGridItem[]
  onSetCover?: (imageId: string) => void
  onRemove: (imageId: string) => void
  removingId?: string | null
  settingCoverId?: string | null
  emptyLabel?: string
}

/**
 * Grid de imagens com hover actions (definir como capa / remover) — usado no gestor
 * de imagens de produtos, artigos de wiki, logos de empresas, etc.
 * Combinar com `image-dropzone.tsx` acima para formar o "ImageManager" completo do módulo.
 */
export const ImageGrid = ({
  images,
  onSetCover,
  onRemove,
  removingId = null,
  settingCoverId = null,
  emptyLabel = 'Sem imagens ainda',
}: ImageGridProps) => {
  if (images.length === 0) {
    return <EmptyState icon={PhotoIcon} title={emptyLabel} bordered={false} />
  }

  const sorted = [...images]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {sorted.map(img => (
        <div
          key={img.id}
          className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 aspect-square bg-gray-50 dark:bg-gray-800"
        >
          <img src={img.url} alt={img.alt ?? ''} className="w-full h-full object-cover" />
          {img.isCover && (
            <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              <StarSolid className="w-2.5 h-2.5" /> Capa
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {onSetCover && !img.isCover && (
              <button
                onClick={() => onSetCover(img.id)}
                disabled={settingCoverId === img.id}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <StarIcon className="w-4 h-4 text-white" />
              </button>
            )}
            <button
              onClick={() => onRemove(img.id)}
              disabled={removingId === img.id}
              className="p-1.5 bg-red-500/80 hover:bg-red-600 rounded-lg transition-colors"
            >
              <TrashIcon className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
