const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]+/g;
const TRIM_DASH_PATTERN = /^-+|-+$/g;

export function buildCompanyDisplayName(input: {
  taxpayerType: 'INDIVIDUAL' | 'NON_INDIVIDUAL';
  companyName: string | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
}) {
  if (
    input.taxpayerType === 'NON_INDIVIDUAL' &&
    input.companyName &&
    input.companyName.trim().length > 0
  ) {
    return input.companyName.trim();
  }

  const ownerName = [input.ownerFirstName, input.ownerLastName]
    .filter((value): value is string =>
      Boolean(value && value.trim().length > 0),
    )
    .map((value) => value.trim())
    .join(' ');

  return ownerName || 'New Company';
}

export function buildSlugBase(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_PATTERN, '-')
    .replace(TRIM_DASH_PATTERN, '');

  return normalized || 'company';
}

export function getTrialEndsAt(startDate: Date, trialDays: number) {
  const trialEndsAt = new Date(startDate);
  trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + trialDays);

  return trialEndsAt;
}
