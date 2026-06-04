import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getStatusConfig } from '@/constants/orderStatus';
import OrderDetailsModal from '@/components/OrderDetailsModal';

interface SolicitationOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  user_id: string;
  cancelamento_motivo: string | null;
  cancelamento_observacao: string | null;
  devolucao_motivo: string | null;
  created_at: string;
  updated_at: string;
  profiles: { first_name: string; last_name: string };
}

const SOLICITATION_STATUSES = ['cancelamento_solicitado', 'devolucao_andamento', 'devolucao_analise'];

export const OrderSolicitations = () => {
  const [orders, setOrders] = useState<SolicitationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<SolicitationOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => { fetchSolicitations(); }, []);

  const fetchSolicitations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total_amount, user_id, cancelamento_motivo, cancelamento_observacao, devolucao_motivo, created_at, updated_at')
        .in('status', SOLICITATION_STATUSES)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setOrders([]);
        return;
      }

      const userIds = [...new Set(data.map(o => o.user_id).filter(Boolean))];
      let profilesMap = new Map<string, { first_name: string; last_name: string }>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        if (profiles) {
          profilesMap = new Map(profiles.map(p => [p.user_id, { first_name: p.first_name || '', last_name: p.last_name || '' }]));
        }
      }

      setOrders(data.map(o => ({
        ...o,
        profiles: profilesMap.get(o.user_id) || { first_name: '', last_name: '' },
      })));
    } catch (error) {
      console.error('Error fetching solicitations:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (order: SolicitationOrder) => {
    const isCancellation = order.status === 'cancelamento_solicitado';
    const confirmMsg = isCancellation
      ? `Aprovar cancelamento do pedido #${order.order_number}? O valor de R$ ${order.total_amount.toFixed(2)} será creditado na carteira do cliente.`
      : `Aprovar solicitação de devolução do pedido #${order.order_number}?`;

    if (!confirm(confirmMsg)) return;

    setActionLoading(order.id);
    try {
      if (isCancellation) {
        // Update to cancelado
        const { error } = await supabase.from('orders').update({
          status: 'cancelado',
          cancelado_em: new Date().toISOString(),
        }).eq('id', order.id);
        if (error) throw error;

        // Insert history
        await supabase.from('order_status_history').insert({
          order_id: order.id,
          status: 'cancelado',
          notes: 'Cancelamento aprovado pelo administrador',
        });

        toast.success(`Cancelamento aprovado e saldo estornado.`);
      } else {
        // For devolucao: advance to next status
        const nextStatus = order.status === 'devolucao_andamento' ? 'devolucao_recebida' : 'devolucao_aprovada';
        const { error } = await supabase.from('orders').update({
          status: nextStatus,
        }).eq('id', order.id);
        if (error) throw error;

        await supabase.from('order_status_history').insert({
          order_id: order.id,
          status: nextStatus,
          notes: `Solicitação aprovada pelo administrador`,
        });

        toast.success('Solicitação aprovada com sucesso.');
      }

      fetchSolicitations();
    } catch (error: any) {
      console.error('Error approving:', error);
      toast.error(error.message || 'Erro ao aprovar solicitação.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(rejectModal.id);

    try {
      // Get the last status before the solicitation from history
      const { data: history } = await supabase
        .from('order_status_history')
        .select('status')
        .eq('order_id', rejectModal.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Find the previous non-solicitation status
      const previousStatus = history?.find(h =>
        !SOLICITATION_STATUSES.includes(h.status)
      )?.status || 'recebido';

      const { error } = await supabase.from('orders').update({
        status: previousStatus,
        cancelamento_motivo: null,
        cancelamento_observacao: null,
      }).eq('id', rejectModal.id);
      if (error) throw error;

      await supabase.from('order_status_history').insert({
        order_id: rejectModal.id,
        status: previousStatus,
        notes: `Solicitação recusada pelo administrador. Motivo: ${rejectReason}`,
      });

      toast.success('Solicitação recusada. Pedido voltou ao status anterior.');
      setRejectModal(null);
      setRejectReason('');
      fetchSolicitations();
    } catch (error: any) {
      console.error('Error rejecting:', error);
      toast.error(error.message || 'Erro ao recusar solicitação.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const getMotivo = (order: SolicitationOrder) => {
    if (order.status === 'cancelamento_solicitado') {
      return order.cancelamento_motivo || '-';
    }
    return order.devolucao_motivo || '-';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando solicitações...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    🎉 Nenhuma solicitação pendente
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const statusConfig = getStatusConfig(order.status);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.profiles.first_name} {order.profiles.last_name}</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{getMotivo(order)}</TableCell>
                      <TableCell>{formatPrice(order.total_amount)}</TableCell>
                      <TableCell>{format(new Date(order.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrderId(order.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(order)}
                            disabled={actionLoading === order.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {actionLoading === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setRejectModal(order)}
                            disabled={actionLoading === order.id}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <Dialog open={!!rejectModal} onOpenChange={(open) => { if (!open) { setRejectModal(null); setRejectReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recusar Solicitação</DialogTitle>
            <DialogDescription>
              Pedido #{rejectModal?.order_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo da recusa *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explique o motivo da recusa..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectModal(null); setRejectReason(''); }}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || actionLoading === rejectModal?.id}
            >
              {actionLoading === rejectModal?.id ? 'Recusando...' : 'Confirmar Recusa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Modal */}
      {selectedOrderId && (
        <OrderDetailsModal
          orderId={selectedOrderId}
          isOpen={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </>
  );
};
