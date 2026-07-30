import { TermDateMode } from '@prisma/client';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { TermsLookupService } from './lookups/terms-lookup.service';
import { TermsMaintenanceController } from './terms-maintenance.controller';
import { TermsMaintenanceService } from './terms-maintenance.service';

describe('TermsMaintenanceController', () => {
  const termsMaintenanceService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    importTerms: jest.fn(),
    update: jest.fn(),
  };
  const termsLookupService = {
    findOptionsForCompanyUser: jest.fn(),
  };
  const controller = new TermsMaintenanceController(
    termsMaintenanceService as unknown as TermsMaintenanceService,
    termsLookupService as unknown as TermsLookupService,
  );
  const user = { id: 1, companyId: 2 } as AuthUser;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates generic term options to the lookup service', async () => {
    const query = {
      search: 'net',
      dateMode: TermDateMode.DAY,
    };
    const response = {
      terms: [
        {
          id: '1',
          name: 'Net 30',
          dateMode: TermDateMode.DAY,
          period: 30,
          status: 'ACTIVE',
        },
      ],
    };

    termsLookupService.findOptionsForCompanyUser.mockResolvedValue(response);

    await expect(controller.findOptions(user, query)).resolves.toBe(response);
    expect(termsLookupService.findOptionsForCompanyUser).toHaveBeenCalledWith(user, query);
    expect(termsMaintenanceService.findAll).not.toHaveBeenCalled();
  });

  it('keeps full list requests on the maintenance service', async () => {
    const query = { search: 'net' };
    const response = {
      terms: [],
      statistics: {},
      pagination: {},
      permissions: {},
    };

    termsMaintenanceService.findAll.mockResolvedValue(response);

    await expect(controller.findAll(user, query)).resolves.toBe(response);
    expect(termsMaintenanceService.findAll).toHaveBeenCalledWith(user, query);
    expect(termsLookupService.findOptionsForCompanyUser).not.toHaveBeenCalled();
  });
});
