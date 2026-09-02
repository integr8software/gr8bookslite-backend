export const AiModuleTools = {
  EXPLAIN: 'module.explain',
  OPEN: 'module.open',
  PURCHASE_REQUEST_PREPARE: 'purchase-request.prepare',
  TERMS_FILTER: 'terms.filter',
  TERMS_PREPARE: 'terms.prepare',
  TERMS_SEARCH: 'terms.search',
  TERMS_UPDATE_PREVIEW: 'terms.update-preview',
} as const;

export type AiModuleToolName = (typeof AiModuleTools)[keyof typeof AiModuleTools];

export type AiModuleProfile = {
  moduleCode: string;
  name: string;
  area: string;
  summary: string;
  aliases: readonly string[];
  knowledgeLevel: 'overview' | 'detailed';
  tools: readonly AiModuleToolName[];
};

export type AiModuleProfileInput = Omit<AiModuleProfile, 'aliases' | 'knowledgeLevel' | 'tools'> & {
  aliases?: readonly string[];
  knowledgeLevel?: AiModuleProfile['knowledgeLevel'];
  tools?: readonly AiModuleToolName[];
};
