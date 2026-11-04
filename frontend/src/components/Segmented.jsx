import React from 'react';

/**
 * Segmented Control (joined buttons row) with WCAG arrow key support
 * Options: [{ value, label, disabled, caption }]
 */
export function Segmented({
  options = [],
  value,
  onChange,
  full = false,
  className = ''
}) {
  const handleKeyDown = (e, currentIndex) => {
    const enabledOptions = options.map((opt, idx) => ({ ...opt, origIdx: idx })).filter(opt => !opt.disabled);
    if (enabledOptions.length === 0) return;

    const currentPos = enabledOptions.findIndex(opt => opt.origIdx === currentIndex);
    let nextPos = -1;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextPos = (currentPos + 1) % enabledOptions.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextPos = (currentPos - 1 + enabledOptions.length) % enabledOptions.length;
    }

    if (nextPos !== -1 && onChange) {
      onChange(enabledOptions[nextPos].value);
    }
  };

  return (
    <div className={`mf-segmented ${full ? 'mf-segmented-full' : ''} ${className}`} role="tablist">
      {options.map((opt, idx) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            disabled={opt.disabled}
            className={`mf-segmented-btn ${isSelected ? 'mf-segmented-btn-selected' : ''}`}
            onClick={() => !opt.disabled && onChange && onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
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

