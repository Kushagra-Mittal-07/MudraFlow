import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * Modal Component with WCAG focus trapping and escape dismissal
 */
export function Modal({
  isOpen,
  onClose,
  title,
  actionLabel = 'Confirm',
  onAction,
  actionVariant = 'primary',
  actionLoading = false,
  cancelLabel = 'Cancel',
  children,
  className = ''
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        const focusable = modalRef.current?.querySelectorAll(
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !actionLoading) {
        onClose();
      } else if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll(
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
  }, [isOpen, actionLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="mf-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !actionLoading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`mf-modal ${className}`} ref={modalRef}>
        <div className="mf-modal-header">
          <h2 className="mf-modal-title">{title}</h2>
          <button
            type="button"
            className="mf-chip"
            onClick={onClose}
            disabled={actionLoading}
            aria-label="Close modal"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mf-modal-body">
          {children}
        </div>

        <div className="mf-modal-footer">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={actionLoading}
          >
            {cancelLabel}
          </Button>
          {actionLabel && onAction && (
            <Button
              variant={actionVariant}
              onClick={onAction}
              loading={actionLoading}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;

