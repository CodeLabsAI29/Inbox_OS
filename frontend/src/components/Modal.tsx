import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string; // Optional class override for custom dimensions/padding
}

// Selector of focusable elements for accessibility focus trapping
const FOCUSABLE_SELECTOR = 
  'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = 'max-w-lg w-full',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store current active element to restore when modal closes
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus the modal content area or the first focusable element
      if (modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        } else {
          modalRef.current.focus();
        }
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        // Close on escape
        if (e.key === 'Escape') {
          onClose();
          return;
        }

        // Trap focus inside modal on Tab key navigation
        if (e.key === 'Tab' && modalRef.current) {
          const focusable = Array.from(
            modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
          ) as HTMLElement[];

          if (focusable.length === 0) {
            e.preventDefault();
            return;
          }

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey) {
            // Shift + Tab (go backwards)
            if (document.activeElement === first) {
              last.focus();
              e.preventDefault();
            }
          } else {
            // Tab (go forwards)
            if (document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      // Prevent background scrolling while modal is open
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
        
        // Restore focus to original trigger element
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the backdrop wrapper directly
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Modal Dialog Content Panel */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative glass rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 outline-none text-left max-h-[90vh] overflow-y-auto flex flex-col ${className}`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
          {title ? (
            <h2 id="modal-title" className="text-base font-bold text-white tracking-tight">
              {title}
            </h2>
          ) : (
            <div />
          )}
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body content */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {children}
        </div>
      </div>
    </div>
  );
};
