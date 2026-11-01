import React from 'react';

/**
 * Chip component (small action button: SHOW, HIDE, VIEW, COPY)
 */
export function Chip({
  children,
  active = false,
  icon = null,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`mf-chip ${active ? 'mf-chip-active' : ''} ${className}`}
      disabled={disabled}
      type="button"
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export default Chip;

