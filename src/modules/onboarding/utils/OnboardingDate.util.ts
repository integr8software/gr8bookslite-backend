function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

export function getOnboardingDateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { date, year, month, day };
}

export function isValidOnboardingDateValue(value: string) {
  return Boolean(getOnboardingDateParts(value));
}

export function getSyncedReportEndDate(startDate: string) {
  const start = getOnboardingDateParts(startDate);

  if (!start) {
    return '';
  }

  const endDate = new Date(start.date);
  endDate.setFullYear(endDate.getFullYear() + 1);
  endDate.setDate(endDate.getDate() - 1);

  return `${endDate.getFullYear()}-${padDatePart(
    endDate.getMonth() + 1,
  )}-${padDatePart(endDate.getDate())}`;
}
