import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AuthForm } from './auth-form';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useAppContext } from '@/context/app-context';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { user } = useAppContext();
  
  // Close modal automatically if user becomes authenticated while modal is open
  useEffect(() => {
    if (isOpen && user) {
      console.log('Auth modal auto-closing because user is authenticated');
      onClose();
    }
  }, [user, isOpen, onClose]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <VisuallyHidden>
          <DialogTitle>SoundOff Authentication</DialogTitle>
        </VisuallyHidden>
        <AuthForm onSuccess={onClose} />
      </DialogContent>
    </Dialog>
  );
}