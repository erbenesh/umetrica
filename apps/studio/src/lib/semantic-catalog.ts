export type SemanticCubeStatus = 'published' | 'draft' | 'soon';

export const PLANNED_SEMANTIC_CUBES = [
  {
    id: 'Customers',
    name: 'Customers',
    subtitle: 'Планируется · клиенты',
    status: 'soon' as const,
  },
  {
    id: 'Products',
    name: 'Products',
    subtitle: 'Планируется · каталог',
    status: 'soon' as const,
  },
];

export function formatSemanticUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function semanticStatusTag(status: SemanticCubeStatus) {
  if (status === 'published') return 'db-tag db-tag--green';
  if (status === 'draft') return 'db-tag db-tag--blue';
  return 'db-tag db-tag--gray';
}

export function semanticStatusLabel(status: SemanticCubeStatus) {
  if (status === 'published') return 'Опубликован';
  if (status === 'draft') return 'Черновик';
  return 'Скоро';
}
