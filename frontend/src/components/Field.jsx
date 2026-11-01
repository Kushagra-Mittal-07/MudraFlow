import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { amountInWords } from '../lib/amountInWords';
import Chip from './Chip';

/**
 * Form Field component
 * Types: text, password, amount, otp, number, select, textarea
 */
export function Field({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  helper,
  error,
  mono = false,
  required = false,
  disabled = false,
  large = false,
  options = [], // for select
  rows = 3,     // for textarea
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  const isPassword = type === 'password';
  const isAmount = type === 'amount';
  const isOtp = type === 'otp';
  const isSelect = type === 'select';
  const isTextarea = type === 'textarea';

  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : (isAmount ? 'number' : (isOtp ? 'text' : type));
  const isMonoInput = mono || isAmount || isOtp;

  return (
    <div className={`mf-field ${className}`}>
      {label && (
        <label htmlFor={inputId} className="mf-label">
          <span>{label} {required && '*'}</span>
        </label>
      )}

      <div className="mf-input-wrapper">
        {isAmount && <span className="mf-input-amount-prefix">₹</span>}

        {isSelect ? (
          <select
            id={inputId}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`mf-input ${error ? 'mf-input-error' : ''}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : isTextarea ? (
          <textarea
            id={inputId}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={`mf-input ${error ? 'mf-input-error' : ''}`}
            style={{ height: 'auto', padding: '10px 14px' }}
            {...props}
          />
        ) : (
          <input
            id={inputId}
            type={effectiveType}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={isOtp ? 6 : undefined}
            className={`mf-input ${isMonoInput ? 'mf-input-mono' : ''} ${
              isAmount ? (large ? 'mf-input-amount mf-input-amount-large' : 'mf-input-amount') : ''
            } ${isOtp ? 'mf-input-otp' : ''} ${error ? 'mf-input-error' : ''}`}
            {...props}
          />
        )}

        {isPassword && (
          <div className="mf-input-chip-right">
            <Chip
              onClick={() => setShowPassword(!showPassword)}
              icon={showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
            >
              {showPassword ? 'Hide' : 'Show'}
            </Chip>
          </div>
        )}
      </div>

      {isAmount && value && !isNaN(value) && parseFloat(value) > 0 && (
        <div className="mf-amount-words">
          {amountInWords(value)}
        </div>
      )}

      {error ? (
        <div className="mf-helper mf-helper-error" role="alert">
          Error: {error}
        </div>
      ) : helper ? (
        <div className="mf-helper">{helper}</div>
      ) : null}
    </div>
  );
}

export default Field;

