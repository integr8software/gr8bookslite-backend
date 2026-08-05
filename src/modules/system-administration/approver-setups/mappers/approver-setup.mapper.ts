import { ApproverSetupResponse } from '../types/approver-setup-response.type';

type ApproverSetupPayload = {
  id: string;
  approverCondition: ApproverSetupResponse['approverCondition'];
  type: ApproverSetupResponse['type'];
  status: ApproverSetupResponse['status'];
  level: number | null;
  moduleScope: string;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  approvers: Array<{
    user: {
      id: number;
      name: string;
      email: string;
    };
  }>;
};

export function mapApproverSetup(payload: ApproverSetupPayload): ApproverSetupResponse {
  return {
    id: payload.id,
    approverCondition: payload.approverCondition,
    type: payload.type,
    status: payload.status,
    level: payload.level,
    moduleScope: payload.moduleScope,
    validUntil: payload.validUntil,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    approvers: payload.approvers.map(({ user }) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    })),
  };
}
