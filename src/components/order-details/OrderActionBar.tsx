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
  MoreHorizontal,
  Copy,
  FileText,
  Tag,
  Zap,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { CancelOrderModal } from './CancelOrderModal';
import { UpdateStatusModal } from './UpdateStatusModal';
import { AddNoteModal } from './AddNoteModal';
import { UpdateTrackingModal } from './UpdateTrackingModal';
import { OrderOccurrenceModal, OccurrenceShippingFile } from './OrderOccurrenceModal';
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
    reseller_id?: string | null;
    shipping_label_url?: string | null;
    shipping_label_status?: string | null;
    has_shipping_label?: boolean;
    customer_name?: string;
  };
  userRole: string;
  deliveredAt?: string | null;
  paidAt?: string | null;
  existingTicketId?: string | null;
  shippingFiles?: OccurrenceShippingFile[];
  onRefresh: () => void;
}

export const OrderActionBar = ({
  order,
  userRole,
  deliveredAt,
  paidAt,
  existingTicketId,
  shippingFiles = [],
  onRefresh,
}: OrderActionBarProps) => {
  const navigate = useNavigate();
  const [occurrenceOpen, setOccurrenceOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isSupplier = userRole === 'supplier';
  const isReseller = userRole === 'reseller';
  const canManage = isAdmin || isSupplier;

  const cancelableStatuses = ['pendente', 'pago', 'recebido', 'embalado', 'em_reposicao'];
  const showCancel = cancelableStatuses.includes(order.status) && (isAdmin || isSupplier || isReseller);
  const hasTransitions = getAvailableTransitions(order.status).length > 0;

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(order.order_number);
    toast.success('Número do pedido copiado!');
  };

  const handleOpenExistingTicket = () => {
    if (existingTicketId) {
      navigate(`/minha-conta/tickets/${existingTicketId}`);
    }
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

      toast.success('Pedido marcado como fraude, cancelado e estorno processado.');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao marcar fraude.');
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 py-1.5">
        {/* Botão Único Unificado: Abrir Ocorrência (ou Ver Ocorrência Aberta) */}
        {existingTicketId ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenExistingTicket}
            className="h-8 px-3 text-xs font-semibold text-amber-700 dark:text-amber-300 border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 gap-1.5 shadow-2xs"
          >
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Ver Ocorrência Aberta</span>
            <ExternalLink className="h-3 w-3 opacity-70 ml-0.5" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOccurrenceOpen(true)}
            className="h-8 px-3 text-xs font-semibold text-amber-700 dark:text-amber-300 border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 gap-1.5 shadow-2xs"
          >
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Abrir Ocorrência</span>
          </Button>
        )}

        {/* Menu Suspenso Mais para Ações Secundárias */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-3.5 w-3.5 mr-1" />
              <span>Mais</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
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

            {showCancel && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCancelOpen(true)} className="text-destructive focus:text-destructive">
                  <Ban className="h-4 w-4 mr-2" />
                  Cancelar Pedido
                </DropdownMenuItem>
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

      {/* Modal Passo a Passo de Ocorrência (Etapas 1 e 2) */}
      <OrderOccurrenceModal
        open={occurrenceOpen}
        onOpenChange={setOccurrenceOpen}
        order={order}
        existingShippingFiles={shippingFiles}
        deliveredAt={deliveredAt}
        onSuccess={onRefresh}
      />

      <CancelOrderModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        orderId={order.id}
        orderNumber={order.order_number}
        totalAmount={Number(order.total_amount)}
        userId={order.user_id}
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
