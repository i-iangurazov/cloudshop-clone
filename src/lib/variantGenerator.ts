export type VariantGeneratorAttribute = {
  key: string;
  values: string[];
};

export const buildVariantMatrix = (attributes: VariantGeneratorAttribute[]) => {
  if (!attributes.length) {
    return [] as Record<string, string>[];
  }

  if (attributes.some((attr) => attr.values.length === 0)) {
    return [] as Record<string, string>[];
  }

  return attributes.reduce<Record<string, string>[]>(
    (acc, attr) => {
      const next: Record<string, string>[] = [];
      acc.forEach((entry) => {
        attr.values.forEach((value) => {
          next.push({ ...entry, [attr.key]: value });
        });
      });
      return next;
    },
    [{}],
  );
};
