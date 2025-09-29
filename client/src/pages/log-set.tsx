import React from 'react';
import { LogSetForm } from '@/components/log-set-form';
import { useAppContext } from '@/context/app-context';
import { Card, CardContent } from '@/components/ui/card';
import { LockIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LogSetProps {
  openAuthModal: () => void;
}

export function LogSet({ openAuthModal }: LogSetProps) {
  const { user } = useAppContext();
  
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <Card className="bg-black border-none rounded-lg max-w-md mx-auto w-full">
          <CardContent className="p-8 text-center">
            <LockIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">Authentication Required</h3>
            <p className="text-gray-400 mb-6">
              Please sign in or create an account to log your music sets
            </p>
            <Button
              onClick={openAuthModal}
              className="bg-green-500 text-black font-semibold hover:bg-green-600"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h2 className="text-3xl font-bold mb-6">Log a Set</h2>
      <LogSetForm />
    </div>
  );
}
