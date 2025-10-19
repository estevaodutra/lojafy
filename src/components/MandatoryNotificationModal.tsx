import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { useMandatoryNotifications } from '@/hooks/useMandatoryNotifications';
import { useNavigate } from 'react-router-dom';
import { getGoogleDriveEmbedUrl } from '@/lib/videoUtils';
import type { MandatoryNotification } from '@/types/notifications';

interface Props {
  notification: MandatoryNotification;
}

export const MandatoryNotificationModal = ({ notification }: Props) => {
  const navigate = useNavigate();
  const { markAsViewed, updateVideoProgress, markVideoCompleted, markButtonClicked, markActionClicked } = useMandatoryNotifications();
  
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [canClose, setCanClose] = useState(!notification.video_url);
  const [minTimeReached, setMinTimeReached] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const progressIntervalRef = useRef<number | null>(null);
  const totalSecondsRef = useRef(0);

  useEffect(() => {
    markAsViewed(notification.id);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [notification.id]);

  useEffect(() => {
    if (!notification.video_url) return;

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
  }, [notification.id]);

  useEffect(() => {
    if (!notification.video_url) return;

    progressIntervalRef.current = window.setInterval(() => {
      totalSecondsRef.current += 5;
      updateVideoProgress(notification.id, totalSecondsRef.current);
      
      // Para Google Drive, liberar após 30 segundos
      if (notification.video_provider === 'google_drive' && totalSecondsRef.current >= 30) {
        setMinTimeReached(true);
      }
    }, 5000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [notification.id]);

  const handleVideoEnd = async () => {
    setVideoCompleted(true);
    setCanClose(true);
    await markVideoCompleted(notification.id);
  };

  const handleButtonClick = async () => {
    await markButtonClicked(notification.id);
    setIsOpen(false);
  };

  const handleActionClick = async () => {
    if (notification.action_url) {
      await markActionClicked(notification.id);
      await markButtonClicked(notification.id);
      
      if (notification.action_url.startsWith('http')) {
        window.open(notification.action_url, '_blank');
      } else {
        navigate(notification.action_url);
      }
      
      setIsOpen(false);
    }
  };

  const renderVideo = () => {
    if (!notification.video_url) return null;

    if (notification.video_provider === 'youtube') {
      const videoId = notification.video_url.includes('v=') 
        ? notification.video_url.split('v=')[1]?.split('&')[0]
        : notification.video_url.split('/').pop();
      return (
        <iframe
          width="100%"
          height="400"
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="rounded-lg"
        />
      );
    }

    if (notification.video_provider === 'vimeo') {
      const videoId = notification.video_url.split('/').pop();
      return (
        <iframe
          width="100%"
          height="400"
          src={`https://player.vimeo.com/video/${videoId}?api=1`}
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="rounded-lg"
        />
      );
    }

    if (notification.video_provider === 'google_drive') {
      const embedUrl = getGoogleDriveEmbedUrl(notification.video_url);
      return (
        <div>
          <iframe
            width="100%"
            height="400"
            src={embedUrl}
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="rounded-lg"
          />
          {minTimeReached && !videoCompleted && (
            <Button 
              onClick={handleVideoEnd} 
              variant="outline" 
              className="mt-3 w-full"
            >
              ✓ Concluí o vídeo
            </Button>
          )}
        </div>
      );
    }

    return (
      <video
        width="100%"
        height="400"
        controls
        className="rounded-lg"
        onEnded={handleVideoEnd}
      >
        <source src={notification.video_url} type="video/mp4" />
        Seu navegador não suporta vídeo HTML5.
      </video>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (canClose && !open) {
        setIsOpen(false);
      }
    }}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => !canClose && e.preventDefault()}
        onEscapeKeyDown={(e) => !canClose && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="h-6 w-6 text-primary" />
            {notification.title}
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {notification.message}
          </DialogDescription>
        </DialogHeader>

        {notification.video_url && (
          <div className="my-4">
            {renderVideo()}
            
            {!videoCompleted && (
              <div className="mt-3 p-3 bg-muted rounded-lg text-sm text-muted-foreground flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Por favor, assista ao vídeo completo para continuar.
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          {notification.action_url && canClose && (
            <Button
              onClick={handleActionClick}
              variant="outline"
              className="flex-1"
            >
              {notification.action_label}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          )}
          
          <Button
            onClick={handleButtonClick}
            disabled={!canClose}
            className="flex-1"
          >
            {canClose ? 'Entendido' : 'Aguarde o fim do vídeo...'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
