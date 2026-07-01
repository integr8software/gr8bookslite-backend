import type { CompanyUnitType } from '@prisma/client';

export interface WorkspaceUserAssignedUnitResponse {
  id: number;
  companyId: number;
  type: CompanyUnitType;
  name: string;
  displayName: string | null;
  isActive: boolean;
}

export interface WorkspaceUserCompanyAssignmentResponse {
  companyId: number;
  unitIds: number[];
  units: WorkspaceUserAssignedUnitResponse[];
}

export interface WorkspaceUserResponse {
  id: number;
  name: string;
  email: string;
  contactNumber: string | null;
  status: string;
  lastLogin: string | null;
  profileImageUrl: string | null;
  companyAssignments: WorkspaceUserCompanyAssignmentResponse[];
  createdAt: Date;
  updatedAt: Date | null;
}
