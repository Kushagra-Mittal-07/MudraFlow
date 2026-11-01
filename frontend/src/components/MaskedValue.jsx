import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { maskAccountNumber, formatMoney } from '../lib/format';
import { amountInWords } from '../lib/amountInWords';
import Chip from './Chip';

/**
 * MaskedValue component
 * type: 'account' | 'balance'
 */
export function MaskedValue({
  type = 'account',
  value,
  fullValue, // full account number or real balance
  label = '',
  large = false,
  className = ''
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto re-mask account number after 10 seconds
  useEffect(() => {
    let timer;
    if (type === 'account' && revealed) {
      timer = setTimeout(() => {
        setRevealed(false);
      }, 10000);
    }
    return () => clearTimeout(timer);
  }, [type, revealed]);

  // Copy handler
  const handleCopy = () => {
    const textToCopy = String(fullValue || value);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (type === 'balance') {
    return (
      <div className={`mf-masked-balance ${className}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          {label && <span className="mf-label" style={{ marginBottom: 0 }}>{label}</span>}
          <Chip
            onClick={() => setRevealed(!revealed)}
            aria-pressed={revealed}
            icon={revealed ? <EyeOff size={11} /> : <Eye size={11} />}
          >
            {revealed ? 'Hide' : 'Show'}
          </Chip>
        </div>

        <div className="mf-money-big">
          {revealed ? (
            <>
              <span className="mf-money-big-rupees">{formatMoney(value).split('.')[0]}</span>
              <span className="mf-money-big-paise">.{formatMoney(value).split('.')[1]}</span>
            </>
          ) : (
            <>
              <span className="mf-money-big-rupees">₹ ••,••,•••</span>
              <span className="mf-money-big-paise">.••</span>
            </>
          )}
        </div>

        {revealed && value !== undefined && value !== null && (
          <div className="mf-amount-words" style={{ marginTop: '4px' }}>
            {amountInWords(value)}
          </div>
        )}
      </div>
    );
  }

  // Account number variant
  const displayAccount = revealed ? (fullValue || value) : maskAccountNumber(value);

  return (
    <div className={`mf-masked-wrapper ${className}`}>
      <span className={large ? 'mf-masked-account-large' : 'mf-masked-text'}>
        {displayAccount}
      </span>
      <Chip
        onClick={() => setRevealed(!revealed)}
        icon={revealed ? <EyeOff size={11} /> : <Eye size={11} />}
      >
        {revealed ? 'Hide' : 'View'}
      </Chip>
      <Chip
        onClick={handleCopy}
        icon={copied ? <Check size={11} /> : <Copy size={11} />}
      >
        {copied ? 'Copied' : 'Copy'}
      </Chip>
    </div>
  );
}

export default MaskedValue;

