export type EnabledModulePermission = {
  code: string;
};

export type EnabledModuleRecord = {
  code: string;
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
  };
};
