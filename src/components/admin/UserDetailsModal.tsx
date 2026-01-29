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
  UserCog,
  Save,
  Loader2,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatPhone } from '@/lib/phone';
import { UserFeaturesSection } from './UserFeaturesSection';

const ROLES = [
  { value: 'customer', label: 'Cliente' },
  { value: 'reseller', label: 'Revendedor' },
  { value: 'supplier', label: 'Fornecedor' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

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
    subscription_plan?: string;
    subscription_expires_at?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: () => void;
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

export const UserDetailsModal = ({ user, isOpen, onClose, onUserUpdated }: UserDetailsModalProps) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Editable fields state
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedRole, setEditedRole] = useState('customer');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync state when user changes
  useEffect(() => {
    if (user && isOpen) {
      setEditedEmail(user.email);
      setEditedPhone(user.phone || '');
      setEditedRole(user.role);
      setHasChanges(false);
      fetchUserDetails();
    }
  }, [user, isOpen]);

  // Detect changes
  useEffect(() => {
    if (user) {
      const changed =
        editedEmail !== user.email ||
        editedPhone !== (user.phone || '') ||
        editedRole !== user.role;
      setHasChanges(changed);
    }
  }, [editedEmail, editedPhone, editedRole, user]);

  // Save changes
  const handleSaveChanges = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      // Update email/phone in profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          email: editedEmail,
          phone: editedPhone,
        })
        .eq('user_id', user.user_id);

      if (profileError) throw profileError;

      // Update role if changed
      if (editedRole !== user.role) {
        // Delete existing roles
        await supabase.from('user_roles').delete().eq('user_id', user.user_id);

        // Insert new role
        const { data: currentUser } = await supabase.auth.getUser();
        const { error: roleError } = await supabase.from('user_roles').insert({
          user_id: user.user_id,
          role: editedRole as any,
          granted_by: currentUser.user?.id,
        } as any);

        if (roleError) throw roleError;
      }

      toast({
        title: 'Sucesso!',
        description: 'Informações atualizadas com sucesso',
      });

      onUserUpdated?.();
      setHasChanges(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao atualizar informações',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

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
              <CardContent className="space-y-4">
                {/* Nome (não editável) */}
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {user.first_name} {user.last_name}
                  </span>
                </div>

                {/* Role (editável) */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <UserCog className="w-4 h-4 text-muted-foreground" />
                    Role
                  </Label>
                  <Select value={editedRole} onValueChange={setEditedRole}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Email (editável) */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    type="email"
                    className="max-w-[300px]"
                  />
                </div>

                {/* Telefone (editável) */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    Telefone
                  </Label>
                  <Input
                    value={editedPhone}
                    onChange={(e) => setEditedPhone(formatPhone(e.target.value))}
                    type="tel"
                    placeholder="+55 (00) 00000-0000"
                    maxLength={19}
                    className="max-w-[200px]"
                  />
                </div>

                {/* Plano */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <CalendarClock className="w-4 h-4 text-muted-foreground" />
                    Plano
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.subscription_plan === 'premium' ? 'default' : 'secondary'}>
                      {user.subscription_plan === 'premium' ? 'Premium' : 'Free'}
                    </Badge>
                  </div>
                </div>

                {/* Data de Expiração */}
                {user.subscription_expires_at && (
                  <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                    <Label className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Expira em
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm",
                        new Date(user.subscription_expires_at) < new Date() 
                          ? "text-destructive" 
                          : "text-foreground"
                      )}>
                        {format(new Date(user.subscription_expires_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      {new Date(user.subscription_expires_at) < new Date() && (
                        <Badge variant="destructive" className="text-xs">Expirado</Badge>
                      )}
                    </div>
                  </div>
                )}

                {!user.subscription_expires_at && user.subscription_plan === 'premium' && (
                  <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                    <Label className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Expira em
                    </Label>
                    <Badge variant="outline" className="text-xs w-fit">Vitalício</Badge>
                  </div>
                )}

                {/* Informações não editáveis */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Cliente desde {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>

                {user.last_sign_in_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Último acesso: {format(new Date(user.last_sign_in_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}

                {/* ID */}
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

                {/* Botão Salvar */}
                {hasChanges && (
                  <div className="flex justify-end pt-2 border-t">
                    <Button
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      size="sm"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar Alterações
                    </Button>
                  </div>
                )}
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

            {/* Features Section */}
            <UserFeaturesSection userId={user.user_id} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
