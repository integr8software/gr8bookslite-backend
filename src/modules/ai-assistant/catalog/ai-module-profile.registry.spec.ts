import { ModuleCatalog } from '../../../../prisma/seeds/moduleCatalog';
import { AiModuleProfiles, findAiModuleProfile, normalizeSearchText } from './ai-module-profile.registry';
import { AiToolRegistry } from '../tools/ai-tool.registry';

describe('AiModuleProfileRegistry', () => {
  it('has exactly one profile for every backend module catalog entry', () => {
    const catalogCodes = ModuleCatalog.map((module) => module.code).sort();
    const profileCodes = AiModuleProfiles.map((profile) => profile.moduleCode).sort();

    expect(profileCodes).toEqual(catalogCodes);
    expect(new Set(profileCodes).size).toBe(profileCodes.length);
  });

  it('does not reuse a normalized alias across different modules', () => {
    const aliasOwners = new Map<string, string>();

    for (const profile of AiModuleProfiles) {
      for (const alias of profile.aliases) {
        const normalizedAlias = normalizeSearchText(alias);
        const existingOwner = aliasOwners.get(normalizedAlias);

        expect(existingOwner === undefined || existingOwner === profile.moduleCode).toBe(true);
        aliasOwners.set(normalizedAlias, profile.moduleCode);
      }
    }
  });

  it('references only registered tools', () => {
    const toolRegistry = new AiToolRegistry();

    for (const profile of AiModuleProfiles) {
      for (const tool of profile.tools) {
        expect(toolRegistry.has(tool)).toBe(true);
      }
    }
  });

  it('matches the most specific module when names overlap', () => {
    expect(findAiModuleProfile('open cash advance multiple entry')?.moduleCode).toBe('CAME');
    expect(findAiModuleProfile('explain petty cash replenishment')?.moduleCode).toBe('PCR');
  });

  it('does not treat ambiguous single-word module codes as general language', () => {
    expect(findAiModuleProfile('what can you do?')).toBeUndefined();
    expect(findAiModuleProfile('show this or explain it')).toBeUndefined();
  });
});
