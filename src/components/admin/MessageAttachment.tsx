import { FileIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
