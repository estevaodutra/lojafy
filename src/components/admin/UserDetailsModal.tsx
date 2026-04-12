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
  Clock,
  UserCog,
  Save,
  Loader2,
  CalendarClock,
  Package,
  Wallet,
  Zap,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatPhone } from '@/lib/phone';
import { UserFeaturesSection } from './UserFeaturesSection';
import { UserOrdersTab } from './UserOrdersTab';
import { UserWalletTab } from './UserWalletTab';

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

export const UserDetailsModal = ({ user, isOpen, onClose, onUserUpdated }: UserDetailsModalProps) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [editedPhone, setEditedPhone] = useState('');
  const [editedRole, setEditedRole] = useState('customer');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setEditedPhone(user.phone || '');
      setEditedRole(user.role);
      setHasChanges(false);
      fetchAddresses();
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (user) {
      const changed = editedPhone !== (user.phone || '') || editedRole !== user.role;
      setHasChanges(changed);
    }
  }, [editedPhone, editedRole, user]);

  const handleSaveChanges = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ phone: editedPhone })
        .eq('user_id', user.user_id);
      if (profileError) throw profileError;

      if (editedRole !== user.role) {
        await supabase.from('user_roles').delete().eq('user_id', user.user_id);
        const { data: currentUser } = await supabase.auth.getUser();
        const { error: roleError } = await supabase.from('user_roles').insert({
          user_id: user.user_id,
          role: editedRole as any,
          granted_by: currentUser.user?.id,
        } as any);
        if (roleError) throw roleError;
      }

      toast({ title: 'Sucesso!', description: 'Informações atualizadas com sucesso' });
      onUserUpdated?.();
      setHasChanges(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Falha ao atualizar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const fetchAddresses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.user_id);
      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'ID copiado para área de transferência' });
  };

  if (!user) return null;

  const userName = `${user.first_name} ${user.last_name}`;

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
            {/* Personal Info - always visible */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Informações Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{userName}</span>
                </div>

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
                        <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email
                  </Label>
                  <span className="text-sm">{user.email}</span>
                </div>

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

                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <CalendarClock className="w-4 h-4 text-muted-foreground" />
                    Plano
                  </Label>
                  <Badge variant={user.subscription_plan === 'premium' ? 'default' : 'secondary'}>
                    {user.subscription_plan === 'premium' ? 'Premium' : 'Free'}
                  </Badge>
                </div>

                {user.subscription_expires_at && (
                  <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                    <Label className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Expira em
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm", new Date(user.subscription_expires_at) < new Date() ? "text-destructive" : "text-foreground")}>
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

                <div className="flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-mono text-muted-foreground truncate max-w-[200px]">
                    {user.user_id}
                  </span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(user.user_id)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>

                {hasChanges && (
                  <div className="flex justify-end pt-2 border-t">
                    <Button onClick={handleSaveChanges} disabled={isSaving} size="sm">
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Salvar Alterações
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="geral" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="geral" className="text-xs sm:text-sm">
                  <MapPin className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
                  Geral
                </TabsTrigger>
                <TabsTrigger value="pedidos" className="text-xs sm:text-sm">
                  <Package className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
                  Pedidos
                </TabsTrigger>
                <TabsTrigger value="carteira" className="text-xs sm:text-sm">
                  <Wallet className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
                  Carteira
                </TabsTrigger>
                <TabsTrigger value="features" className="text-xs sm:text-sm">
                  <Zap className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
                  Features
                </TabsTrigger>
              </TabsList>

              <TabsContent value="geral">
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
                                <Badge variant="default" className="text-xs">Padrão</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pedidos">
                <UserOrdersTab userId={user.user_id} />
              </TabsContent>

              <TabsContent value="carteira">
                <UserWalletTab userId={user.user_id} userName={userName} />
              </TabsContent>

              <TabsContent value="features">
                <UserFeaturesSection userId={user.user_id} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
