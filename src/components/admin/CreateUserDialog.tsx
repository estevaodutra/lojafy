import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserPlus, Mail, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  expiration_period: z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'lifetime'], {
    required_error: 'Período de expiração obrigatório'
  }),
  features: z.array(z.string()).optional(),
  send_post_sale: z.boolean().default(true),
});

const calculateExpirationDate = (period: string): Date | null => {
  const now = new Date();
  switch (period) {
    case 'monthly':
      return new Date(now.setMonth(now.getMonth() + 1));
    case 'quarterly':
      return new Date(now.setMonth(now.getMonth() + 3));
    case 'semiannual':
      return new Date(now.setMonth(now.getMonth() + 6));
    case 'annual':
      return new Date(now.setFullYear(now.getFullYear() + 1));
    case 'lifetime':
      return null;
    default:
      return null;
  }
};

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
      // Chamar Edge Function para criar usuário (usa SERVICE_ROLE_KEY no backend)
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          name: values.name,
          email: values.email,
          phone: cleanPhone(values.phone),
          cpf: values.cpf ? cleanCPF(values.cpf) : null,
          role: values.role,
          plan: values.plan,
          expiration_period: values.expiration_period,
          features: selectedFeatures,
          send_post_sale: values.send_post_sale,
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao criar usuário');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao criar usuário');
      }

      // Sucesso - a Edge Function já cuidou do webhook se necessário
      toast({ 
        title: 'Usuário criado com sucesso!', 
        description: values.send_post_sale ? 'Pós-venda enviado.' : undefined 
      });

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

            {/* Período de Expiração */}
            <FormField
              control={form.control}
              name="expiration_period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Período de Expiração *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o período" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="monthly">📅 Mensal (30 dias)</SelectItem>
                      <SelectItem value="quarterly">📅 Trimestral (3 meses)</SelectItem>
                      <SelectItem value="semiannual">📅 Semestral (6 meses)</SelectItem>
                      <SelectItem value="annual">📅 Anual (12 meses)</SelectItem>
                      <SelectItem value="lifetime">♾️ Vitalício</SelectItem>
                    </SelectContent>
                  </Select>
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
