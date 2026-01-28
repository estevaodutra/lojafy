import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Users,
  Phone,
  Mail,
  Calendar,
  IdCard,
  Copy,
  MapPin,
  ShoppingBag,
  Clock,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserDetailsModalProps {
  user: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    created_at: string;
    last_sign_in_at?: string;
    role: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Address {
  id: string;
  type: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  is_default: boolean;
}

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: number;
  status: string;
  order_items?: any[];
}

export const UserDetailsModal = ({ user, isOpen, onClose }: UserDetailsModalProps) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isOpen) {
      fetchUserDetails();
    }
  }, [user, isOpen]);

  const fetchUserDetails = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch addresses
      const { data: addressData, error: addressError } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.user_id);

      if (addressError) throw addressError;
      setAddresses(addressData || []);

      // Fetch orders
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          total_amount,
          status,
          order_items(id)
        `)
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (orderError) throw orderError;
      setOrders(orderData || []);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: 'ID copiado para área de transferência',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      confirmed: { label: 'Confirmado', variant: 'default' },
      processing: { label: 'Processando', variant: 'secondary' },
      shipped: { label: 'Enviado', variant: 'default' },
      delivered: { label: 'Entregue', variant: 'default' },
      cancelled: { label: 'Cancelado', variant: 'destructive' },
    };
    return statusMap[status] || { label: status, variant: 'outline' };
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Administrador',
      reseller: 'Revendedor',
      supplier: 'Fornecedor',
      customer: 'Cliente',
    };
    return labels[role] || role;
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Detalhes do Usuário
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Carregando detalhes...</div>
        ) : (
          <div className="space-y-4">
            {/* Personal Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Informações Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {user.first_name} {user.last_name}
                    </span>
                  </div>
                  <div>
                    <Badge variant="outline">{getRoleLabel(user.role)}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{user.email}</span>
                </div>

                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{user.phone}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    Cliente desde {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>

                {user.last_sign_in_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>
                      Último acesso: {format(new Date(user.last_sign_in_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-mono text-muted-foreground truncate max-w-[200px]">
                    {user.user_id}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(user.user_id)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Addresses */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereços ({addresses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {addresses.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum endereço cadastrado</p>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <div key={address.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{address.type}</p>
                            <p className="text-sm text-muted-foreground">
                              {address.street}, {address.number}
                              {address.complement && `, ${address.complement}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {address.neighborhood} - {address.city}/{address.state}
                            </p>
                            <p className="text-sm text-muted-foreground">CEP: {address.zip_code}</p>
                          </div>
                          {address.is_default && (
                            <Badge variant="default" className="text-xs">
                              Padrão
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Orders */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Histórico de Pedidos ({orders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum pedido realizado</p>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => {
                      const statusInfo = getStatusBadge(order.status);
                      return (
                        <div key={order.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{order.order_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {order.order_items?.length || 0} item(s)
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(Number(order.total_amount))}
                              </p>
                              <Badge variant={statusInfo.variant} className="text-xs">
                                {statusInfo.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {orders.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        e mais {orders.length - 5} pedido(s)...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
