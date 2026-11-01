import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * Drawer Component
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - title: string
 * - primaryLabel: string
 * - onPrimary: function
 * - primaryLoading: boolean
 * - cancelLabel: string
 * - children: ReactNode
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  primaryLabel = 'Submit',
  onPrimary,
  primaryLoading = false,
  cancelLabel = 'Cancel',
  children,
  className = ''
}) {
  const drawerRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !primaryLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, primaryLoading, onClose]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="mf-drawer-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !primaryLoading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={`mf-drawer ${className}`} ref={drawerRef}>
        <div className="mf-drawer-header">
          <h2 className="mf-drawer-title">{title}</h2>
          <button
            type="button"
            className="mf-chip"
            onClick={onClose}
            disabled={primaryLoading}
            aria-label="Close drawer"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mf-drawer-body">
          {children}
        </div>

        <div className="mf-drawer-footer">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={primaryLoading}
          >
            {cancelLabel}
          </Button>
          {primaryLabel && onPrimary && (
            <Button
              variant="primary"
              onClick={onPrimary}
              loading={primaryLoading}
            >
              {primaryLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Drawer;

