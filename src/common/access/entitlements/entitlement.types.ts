export type EnabledModulePermission = {
  code: string;
};

export type EnabledModuleRecord = {
  id?: number;
  code: string;
  isActive?: boolean;
  permissions: EnabledModulePermission[];
};

export type EnabledCompanyModuleRecord = {
  moduleId: number;
  module: EnabledModuleRecord;
};

export type CompanyEnabledModulesSource<
  TEnabledModule extends EnabledCompanyModuleRecord =
    EnabledCompanyModuleRecord,
> = {
  company: {
    enabledModules: TEnabledModule[];
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
