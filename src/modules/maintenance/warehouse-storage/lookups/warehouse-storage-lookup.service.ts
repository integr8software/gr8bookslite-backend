import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';

@Injectable()
export class WarehouseStorageLookupService {
  findOptionsForCompanyUser(user: AuthUser) {
    return {
      companyId: user.companyId,
      warehouseStorage: [],
    };
  }
}
