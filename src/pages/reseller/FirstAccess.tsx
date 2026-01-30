import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Lock, Play, Smartphone, Check } from 'lucide-react';
import { SetPasswordStep } from '@/components/reseller/SetPasswordStep';
import { OnboardingVideoStep } from '@/components/reseller/OnboardingVideoStep';
import { InstallPWAStep } from '@/components/reseller/InstallPWAStep';
import logoImage from '@/assets/lojafy-logo-new.png';

type Step = 'password' | 'onboarding' | 'pwa';

interface StepIndicatorProps {
  number: number;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  completed: boolean;
}

const StepIndicator = ({ number, label, icon, active, completed }: StepIndicatorProps) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center transition-all
          ${completed 
            ? 'bg-green-500 text-white' 
            : active 
              ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' 
              : 'bg-muted text-muted-foreground'
          }
        `}
      >
        {completed ? <Check className="h-5 w-5" /> : icon}
      </div>
      <span 
        className={`text-xs font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}
      >
        {label}
      </span>
    </div>
  );
};

const Connector = ({ completed }: { completed: boolean }) => (
  <div 
    className={`
      h-0.5 w-12 sm:w-16 transition-colors
      ${completed ? 'bg-green-500' : 'bg-muted'}
    `}
  />
);

const FirstAccess = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState<Step>('password');
  const [passwordCompleted, setPasswordCompleted] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check authentication and load initial state
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    // Load profile state to determine starting step
    const loadState = async () => {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('password_set, onboarding_completed, role')
          .eq('user_id', user.id)
          .single();

        // Check role - only resellers should be here
        if (profileData?.role !== 'reseller') {
          navigate('/');
          return;
        }

        // Determine starting step based on completed steps
        if (profileData?.password_set) {
          setPasswordCompleted(true);
          
          if (profileData?.onboarding_completed) {
            setOnboardingCompleted(true);
            setCurrentStep('pwa');
          } else {
            setCurrentStep('onboarding');
          }
        } else {
          setCurrentStep('password');
        }
      } catch (error) {
        console.error('Error loading state:', error);
      } finally {
        setLoading(false);
      }
    };

    loadState();
  }, [user, authLoading, navigate]);

  const handlePasswordComplete = () => {
    setPasswordCompleted(true);
    setCurrentStep('onboarding');
  };

  const handleOnboardingComplete = () => {
    setOnboardingCompleted(true);
    setCurrentStep('pwa');
  };

  const handlePWAComplete = () => {
    navigate('/reseller/dashboard');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col">
      {/* Header with Logo */}
      <div className="py-6 px-4 flex justify-center">
        <img 
          src={logoImage} 
          alt="Lojafy" 
          className="h-10 object-contain"
        />
      </div>

      {/* Step Indicator */}
      <div className="py-6 px-4">
        <div className="flex items-center justify-center">
          <StepIndicator
            number={1}
            label="Senha"
            icon={<Lock className="h-4 w-4" />}
            active={currentStep === 'password'}
            completed={passwordCompleted}
          />
          <Connector completed={passwordCompleted} />
          <StepIndicator
            number={2}
            label="Treinamento"
            icon={<Play className="h-4 w-4" />}
            active={currentStep === 'onboarding'}
            completed={onboardingCompleted}
          />
          <Connector completed={onboardingCompleted} />
          <StepIndicator
            number={3}
            label="Instalar"
            icon={<Smartphone className="h-4 w-4" />}
            active={currentStep === 'pwa'}
            completed={false}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        {currentStep === 'password' && user && (
          <SetPasswordStep 
            userId={user.id} 
            onComplete={handlePasswordComplete} 
          />
        )}

        {currentStep === 'onboarding' && user && (
          <OnboardingVideoStep 
            userId={user.id} 
            onComplete={handleOnboardingComplete} 
          />
        )}

        {currentStep === 'pwa' && (
          <InstallPWAStep onComplete={handlePWAComplete} />
        )}
      </div>

      {/* Footer */}
      <div className="py-4 px-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Lojafy. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default FirstAccess;
