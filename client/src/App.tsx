import React, { useState, useCallback, useEffect } from 'react';
import { Switch, Route, useLocation } from 'wouter';
import { Layout } from './components/layout';
import { Home } from './pages/home';
import DiscoverPage from './pages/discover';
import { LogSet } from './pages/log-set';
import { Lists } from './pages/lists';
import { Profile } from './pages/profile';
import { AuthModal } from './components/auth-modal';
import { OnboardingModal } from './components/onboarding-modal';
import { useAppContext } from '@/context/app-context';
import { supabase } from '@/lib/supabase';

// Placeholder for pages that might not exist yet
function UnderDevelopment() {
  return <div>This page is under development</div>;
}

// 404 Page
const NotFound = () => <div className="p-4">404 - Page Not Found</div>;

export default function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | undefined>();
  const { user, isLoading, setUser } = useAppContext();
  const [currentPath] = useLocation();

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  // Set global document title
  useEffect(() => {
    document.title = "SoundOff🔈: Log, Rank, and Relive Your Music Moments";
  }, []);

  // On mount, verify if we have a completed onboarding but need login state refresh
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const onboardingComplete = localStorage.getItem('onboardingComplete') === 'true';
      
      if (onboardingComplete && !user) {
        // Check if we have a valid session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Get userData from localStorage as a fallback
          const storedUserData = localStorage.getItem('userData');
          if (storedUserData) {
            try {
              const userData = JSON.parse(storedUserData);
              setUser(userData);
              // window.location.reload(); // Force reload to ensure state is consistent
            } catch (e) {
              // Error parsing stored user data
            }
          }
        }
      }
    };
    
    checkOnboardingStatus();
  }, [setUser, user]);

  useEffect(() => {
    if (isLoading) return; // Wait for user state to load
    
    const justCompletedOnboarding = localStorage.getItem('onboardingComplete') === 'true';
    
    if (user && !user.onboarded && !justCompletedOnboarding) {
      // Determine where to redirect after onboarding
      let redirectTo = '/log-set'; // Default destination
      
      if (currentPath !== '/' && currentPath !== '/auth') {
        // Remember the current path for redirect after onboarding
        redirectTo = currentPath;
      }
      
      setRedirectPath(redirectTo);
      setIsOnboardingOpen(true);
    } else {
      setIsOnboardingOpen(false);
    }
  }, [user, isLoading, currentPath]);

  const closeOnboarding = useCallback(() => {
    setIsOnboardingOpen(false);
    setRedirectPath(undefined);
  }, []);

  useEffect(() => {
    // Check for a redirect after reload flag
    const redirectAfterReload = localStorage.getItem('redirect_after_reload');
    if (redirectAfterReload) {
      localStorage.removeItem('redirect_after_reload');
      window.location.href = redirectAfterReload;
    }
  }, []);

  return (
    <Layout>
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <OnboardingModal 
        isOpen={isOnboardingOpen} 
        onClose={closeOnboarding} 
        redirectPath={redirectPath}
      />
      <Switch>
        <Route path="/" component={() => <Home openAuthModal={openAuthModal} />} />
        <Route path="/discover" component={DiscoverPage} />
        <Route path="/log-set" component={() => <LogSet openAuthModal={openAuthModal} />} />
        <Route path="/lists" component={() => <Lists openAuthModal={openAuthModal} />} />
        <Route path="/profile" component={() => <Profile openAuthModal={openAuthModal} />} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}
