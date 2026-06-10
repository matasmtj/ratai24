/** Consistent gallery sort: custom order first, then upload time. */
export const IMAGE_DISPLAY_ORDER = [
  { order: 'asc' },
  { createdAt: 'asc' },
  { id: 'asc' },
];

export async function getNextImageOrder(prisma, delegate, foreignKey, foreignId) {
  const result = await delegate.aggregate({
    where: { [foreignKey]: foreignId },
    _max: { order: true },
  });
  return (result._max.order ?? -1) + 1;
}
