export const TEXT_LIMITS = { title: 120, description: 2000 } as const;
export const trimTitle = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
