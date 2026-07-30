export type ApproverSetupUserResponse = {
  id: number;
  name: string;
  email: string;
};

export type ApproverSetupModuleResponse = {
  id: number;
  code: string;
  name: string;
};

export type ApproverSetupModulesResponse = {
  modules: ApproverSetupModuleResponse[];
};

export type ApproverSetupResponse = {
  id: string;
  approverCondition: string;
  type: string;
  status: string;
  level: number | null;
  moduleScope: string;
  validUntil: Date | null;
  approvers: ApproverSetupUserResponse[];
  createdAt: Date;
  updatedAt: Date;
};

export type ApproverSetupsPaginatedResponse = {
  items: ApproverSetupResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CreateApproverSetupResponse = {
  message: string;
  setup: ApproverSetupResponse;
};
