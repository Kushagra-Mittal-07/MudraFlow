import React from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * Button component
 * Variants: primary, secondary, danger, danger-solid, link
 */
export function Button({
  children,
  variant = 'primary',
  arrow = false,
  full = false,
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const variantClass = `mf-btn-${variant}`;
  const fullClass = full ? 'mf-btn-full' : '';

  return (
    <button
      className={`mf-btn ${variantClass} ${fullClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Processing…' : children}
      {arrow && !loading && <ArrowRight size={16} strokeWidth={2} />}
    </button>
  );
}

export default Button;

