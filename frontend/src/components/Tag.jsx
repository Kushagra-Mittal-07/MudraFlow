import React from 'react';

/**
 * Status Tag: Small flat tag for tables and lists
 * Statuses: PENDING, REQUESTED, APPROVED, ACTIVE, SUCCESSFUL, PAID, CREDITED, LOCKED, REJECTED, FROZEN, MATURED, STAFF
 */
export function Tag({
  status = 'ACTIVE',
  children,
  className = '',
  ...props
}) {
  const norm = String(status).toUpperCase();

  let variant = 'active';
  let hasDot = false;

  if (norm === 'PENDING' || norm === 'REQUESTED') {
    variant = 'pending';
    hasDot = true;
  } else if (['APPROVED', 'ACTIVE', 'SUCCESSFUL', 'PAID', 'CREDITED', 'LOCKED'].includes(norm)) {
    variant = 'approved';
  } else if (norm === 'REJECTED' || norm === 'FROZEN') {
    variant = 'rejected';
  } else if (norm === 'MATURED') {
    variant = 'matured';
  } else if (norm === 'STAFF') {
    variant = 'gold';
  }

  return (
    <span className={`mf-tag mf-tag-${variant} ${className}`} {...props}>
      {hasDot && <span className="mf-tag-dot" />}
      {children || norm}
    </span>
  );
}

export default Tag;

