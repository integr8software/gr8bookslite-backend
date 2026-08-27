import { ModuleSystemsService } from './module-systems.service';

describe('ModuleSystemsService', () => {
  let service: ModuleSystemsService;
  let prisma: {
    moduleSystem: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      moduleSystem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };
    service = new ModuleSystemsService(prisma as never);
  });

  it('autogenerates system code from name when code is omitted during creation', async () => {
    prisma.moduleSystem.findUnique.mockResolvedValue(null);
    prisma.moduleSystem.create.mockImplementation((args) => ({
      id: 5,
      code: args.data.code,
      name: args.data.name,
      description: args.data.description,
      sortOrder: args.data.sortOrder,
      isActive: args.data.isActive,
      modules: [],
      sidebarItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await service.createSystem({
      name: 'Inventory and POS',
      description: 'POS modules',
      sortOrder: 1,
      isActive: true,
    });

    expect(prisma.moduleSystem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'INVENTORY_AND_POS',
          name: 'Inventory and POS',
        }),
      }),
    );
    expect(result.system.code).toBe('INVENTORY_AND_POS');
  });

  it('retains existing system code when code is not updated', async () => {
    prisma.moduleSystem.findUnique.mockResolvedValue({
      id: 5,
      code: 'EXISTING_CODE',
      name: 'Old Name',
      description: null,
      sortOrder: 0,
      isActive: true,
      modules: [],
      sidebarItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.moduleSystem.update.mockImplementation((args) => ({
      id: 5,
      code: args.data.code,
      name: args.data.name,
      description: args.data.description,
      sortOrder: args.data.sortOrder,
      isActive: args.data.isActive,
      modules: [],
      sidebarItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await service.updateSystem(5, {
      name: 'Updated Name',
      description: 'Updated Description',
    });

    expect(prisma.moduleSystem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'EXISTING_CODE',
          name: 'Updated Name',
        }),
      }),
    );
    expect(result.system.code).toBe('EXISTING_CODE');
  });
});
