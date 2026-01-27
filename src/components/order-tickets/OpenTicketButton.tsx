import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, ExternalLink } from 'lucide-react';
import { OpenTicketModal } from './OpenTicketModal';
import { useOrderTickets } from '@/hooks/useOrderTickets';
import { getAvailableTicketTypes } from '@/types/orderTickets';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface OpenTicketButtonProps {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  existingTicketId?: string | null;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const OpenTicketButton = ({
  orderId,
  orderStatus,
  paymentStatus,
  existingTicketId,
  variant = 'outline',
  size = 'sm',
  className,
}: OpenTicketButtonProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Only customers can open tickets
  if (profile?.role !== 'customer') {
    return null;
  }

  // If there's already an open ticket, show link to it
  if (existingTicketId) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => navigate(`/minha-conta/tickets/${existingTicketId}`)}
      >
        <ExternalLink className="h-4 w-4 mr-1" />
        Ver Ticket Aberto
      </Button>
    );
  }

  // Check if any ticket types are available
  const availableTypes = getAvailableTicketTypes(orderStatus, paymentStatus);
  
  if (availableTypes.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setModalOpen(true)}
      >
        <MessageSquarePlus className="h-4 w-4 mr-1" />
        Abrir Ticket
      </Button>

      <OpenTicketModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        orderId={orderId}
        orderStatus={orderStatus}
        paymentStatus={paymentStatus}
      />
    </>
  );
};
