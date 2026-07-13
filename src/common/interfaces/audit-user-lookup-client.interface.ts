export type AuditUserLookupClient = {
  user: {
    findMany(args: {
      where: { id: { in: number[] } };
      select: { id: true; name: true };
    }): Promise<Array<{ id: number; name: string }>>;
  };
};
