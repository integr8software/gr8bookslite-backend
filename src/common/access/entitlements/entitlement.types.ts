export type EnabledModulePermission = {
  code: string;
};

export type EnabledModuleRecord = {
  id?: number;
  code: string;
  isActive?: boolean;
  permissions: EnabledModulePermission[];
};

export type EntitledModuleRecord = {
  moduleId: number;
  module: EnabledModuleRecord;
};

export type PlanModuleEntitlementSource<TEnabledModule extends EntitledModuleRecord = EntitledModuleRecord> = {
  company: {
    subscriptions?: Array<{
      plan: {
        systems: Array<{
          system: {
            modules?: TEnabledModule[];
          };
        }>;
      };
    }>;
  };
};
