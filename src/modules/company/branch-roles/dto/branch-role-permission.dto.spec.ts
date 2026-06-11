import { validate } from 'class-validator';
import { BranchRolePermissionDto } from './branch-role-permission.dto';

describe('BranchRolePermissionDto', () => {
  it('accepts a one-character abbreviated permission code', async () => {
    const dto = Object.assign(new BranchRolePermissionDto(), {
      permissionCode: 'I',
      actions: ['view'],
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });
});
