import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Ban,
  HandMetal,
  RotateCcw,
  MoreHorizontal,
  Copy,
  FileText,
  Tag,
  Zap,
  AlertTriangle,
  MessageSquarePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { OpenTicketButton } from '@/components/order-tickets/OpenTicketButton';
import { CancelOrderModal } from './CancelOrderModal';
import { RequestCancelModal } from './RequestCancelModal';
import { RequestReturnModal } from './RequestReturnModal';
import { UpdateStatusModal } from './UpdateStatusModal';
import { AddNoteModal } from './AddNoteModal';
import { UpdateTrackingModal } from './UpdateTrackingModal';
import { supabase } from '@/integrations/supabase/client';
import { getAvailableTransitions } from '@/constants/orderStatus';

interface OrderActionBarProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    total_amount: number;
    user_id: string;
    tracking_number?: string;
  };
  userRole: string;
  deliveredAt?: string | null;
  existingTicketId?: string | null;
  onRefresh: () => void;
}

export const OrderActionBar = ({
  order, userRole, deliveredAt, existingTicketId, onRefresh,
}: OrderActionBarProps) => {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [requestCancelOpen, setRequestCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isSupplier = userRole === 'supplier';
  const isReseller = userRole === 'reseller';
  const canManage = isAdmin || isSupplier;

  const cancelableStatuses = ['pendente', 'pago', 'recebido', 'embalado', 'em_reposicao'];
  const showCancel = cancelableStatuses.includes(order.status) && (isAdmin || isSupplier || isReseller);
  const showRequestCancel = order.status === 'enviado' && (isAdmin || isReseller);
  const showReturn = order.status === 'finalizado' && (isAdmin || isReseller);
  const hasTransitions = getAvailableTransitions(order.status).length > 0;

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(order.order_number);
    toast.success('Número do pedido copiado!');
  };

  const handleMarkFraud = async () => {
    if (!confirm('Tem certeza que deseja marcar este pedido como fraude e cancelá-lo?')) return;
    try {
      const { error } = await supabase.from('orders').update({
        status: 'cancelado',
        cancelamento_motivo: 'fraude',
        cancelado_em: new Date().toISOString(),
      }).eq('id', order.id);
      if (error) throw error;

      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status: 'cancelado',
        notes: 'Pedido cancelado por fraude detectada',
      });

      toast.success('Pedido marcado como fraude e cancelado.');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao marcar fraude.');
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 py-3 border-b">
        <OpenTicketButton
          orderId={order.id}
          orderStatus={order.status}
          paymentStatus={order.payment_status}
          deliveredAt={deliveredAt}
          existingTicketId={existingTicketId}
          variant="outline"
          size="sm"
        />

        {showCancel && (
          <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)} className="text-destructive hover:text-destructive">
            <Ban className="h-4 w-4 mr-1" />
            Cancelar Pedido
          </Button>
        )}

        {showRequestCancel && (
          <Button variant="outline" size="sm" onClick={() => setRequestCancelOpen(true)}>
            <HandMetal className="h-4 w-4 mr-1" />
            Solicitar Cancelamento
          </Button>
        )}

        {showReturn && (
          <Button variant="outline" size="sm" onClick={() => setReturnOpen(true)}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Solicitar Devolução
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4 mr-1" />
              Mais
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleCopyOrderNumber}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Número do Pedido
            </DropdownMenuItem>

            {canManage && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setNoteOpen(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Adicionar Observação
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTrackingOpen(true)}>
                  <Tag className="h-4 w-4 mr-2" />
                  Atualizar Rastreio
                </DropdownMenuItem>
                {hasTransitions && (
                  <DropdownMenuItem onClick={() => setStatusOpen(true)}>
                    <Zap className="h-4 w-4 mr-2" />
                    Atualizar Status
                  </DropdownMenuItem>
                )}
              </>
            )}

            {userRole === 'super_admin' && order.status !== 'cancelado' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleMarkFraud} className="text-destructive focus:text-destructive">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Marcar como Fraude
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modals */}
      <CancelOrderModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        orderId={order.id}
        orderNumber={order.order_number}
        totalAmount={Number(order.total_amount)}
        userId={order.user_id}
        onSuccess={onRefresh}
      />
      <RequestCancelModal
        open={requestCancelOpen}
        onOpenChange={setRequestCancelOpen}
        orderId={order.id}
        orderNumber={order.order_number}
        onSuccess={onRefresh}
      />
      <RequestReturnModal
        open={returnOpen}
        onOpenChange={setReturnOpen}
        orderId={order.id}
        orderNumber={order.order_number}
        deliveredAt={deliveredAt}
        onSuccess={onRefresh}
      />
      <UpdateStatusModal
        open={statusOpen}
        onOpenChange={setStatusOpen}
        orderId={order.id}
        orderNumber={order.order_number}
        currentStatus={order.status}
        onSuccess={onRefresh}
      />
      <AddNoteModal
        open={noteOpen}
        onOpenChange={setNoteOpen}
        orderId={order.id}
        orderNumber={order.order_number}
        currentStatus={order.status}
        onSuccess={onRefresh}
      />
      <UpdateTrackingModal
        open={trackingOpen}
        onOpenChange={setTrackingOpen}
        orderId={order.id}
        orderNumber={order.order_number}
        currentTracking={order.tracking_number}
        onSuccess={onRefresh}
      />
    </>
  );
};
