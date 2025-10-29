import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PremiumBadgeProps {
  plan: 'free' | 'premium';
  className?: string;
}

export const PremiumBadge = ({ plan, className }: PremiumBadgeProps) => {
  if (plan === 'premium') {
    return (
      <Badge className={`bg-gradient-to-r from-yellow-500 to-orange-500 text-white ${className}`}>
        <Crown className="mr-1 h-3 w-3" />
        Premium
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={className}>
      🆓 Free
    </Badge>
  );
};
