import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * Drawer Component with WCAG focus trapping and escape dismissal
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
  const previousActiveElement = useRef(null);

  // Focus management: capture previous focus, set focus inside drawer, restore on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        const focusable = drawerRef.current?.querySelectorAll(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable && focusable.length > 0) {
          focusable[0].focus();
        }
      }, 50);
    } else {
      document.body.style.overflow = '';
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape & Tab key trapping
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !primaryLoading) {
        onClose();
      } else if (e.key === 'Tab') {
        const focusable = drawerRef.current?.querySelectorAll(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, primaryLoading, onClose]);

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
      aria-label={title}
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

