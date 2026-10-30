import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        {variant !== 'default' && (
          <div
            className={[
              'shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
              variant === 'danger' ? 'bg-red-50' : 'bg-amber-50',
            ].join(' ')}
            aria-hidden="true"
          >
            <AlertTriangle
              className={[
                'h-5 w-5',
                variant === 'danger' ? 'text-red-500' : 'text-amber-500',
              ].join(' ')}
            />
          </div>
        )}
        <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
};
