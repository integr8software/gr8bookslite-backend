export const ResponsibilityCenterInclude = {
  parent: true,
  type: {
    include: {
      classification: true,
    },
  },
} as const;
