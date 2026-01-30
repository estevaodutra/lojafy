import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, Play, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getGoogleDriveEmbedUrl } from '@/lib/videoUtils';

interface OnboardingConfig {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_provider: string;
  video_aspect_ratio: string;
  is_active: boolean;
  redirect_after: string;
}

const getVideoDimensions = (aspectRatio: string) => {
  const isMobile = window.innerWidth < 640;
  
  switch (aspectRatio) {
    case '9:16':
      return { 
        height: isMobile ? '400px' : '600px',
        maxWidth: isMobile ? '280px' : '340px'
      };
    case '16:9':
    default:
      return { 
        height: isMobile ? '220px' : '450px',
        maxWidth: '100%'
      };
  }
};

const ResellerOnboarding = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [minTimeReached, setMinTimeReached] = useState(false);
  const [completing, setCompleting] = useState(false);
  
  const progressIntervalRef = useRef<number | null>(null);
  const totalSecondsRef = useRef(0);

  // Check if user should be here
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    if (profile?.role !== 'reseller') {
      navigate('/');
      return;
    }
  }, [user, profile, authLoading, navigate]);

  // Load onboarding config
  useEffect(() => {
    const loadConfig = async () => {
      if (!user) return;

      try {
        // Check if onboarding already completed
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .single();

        if (profile?.onboarding_completed) {
          navigate('/reseller/dashboard');
          return;
        }

        // Load onboarding config
        const { data: configData, error } = await supabase
          .from('reseller_onboarding_config')
          .select('*')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error loading onboarding config:', error);
          // If no config, skip onboarding
          await markOnboardingComplete();
          navigate('/reseller/dashboard');
          return;
        }

        if (!configData || !configData.is_active) {
          // No active config, skip onboarding
          await markOnboardingComplete();
          navigate('/reseller/dashboard');
          return;
        }

        setConfig(configData);
        
        // If no video, user can proceed immediately
        if (!configData.video_url) {
          setVideoCompleted(true);
        }
      } catch (err) {
        console.error('Error:', err);
        toast.error('Erro ao carregar configuração de onboarding');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [user, navigate]);

  // Track video progress for Google Drive
  useEffect(() => {
    if (!config?.video_url || config.video_provider !== 'google_drive') return;

    progressIntervalRef.current = window.setInterval(() => {
      totalSecondsRef.current += 5;
      
      // For Google Drive, allow completion after 30 seconds
      if (totalSecondsRef.current >= 30) {
        setMinTimeReached(true);
      }
    }, 5000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [config]);

  // Listen for YouTube/Vimeo video end events
  useEffect(() => {
    if (!config?.video_url) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          // YouTube
          if (data.event === 'onStateChange' && data.info === 0) {
            handleVideoEnd();
          }
        } catch (e) {}
      }
      // Vimeo
      if (event.data && event.data.event === 'finish') {
        handleVideoEnd();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [config]);

  const handleVideoEnd = () => {
    setVideoCompleted(true);
  };

  const markOnboardingComplete = async () => {
    if (!user) return;
    
    await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
  };

  const handleContinue = async () => {
    if (!user || !config) return;

    setCompleting(true);
    try {
      await markOnboardingComplete();
      toast.success('Bem-vindo à Lojafy! 🎉');
      navigate(config.redirect_after || '/reseller/dashboard');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      toast.error('Erro ao concluir onboarding');
    } finally {
      setCompleting(false);
    }
  };

  const renderVideo = () => {
    if (!config?.video_url) return null;

    const dimensions = getVideoDimensions(config.video_aspect_ratio || '16:9');

    if (config.video_provider === 'youtube') {
      const videoId = config.video_url.includes('v=') 
        ? config.video_url.split('v=')[1]?.split('&')[0]
        : config.video_url.split('/').pop();
      return (
        <div className="flex justify-center overflow-hidden">
          <div 
            style={{ maxWidth: dimensions.maxWidth }}
            className="w-full overflow-hidden rounded-lg"
          >
            <iframe
              style={{ width: '100%', height: dimensions.height, display: 'block' }}
              src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      );
    }

    if (config.video_provider === 'vimeo') {
      const videoId = config.video_url.split('/').pop();
      return (
        <div className="flex justify-center overflow-hidden">
          <div 
            style={{ maxWidth: dimensions.maxWidth }}
            className="w-full overflow-hidden rounded-lg"
          >
            <iframe
              style={{ width: '100%', height: dimensions.height, display: 'block' }}
              src={`https://player.vimeo.com/video/${videoId}?api=1`}
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      );
    }

    if (config.video_provider === 'google_drive') {
      const embedUrl = getGoogleDriveEmbedUrl(config.video_url);
      return (
        <div className="flex flex-col items-center overflow-hidden">
          <div 
            style={{ maxWidth: dimensions.maxWidth }}
            className="w-full overflow-hidden rounded-lg"
          >
            <iframe
              style={{ width: '100%', height: dimensions.height, display: 'block' }}
              src={embedUrl}
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
          {minTimeReached && !videoCompleted && (
            <Button 
              onClick={handleVideoEnd} 
              variant="outline" 
              className="mt-4"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Concluí o vídeo
            </Button>
          )}
        </div>
      );
    }

    // Direct video URL
    return (
      <div className="flex justify-center overflow-hidden">
        <div 
          style={{ maxWidth: dimensions.maxWidth }}
          className="w-full overflow-hidden rounded-lg"
        >
          <video
            style={{ width: '100%', height: dimensions.height, display: 'block' }}
            controls
            onEnded={handleVideoEnd}
          >
            <source src={config.video_url} type="video/mp4" />
            Seu navegador não suporta vídeo HTML5.
          </video>
        </div>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl sm:text-3xl flex items-center justify-center gap-2">
            <Play className="h-7 w-7 text-primary" />
            {config.title}
          </CardTitle>
          {config.description && (
            <CardDescription className="text-base mt-2">
              {config.description}
            </CardDescription>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {config.video_url && (
            <div className="space-y-4">
              {renderVideo()}
              
              {!videoCompleted && (
                <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Por favor, assista ao vídeo completo para continuar.
                  </span>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleContinue}
            disabled={!videoCompleted || completing}
            className="w-full"
            size="lg"
          >
            {completing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Concluindo...
              </>
            ) : videoCompleted ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Continuar para o Painel
              </>
            ) : (
              'Aguarde o fim do vídeo...'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerOnboarding;
