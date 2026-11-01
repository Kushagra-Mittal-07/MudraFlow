import React from 'react';

/**
 * Banner component
 * Variants: success, warning, error
 */
export function Banner({
  variant = 'success',
  children,
  action,
  className = ''
}) {
  const variantClass = `mf-banner-${variant}`;

  return (
    <div className={`mf-banner ${variantClass} ${className}`} role={variant === 'error' ? 'alert' : 'status'}>
      <div className="mf-banner-content">
        {children}
      </div>
      {action && (
        <div className="mf-banner-action">
          {action}
        </div>
      )}
    </div>
  );
}

export default Banner;

