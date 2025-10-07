import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCep, validateCep, fetchAddressByCep } from '@/lib/cep';
import { formatCPF, validateCPF } from '@/lib/cpf';
import { User, Mail, Phone, Shield, LogOut, MapPin, Plus, Edit, Trash2, Loader2 } from 'lucide-react';

interface Profile {
  first_name: string;
  last_name: string;
  phone: string;
  cpf: string;
}

interface Address {
  id?: string;
  user_id?: string;
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

const Settings = () => {
  const { effectiveUserId, originalUser } = useEffectiveUser();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile>({
    first_name: '',
    last_name: '',
    phone: '',
    cpf: ''
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [addressForm, setAddressForm] = useState<Address>({
    type: 'home',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
    is_default: false
  });

  useEffect(() => {
    fetchProfile();
    fetchAddresses();
  }, [effectiveUserId]);

  const fetchProfile = async () => {
    if (!effectiveUserId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, cpf')
        .eq('user_id', effectiveUserId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUserId) return;

    // Validar CPF se fornecido
    if (profile.cpf && !validateCPF(profile.cpf)) {
      toast({ 
        title: 'CPF inválido', 
        description: 'Por favor, insira um CPF válido',
        variant: 'destructive' 
      });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          cpf: profile.cpf
        })
        .eq('user_id', effectiveUserId);

      if (error) throw error;
      toast({ title: 'Perfil atualizado com sucesso!' });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({ title: 'Erro ao atualizar perfil', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: 'As novas senhas não coincidem', variant: 'destructive' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({ title: 'A nova senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;
      
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({ title: 'Senha alterada com sucesso!' });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast({ title: 'Erro ao alterar senha', variant: 'destructive' });
    }
  };

  const fetchAddresses = async () => {
    if (!effectiveUserId) return;

    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
    }
  };

  const handleCepChange = async (cep: string) => {
    const formattedCep = formatCep(cep);
    setAddressForm({ ...addressForm, zip_code: formattedCep });

    if (validateCep(formattedCep)) {
      setCepLoading(true);
      try {
        const addressData = await fetchAddressByCep(formattedCep);
        setAddressForm({
          ...addressForm,
          zip_code: formattedCep,
          street: addressData.logradouro,
          neighborhood: addressData.bairro,
          city: addressData.localidade,
          state: addressData.uf
        });
      } catch (error) {
        toast({ 
          title: 'Erro ao buscar CEP', 
          description: 'CEP não encontrado ou inválido',
          variant: 'destructive' 
        });
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUserId) return;

    try {
      const addressData = {
        ...addressForm,
        user_id: effectiveUserId
      };

      if (editingAddress) {
        const { error } = await supabase
          .from('addresses')
          .update(addressData)
          .eq('id', editingAddress.id);
        if (error) throw error;
        toast({ title: 'Endereço atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('addresses')
          .insert(addressData);
        if (error) throw error;
        toast({ title: 'Endereço adicionado com sucesso!' });
      }

      fetchAddresses();
      resetAddressForm();
      setAddressDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
      toast({ title: 'Erro ao salvar endereço', variant: 'destructive' });
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressForm(address);
    setAddressDialogOpen(true);
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Endereço removido com sucesso!' });
      fetchAddresses();
    } catch (error) {
      console.error('Erro ao remover endereço:', error);
      toast({ title: 'Erro ao remover endereço', variant: 'destructive' });
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      type: 'home',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zip_code: '',
      is_default: false
    });
    setEditingAddress(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: 'Logout realizado com sucesso!' });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({ title: 'Erro ao fazer logout', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas informações pessoais, endereços e preferências da conta
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>
            Atualize suas informações pessoais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nome</Label>
                <Input
                  id="first_name"
                  value={profile.first_name}
                  onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Sobrenome</Label>
                <Input
                  id="last_name"
                  value={profile.last_name}
                  onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                  placeholder="Seu sobrenome"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile({...profile, phone: e.target.value})}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={profile.cpf}
                onChange={(e) => setProfile({...profile, cpf: formatCPF(e.target.value)})}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
            <Button type="submit" disabled={updating}>
              {updating ? 'Atualizando...' : 'Atualizar Perfil'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Address Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Meus Endereços
              </CardTitle>
              <CardDescription>
                Gerencie seus endereços de entrega
              </CardDescription>
            </div>
            <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetAddressForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Endereço
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingAddress ? 'Editar Endereço' : 'Adicionar Endereço'}
                  </DialogTitle>
                  <DialogDescription>
                    Preencha os dados do endereço. O CEP será preenchido automaticamente.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddressSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address-type">Tipo de Endereço</Label>
                    <Select
                      value={addressForm.type}
                      onValueChange={(value) => setAddressForm({...addressForm, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">Casa</SelectItem>
                        <SelectItem value="work">Trabalho</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP</Label>
                      <div className="relative">
                        <Input
                          id="cep"
                          value={addressForm.zip_code}
                          onChange={(e) => handleCepChange(e.target.value)}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                        {cepLoading && (
                          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                        )}
                      </div>
                    </div>
                  <div className="space-y-2">
                    <Label htmlFor="street">Rua</Label>
                    <Input
                      id="street"
                      value={addressForm.street}
                      onChange={(e) => setAddressForm({...addressForm, street: e.target.value})}
                      placeholder="Nome da rua"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={addressForm.number}
                        onChange={(e) => setAddressForm({...addressForm, number: e.target.value})}
                        placeholder="123"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        value={addressForm.complement}
                        onChange={(e) => setAddressForm({...addressForm, complement: e.target.value})}
                        placeholder="Apto 101"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={addressForm.neighborhood}
                      onChange={(e) => setAddressForm({...addressForm, neighborhood: e.target.value})}
                      placeholder="Nome do bairro"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm({...addressForm, state: e.target.value})}
                        placeholder="UF"
                        maxLength={2}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={addressForm.is_default}
                      onChange={(e) => setAddressForm({...addressForm, is_default: e.target.checked})}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="is_default">Definir como endereço principal</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      {editingAddress ? 'Atualizar' : 'Adicionar'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddressDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {addresses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum endereço cadastrado
              </p>
            ) : (
              addresses.map((address) => (
                <div key={address.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">
                        {address.type === 'home' ? 'Casa' : 
                         address.type === 'work' ? 'Trabalho' : 'Outro'}
                      </span>
                      {address.is_default && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                          Principal
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditAddress(address)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteAddress(address.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {address.street}, {address.number}
                    {address.complement && `, ${address.complement}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {address.neighborhood}, {address.city} - {address.state}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    CEP: {address.zip_code}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Informações da Conta
          </CardTitle>
          <CardDescription>
            Informações de login da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={originalUser?.email || ''} disabled />
              <p className="text-sm text-muted-foreground">
                Para alterar seu email, entre em contato com o suporte
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Atualize sua senha para manter sua conta segura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                placeholder="Digite sua nova senha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                placeholder="Confirme sua nova senha"
              />
            </div>
            <Button type="submit">
              Alterar Senha
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Logout */}
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
          <CardDescription>
            Ações irreversíveis da conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair da Conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;