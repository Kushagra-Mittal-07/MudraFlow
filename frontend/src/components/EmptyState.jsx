import React from 'react';

/**
 * EmptyState component
 * Props:
 * - title: string
 * - description: string
 * - action: ReactNode (e.g. Button)
 */
export function EmptyState({
  title,
  description,
  action,
  className = ''
}) {
  return (
    <div className={`mf-empty-state ${className}`}>
      {title && <h3 className="mf-empty-title">{title}</h3>}
      {description && <p className="mf-empty-desc">{description}</p>}
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
}

export default EmptyState;

