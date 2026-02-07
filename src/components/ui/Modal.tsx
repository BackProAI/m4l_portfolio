'use client';

import * as React from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in duration-200">
        {children}
      </div>
    </div>
  );
}

export interface ModalHeaderProps {
  children: React.ReactNode;
}

export function ModalHeader({ children }: ModalHeaderProps) {
  return (
    <div className="mb-4">
      <h3 className="text-xl font-bold text-neutral-900">{children}</h3>
    </div>
  );
}

export interface ModalBodyProps {
  children: React.ReactNode;
}

export function ModalBody({ children }: ModalBodyProps) {
  return <div className="mb-6 text-neutral-700 leading-relaxed">{children}</div>;
}

export interface ModalFooterProps {
  children: React.ReactNode;
}

export function ModalFooter({ children }: ModalFooterProps) {
  return <div className="flex gap-3 justify-end">{children}</div>;
}
