export function getDigitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export function passesLuhnCheck(value: string) {
  let checksum = 0;
  let shouldDouble = false;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);

    if (shouldDouble) {
      digit *= 2;

      if (digit > 9) {
        digit -= 9;
      }
    }

    checksum += digit;
    shouldDouble = !shouldDouble;
  }

  return checksum % 10 === 0;
}

export function detectCardBrand(cardNumber: string) {
  if (/^4/.test(cardNumber)) {
    return 'Visa';
  }

  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(cardNumber)) {
    return 'Mastercard';
  }

  if (/^3[47]/.test(cardNumber)) {
    return 'American Express';
  }

  if (/^6(?:011|5)/.test(cardNumber)) {
    return 'Discover';
  }

  return 'Card';
}
