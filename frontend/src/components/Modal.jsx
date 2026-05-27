import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                     bg-ink/40 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/*
            Layout: the dialog is capped at the viewport with a flex column.
            Header is fixed at the top, the body becomes the only scrolling
            region. This keeps the close button and title in view while long
            forms (sports grid, etc.) can be scrolled to reach the footer.
          */}
          <motion.div
            className="w-full sm:max-w-md bg-white rounded-t-md sm:rounded-md
                       shadow-card-hover border border-outline-variant/40
                       flex flex-col max-h-[95vh] sm:max-h-[calc(100vh-2rem)]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-start justify-between gap-3 px-6 pt-6 pb-4
                            border-b border-outline-variant/30">
              <div>
                <h2 className="font-display text-headline-md text-ink tracking-wide">{title}</h2>
                {subtitle && (
                  <p className="text-sm text-ink-variant mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full text-ink-variant hover:bg-surface-low
                           hover:text-primary flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Body — the only scrolling region */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
