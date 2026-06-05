export interface WorkspaceUserCompanyAssignmentResponse {
  companyId: number;
  unitIds: number[];
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
  updatedAt: Date;
}
