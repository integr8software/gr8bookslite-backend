import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import type { AiToolAuthorizerService } from './ai-tool-authorizer.service';
import { AiToolExecutorService } from './ai-tool-executor.service';
import { AiToolRegistry } from './ai-tool.registry';

describe('AiToolExecutorService', () => {
  const user = { id: 42 } as AuthUser;

  function createService(allowed = true, denialMessage?: string) {
    const authorizeMock = jest.fn().mockReturnValue({ allowed, denialMessage });
    const toolAuthorizer = {
      authorize: authorizeMock,
    } as unknown as AiToolAuthorizerService;

    return {
      service: new AiToolExecutorService(new AiToolRegistry(), toolAuthorizer),
      authorizeMock,
    };
  }

  it('returns the canonical open action for an authorized module command', () => {
    const { service, authorizeMock } = createService();

    expect(service.executeModuleCommand(user, { type: 'module_command', moduleCode: 'SI', command: 'open' })).toEqual({
      action: {
        type: 'module_command',
        moduleCode: 'SI',
        command: 'open',
        label: 'Sales Invoice',
      },
    });
    expect(authorizeMock).toHaveBeenCalledWith(user, 'SI', PermissionAction.VIEW);
  });

  it.each([
    [{ type: 'message', moduleCode: 'SI', command: 'open' }],
    [{ type: 'module_command', moduleCode: 12, command: 'open' }],
    [{ type: 'module_command', moduleCode: 'SI', command: 'delete' }],
  ])('ignores malformed command candidates', (candidate) => {
    const { service, authorizeMock } = createService();

    expect(service.executeModuleCommand(user, candidate)).toEqual({ action: null });
    expect(authorizeMock).not.toHaveBeenCalled();
  });

  it('rejects module codes outside the Neo AI catalog', () => {
    const { service, authorizeMock } = createService();

    expect(service.executeModuleCommand(user, { type: 'module_command', moduleCode: 'UNKNOWN', command: 'open' })).toEqual({
      action: null,
      denialMessage: 'That module is not available to Neo AI.',
    });
    expect(authorizeMock).not.toHaveBeenCalled();
  });

  it('preserves the authorization denial and does not emit an action', () => {
    const denialMessage = 'You do not have permission to view Sales Invoice.';
    const { service } = createService(false, denialMessage);

    expect(service.executeModuleCommand(user, { type: 'module_command', moduleCode: 'SI', command: 'open' })).toEqual({
      action: null,
      denialMessage,
    });
  });
});
