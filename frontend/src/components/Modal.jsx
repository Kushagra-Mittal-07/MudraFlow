import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * Modal Component
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - title: string
 * - actionLabel: string
 * - onAction: function
 * - actionVariant: 'primary' | 'danger-solid' | 'secondary'
 * - actionLoading: boolean
 * - cancelLabel: string
 * - children: ReactNode
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
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !actionLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, actionLoading, onClose]);

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
      className="mf-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !actionLoading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={`mf-modal ${className}`}>
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

