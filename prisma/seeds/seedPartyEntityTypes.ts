import { PartyClassification, PartyStatus } from '@prisma/client';
import { prisma } from './prismaClient';

type PartyEntityTypeSeedRow = {
  classification: PartyClassification;
  description: string;
  isGovernment: boolean;
  name: string;
  sortOrder: number;
};

const PartyEntityTypeSeedRows: PartyEntityTypeSeedRow[] = [
  {
    name: 'Individual / Sole Proprietor',
    description: 'A person operating a business under their own name or registered trade name',
    classification: PartyClassification.INDIVIDUAL,
    isGovernment: false,
    sortOrder: 10,
  },
  {
    name: 'Partnership',
    description: 'A business owned by two or more partners',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: false,
    sortOrder: 20,
  },
  {
    name: 'Corporation',
    description: 'A registered stock or non-stock corporation',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: false,
    sortOrder: 30,
  },
  {
    name: 'Cooperative',
    description: 'A member-owned and member-managed organization',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: false,
    sortOrder: 40,
  },
  {
    name: 'Government Agency',
    description: 'National government department, bureau, commission, or office',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: true,
    sortOrder: 50,
  },
  {
    name: 'Local Government Unit',
    description: 'Province, city, municipality, or barangay',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: true,
    sortOrder: 60,
  },
  {
    name: 'Government-Owned or Controlled Corporation',
    description: 'A corporation owned or controlled by the government',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: true,
    sortOrder: 70,
  },
  {
    name: 'NGO / Non-Government Organization',
    description: 'A private organization established for social, humanitarian, or development purposes',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: true,
    sortOrder: 80,
  },
  {
    name: 'Nonprofit Organization',
    description: 'An organization that does not distribute profits to owners or members',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: false,
    sortOrder: 90,
  },
  {
    name: 'Foundation',
    description: 'A nonprofit entity commonly established for charitable or social programs',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: false,
    sortOrder: 100,
  },
  {
    name: 'Educational Institution',
    description: 'School, college, university, or training institution',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: false,
    sortOrder: 110,
  },
  {
    name: 'Religious Organization',
    description: 'Church, ministry, religious order, or faith-based institution',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: false,
    sortOrder: 120,
  },
  {
    name: 'Healthcare Institution',
    description: 'Hospital, clinic, laboratory, or medical institution',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: false,
    sortOrder: 130,
  },
  {
    name: 'Foreign Company',
    description: 'A vendor registered outside the Philippines',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: false,
    sortOrder: 140,
  },
  {
    name: 'International Organization',
    description: 'Organizations such as development agencies or intergovernmental bodies',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: false,
    sortOrder: 150,
  },
  {
    name: 'Professional / Freelancer',
    description: 'An independent consultant, lawyer, accountant, engineer, artist, or similar professional',
    classification: PartyClassification.INDIVIDUAL,
    isGovernment: false,
    sortOrder: 160,
  },
  {
    name: 'Association',
    description: 'A professional, trade, community, or membership-based organization',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: false,
    sortOrder: 170,
  },
  {
    name: 'Other',
    description: 'Used when no standard classification applies',
    classification: PartyClassification.NON_INDIVIDUAL,
    isGovernment: false,
    sortOrder: 180,
  },
];

export async function seedPartyEntityTypes() {
  for (const row of PartyEntityTypeSeedRows) {
    await prisma.partyEntityType.upsert({
      where: { name: row.name },
      update: {
        classification: row.classification,
        description: row.description,
        isGovernment: row.isGovernment,
        sortOrder: row.sortOrder,
        status: PartyStatus.ACTIVE,
      },
      create: {
        ...row,
        status: PartyStatus.ACTIVE,
      },
    });
  }

  console.log(`Party entity type seed checked ${PartyEntityTypeSeedRows.length} rows.`);
}
