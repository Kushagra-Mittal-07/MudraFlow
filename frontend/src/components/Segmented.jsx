import React from 'react';

/**
 * Segmented Control (joined buttons row)
 * Options: [{ value, label, disabled, caption }]
 */
export function Segmented({
  options = [],
  value,
  onChange,
  full = false,
  className = ''
}) {
  return (
    <div className={`mf-segmented ${full ? 'mf-segmented-full' : ''} ${className}`} role="tablist">
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            disabled={opt.disabled}
            className={`mf-segmented-btn ${isSelected ? 'mf-segmented-btn-selected' : ''}`}
            onClick={() => !opt.disabled && onChange && onChange(opt.value)}
            title={opt.disabled ? opt.caption : undefined}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default Segmented;

