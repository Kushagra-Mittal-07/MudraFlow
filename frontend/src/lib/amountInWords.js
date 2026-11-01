// =============================================================================
// MudraFlow: Amount in Words (Indian Numbering System)
// Spec: spec/05-ui.md Section 5
// =============================================================================

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen'
];

const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
];

function convertBelowThousand(n) {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' hundred';
    n %= 100;
    if (n > 0) str += ' ';
  }
  if (n > 0) {
    if (n < 20) {
      str += ONES[n];
    } else {
      const ten = Math.floor(n / 10);
      const unit = n % 10;
      str += TENS[ten] + (unit ? '-' + ONES[unit] : '');
    }
  }
  return str;
}

export function amountInWords(num) {
  if (num === null || num === undefined || isNaN(num)) return '';

  const parsed = parseFloat(num);
  const rounded = Math.round(parsed * 100) / 100;

  if (rounded === 0) {
    return 'Zero rupees only';
  }

  const integerPart = Math.floor(rounded);
  const paisaPart = Math.round((rounded - integerPart) * 100);

  let words = '';

  if (integerPart > 0) {
    let n = integerPart;

    // Crores (>= 1,00,00,000)
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    if (crore > 0) {
      words += (words ? ' ' : '') + convertBelowThousand(crore) + ' crore';
    }

    // Lakhs (>= 1,00,000)
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    if (lakh > 0) {
      words += (words ? ' ' : '') + convertBelowThousand(lakh) + ' lakh';
    }

    // Thousands (>= 1,000)
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    if (thousand > 0) {
      words += (words ? ' ' : '') + convertBelowThousand(thousand) + ' thousand';
    }

    // Remaining below thousand
    if (n > 0) {
      words += (words ? ' ' : '') + convertBelowThousand(n);
    }

    words += (integerPart === 1 ? ' rupee' : ' rupees');
  }

  if (paisaPart > 0) {
    const paisaWords = convertBelowThousand(paisaPart) + (paisaPart === 1 ? ' paisa' : ' paise');
    if (integerPart > 0) {
      words += ' and ' + paisaWords;
    } else {
      words = paisaWords + ' only';
    }
  } else {
    words += ' only';
  }

  // Capitalize first letter
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default amountInWords;

