import { useState } from 'react';
import { FileIcon, Download, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Attachment {
  name: string;
  size: number;
  url?: string;
  type?: string;
}

interface MessageAttachmentProps {
  attachment: Attachment;
}

export const MessageAttachment = ({ attachment }: MessageAttachmentProps) => {
  const [showZoom, setShowZoom] = useState(false);
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = () => {
    if (attachment.url) {
      window.open(attachment.url, '_blank');
    }
  };

  const isImage = attachment.type?.startsWith('image/') || 
                  /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.name);

  if (isImage && attachment.url) {
    return (
      <>
        <div className="relative group max-w-xs rounded-lg overflow-hidden border border-border">
          <img
            src={attachment.url}
            alt={attachment.name}
            className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setShowZoom(true)}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
            <Button
              variant="secondary"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setShowZoom(true)}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-2 bg-background/95 backdrop-blur-sm">
            <p className="text-xs font-medium truncate" title={attachment.name}>
              {attachment.name}
            </p>
            <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
          </div>
        </div>

        <Dialog open={showZoom} onOpenChange={setShowZoom}>
          <DialogContent className="max-w-4xl">
            <img
              src={attachment.url}
              alt={attachment.name}
              className="w-full h-auto"
            />
            <p className="text-sm text-center text-muted-foreground mt-2">{attachment.name}</p>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border max-w-xs">
      <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
      </div>
      {attachment.url && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownload}
          className="flex-shrink-0"
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
