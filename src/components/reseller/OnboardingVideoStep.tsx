import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Play, AlertCircle, CheckCircle } from 'lucide-react';
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

interface OnboardingVideoStepProps {
  userId: string;
  onComplete: () => void;
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

export const OnboardingVideoStep = ({ userId, onComplete }: OnboardingVideoStepProps) => {
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [minTimeReached, setMinTimeReached] = useState(false);
  const [completing, setCompleting] = useState(false);
  
  const progressIntervalRef = useRef<number | null>(null);
  const totalSecondsRef = useRef(0);

  // Load onboarding config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data: configData, error } = await supabase
          .from('reseller_onboarding_config')
          .select('*')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error loading onboarding config:', error);
          onComplete();
          return;
        }

        if (!configData || !configData.is_active || !configData.video_url) {
          // No video configured, skip this step
          onComplete();
          return;
        }

        setConfig(configData);
      } catch (err) {
        console.error('Error:', err);
        onComplete();
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [onComplete]);

  // Track video progress for Google Drive
  useEffect(() => {
    if (!config?.video_url || config.video_provider !== 'google_drive') return;

    progressIntervalRef.current = window.setInterval(() => {
      totalSecondsRef.current += 5;
      
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
          if (data.event === 'onStateChange' && data.info === 0) {
            handleVideoEnd();
          }
        } catch (e) {}
      }
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
    await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  };

  const handleContinue = async () => {
    setCompleting(true);
    try {
      await markOnboardingComplete();
      toast.success('Treinamento concluído! 🎉');
      onComplete();
    } catch (err) {
      console.error('Error completing onboarding:', err);
      toast.error('Erro ao concluir treinamento');
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
          <div style={{ maxWidth: dimensions.maxWidth }} className="w-full overflow-hidden rounded-lg">
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
          <div style={{ maxWidth: dimensions.maxWidth }} className="w-full overflow-hidden rounded-lg">
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
          <div style={{ maxWidth: dimensions.maxWidth }} className="w-full overflow-hidden rounded-lg">
            <iframe
              style={{ width: '100%', height: dimensions.height, display: 'block' }}
              src={embedUrl}
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
          {minTimeReached && !videoCompleted && (
            <Button onClick={handleVideoEnd} variant="outline" className="mt-4">
              <CheckCircle className="h-4 w-4 mr-2" />
              Concluí o vídeo
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="flex justify-center overflow-hidden">
        <div style={{ maxWidth: dimensions.maxWidth }} className="w-full overflow-hidden rounded-lg">
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Play className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">{config.title}</CardTitle>
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
                <span>Por favor, assista ao vídeo completo para continuar.</span>
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
              Continuar
            </>
          ) : (
            'Aguarde o fim do vídeo...'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
