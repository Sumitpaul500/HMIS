import { useState, useCallback } from 'react';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const defaultContext: ToastContextType = {
  toasts: [],
  showToast: () => {},
  removeToast: () => {},
};

// Simple toast hook without external dependencies
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastMessage = {
      id,
      duration: 5000,
      ...toast,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration
    if (newToast.duration) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
    // Convenience methods
    success: (title: string, description?: string) => showToast({ title, description, type: 'success' }),
    error: (title: string, description?: string) => showToast({ title, description, type: 'error' }),
    warning: (title: string, description?: string) => showToast({ title, description, type: 'warning' }),
    info: (title: string, description?: string) => showToast({ title, description, type: 'info' }),
  };
};
