import React from 'react';
import Chip from './Chip';

/**
 * Pagination component
 * Props:
 * - currentPage: number
 * - totalPages: number
 * - onPageChange: function
 */
export function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = ''
}) {
  return (
    <div className={`mf-pagination ${className}`}>
      <span>
        Page {currentPage} of {Math.max(1, totalPages)}
      </span>
      <div className="mf-pagination-actions">
        <Chip
          disabled={currentPage <= 1}
          onClick={() => onPageChange && onPageChange(currentPage - 1)}
        >
          Previous
        </Chip>
        <Chip
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange && onPageChange(currentPage + 1)}
        >
          Next
        </Chip>
      </div>
    </div>
  );
}

export default Pagination;

