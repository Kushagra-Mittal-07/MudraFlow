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
  return (
    <div className={`mf-radio-tiles ${className}`} role="radiogroup">
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <div
            key={opt.value}
            role="radio"
            aria-checked={isSelected}
            tabIndex={opt.disabled ? -1 : 0}
            className={`mf-radio-tile ${isSelected ? 'mf-radio-tile-selected' : ''} ${
              opt.disabled ? 'mf-radio-tile-disabled' : ''
            }`}
            onClick={() => !opt.disabled && onChange && onChange(opt.value)}
            onKeyDown={(e) => {
              if ((e.key === ' ' || e.key === 'Enter') && !opt.disabled && onChange) {
                e.preventDefault();
                onChange(opt.value);
              }
            }}
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

