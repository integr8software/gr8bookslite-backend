import { AiModuleProfile, AiModuleProfileInput, AiModuleTools } from '../ai-module-profile.types';

const AmbiguousModuleCodeAliases = new Set(['I', 'B', 'U', 'DO', 'OR', 'AR', 'AM', 'AT', 'SO']);

export function defineAiModuleProfiles(profiles: readonly AiModuleProfileInput[]): readonly AiModuleProfile[] {
  return profiles.map((profile) => ({
    ...profile,
    aliases: [...new Set([profile.name, ...(AmbiguousModuleCodeAliases.has(profile.moduleCode) ? [] : [profile.moduleCode]), ...(profile.aliases ?? [])])],
    knowledgeLevel: profile.knowledgeLevel ?? 'overview',
    tools: profile.tools ?? [AiModuleTools.EXPLAIN, AiModuleTools.OPEN],
  }));
}
