import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ChatAvatarProps {
  name?: string;
  email?: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  showOnline?: boolean;
}

export const ChatAvatar = ({ name, email, imageUrl, size = 'md', showOnline = false }: ChatAvatarProps) => {
  const getInitials = () => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return '??';
  };

  const getColor = () => {
    const text = name || email || '';
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500',
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <div className="relative">
      <Avatar className={sizeClasses[size]}>
        {imageUrl && <AvatarImage src={imageUrl} alt={name || email} />}
        <AvatarFallback className={`${getColor()} text-white font-semibold`}>
          {getInitials()}
        </AvatarFallback>
      </Avatar>
      {showOnline && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
      )}
    </div>
  );
};
