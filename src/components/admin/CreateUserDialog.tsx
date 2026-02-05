import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserPlus, CalendarIcon, Mail, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCPF, cleanCPF } from '@/lib/cpf';
import { formatPhone, cleanPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z.string().optional().refine(
    (val) => !val || cleanCPF(val).length === 11,
    'CPF deve ter 11 dígitos'
  ),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone obrigatório'),
  role: z.enum(['customer', 'reseller', 'supplier']),
  plan: z.enum(['free', 'premium']),
  expires_at: z.date({ required_error: 'Data de expiração obrigatória' }),
  features: z.array(z.string()).optional(),
  send_post_sale: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface Feature {
  id: string;
  nome: string;
}

export const CreateUserDialog = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: 'reseller',
      plan: 'free',
      send_post_sale: true,
      features: [],
    },
  });

  useEffect(() => {
    const fetchFeatures = async () => {
      const { data } = await supabase
        .from('features')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (data) setFeatures(data);
    };
    fetchFeatures();
  }, []);

  const generatePassword = () => {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `LojaFy${year}@${random}`;
  };

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => {
      const newSelection = prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId];
      form.setValue('features', newSelection);
      return newSelection;
    });
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const formatted = formatCPF(e.target.value);
    onChange(formatted);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const formatted = formatPhone(e.target.value);
    onChange(formatted);
  };

  const onSubmit = async (values: FormValues) => {
    setIsCreating(true);
    try {
      const tempPassword = generatePassword();
      const names = values.name.trim().split(' ');
      const firstName = names[0];
      const lastName = names.slice(1).join(' ') || '';

      // 1. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: values.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      });

      if (authError) throw authError;

      // 2. Atualizar profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: cleanPhone(values.phone),
          cpf: values.cpf ? cleanCPF(values.cpf) : null,
          role: values.role,
          subscription_plan: values.plan,
          subscription_expires_at: values.expires_at.toISOString(),
        })
        .eq('user_id', authData.user.id);

      if (profileError) throw profileError;

      // 3. Atribuir features selecionadas
      if (selectedFeatures.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const featureInserts = selectedFeatures.map(featureId => ({
          user_id: authData.user.id,
          feature_id: featureId,
          status: 'ativo' as const,
          tipo_periodo: 'mensal' as const,
          data_inicio: new Date().toISOString(),
          data_expiracao: values.expires_at.toISOString(),
          atribuido_por: user?.id,
          motivo: 'Atribuição na criação do usuário',
        }));
        await supabase.from('user_features').insert(featureInserts);
      }

      // 4. Disparar webhook se toggle ativo
      if (values.send_post_sale) {
        try {
          const selectedPlan = values.plan === 'free' ? 'Free' : 'Premium';
          await fetch('https://n8n-n8n.nuwfic.easypanel.host/webhook/FN_onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              usuario_id: authData.user.id,
              nome: values.name,
              cpf: values.cpf ? cleanCPF(values.cpf) : null,
              email: values.email,
              telefone: cleanPhone(values.phone),
              role: values.role,
              plano_id: values.plan,
              plano_nome: selectedPlan,
              expiracao: values.expires_at.toISOString(),
              features: selectedFeatures,
              created_at: new Date().toISOString(),
            }),
          });
          toast({ title: 'Usuário criado!', description: 'Pós-venda enviado.' });
        } catch {
          toast({
            title: 'Usuário criado',
            description: 'Falha ao enviar pós-venda',
          });
        }
      } else {
        toast({ title: 'Usuário criado com sucesso!' });
      }

      handleClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      if (error.message?.includes('already')) {
        toast({ title: 'Este email já está cadastrado', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao criar usuário', description: error.message, variant: 'destructive' });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedFeatures([]);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Criar Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CPF e Email */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="000.000.000-00"
                        value={field.value || ''}
                        onChange={(e) => handleCPFChange(e, field.onChange)}
                        maxLength={14}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Telefone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={field.value || ''}
                      onChange={(e) => handlePhoneChange(e, field.onChange)}
                      maxLength={19}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role e Plano */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Usuário *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="customer">Cliente</SelectItem>
                        <SelectItem value="reseller">Revendedor</SelectItem>
                        <SelectItem value="supplier">Fornecedor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plano *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="free">🆓 Free</SelectItem>
                        <SelectItem value="premium">💎 Premium</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Expiração */}
            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expiração *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione a data de expiração</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Features */}
            <div className="space-y-2">
              <FormLabel>Features</FormLabel>
              <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px]">
                {features.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Nenhuma feature disponível</span>
                ) : (
                  features.map((feature) => {
                    const isSelected = selectedFeatures.includes(feature.id);
                    return (
                      <Badge
                        key={feature.id}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer transition-colors"
                        onClick={() => toggleFeature(feature.id)}
                      >
                        {feature.nome}
                        {isSelected && <X className="ml-1 h-3 w-3" />}
                      </Badge>
                    );
                  })
                )}
              </div>
            </div>

            {/* Toggle Pós-Venda */}
            <FormField
              control={form.control}
              name="send_post_sale"
              render={({ field }) => (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Enviar pós-venda</span>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Envia email e WhatsApp com link de acesso ao criar o usuário
                  </p>
                </div>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
