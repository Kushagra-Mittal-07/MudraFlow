import React from 'react';

/**
 * Stamp component: Large rubber stamp with rotation
 * Variants: green, amber, debit, ink
 */
export function Stamp({
  children,
  variant = 'green',
  className = '',
  ...props
}) {
  const variantClass = `mf-stamp-${variant}`;

  return (
    <div className={`mf-stamp ${variantClass} ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Stamp;

