import React from 'react';

/**
 * RadioTiles: Choice tiles with title, caption, dot indicator
 * Options: [{ value, title, caption, disabled }]
 */
export function RadioTiles({
  options = [],
  value,
  onChange,
  className = ''
}) {
  const handleKeyDown = (e, opt, idx) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!opt.disabled && onChange) onChange(opt.value);
      return;
    }

    const enabledOptions = options.map((o, i) => ({ ...o, origIdx: i })).filter(o => !o.disabled);
    if (enabledOptions.length === 0) return;
    const currentPos = enabledOptions.findIndex(o => o.origIdx === idx);
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
    <div className={`mf-radio-tiles ${className}`} role="radiogroup">
      {options.map((opt, idx) => {
        const isSelected = opt.value === value;
        return (
          <div
            key={opt.value}
            role="radio"
            aria-checked={isSelected}
            tabIndex={opt.disabled ? -1 : (isSelected ? 0 : -1)}
            className={`mf-radio-tile ${isSelected ? 'mf-radio-tile-selected' : ''} ${
              opt.disabled ? 'mf-radio-tile-disabled' : ''
            }`}
            onClick={() => !opt.disabled && onChange && onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, opt, idx)}
          >
            <div className="mf-radio-tile-title">
              {isSelected && <span className="mf-radio-tile-dot" />}
              {opt.title}
            </div>
            {opt.caption && (
              <div className="mf-radio-tile-caption">{opt.caption}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default RadioTiles;

