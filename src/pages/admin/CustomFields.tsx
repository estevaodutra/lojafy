import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Search,
  SlidersHorizontal,
  Type,
  ListFilter,
  Hash,
  AlignLeft,
  Calendar,
  ToggleLeft,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Layers,
  X,
  Tag,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  useCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
  CustomFieldDefinition,
  CustomFieldType,
} from '@/services/customFieldsService';

const FIELD_TYPES: { value: CustomFieldType; label: string; icon: React.ComponentType<any>; color: string; description: string }[] = [
  {
    value: 'text',
    label: 'Texto Livre',
    icon: Type,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    description: 'Texto curto de uma linha (ex: ID de Grupo, código, cargo, etc.)',
  },
  {
    value: 'select',
    label: 'Menu Suspenso (Seleção)',
    icon: ListFilter,
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    description: 'Lista suspensa de opções pré-definidas para escolha rápida',
  },
  {
    value: 'number',
    label: 'Número',
    icon: Hash,
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    description: 'Valores numéricos, valores monetários ou quantidades',
  },
  {
    value: 'textarea',
    label: 'Texto Longo',
    icon: AlignLeft,
    color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    description: 'Anotações detalhadas, histórico ou observações extensas',
  },
  {
    value: 'date',
    label: 'Data',
    icon: Calendar,
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    description: 'Seleção de data no calendário',
  },
  {
    value: 'boolean',
    label: 'Sim / Não (Booleano)',
    icon: ToggleLeft,
    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    description: 'Opção binária afirmativa ou negativa (Sim/Não)',
  },
];

export const CustomFields: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: fields = [], isLoading } = useCustomFields();
  const createMutation = useCreateCustomField();
  const updateMutation = useUpdateCustomField();
  const deleteMutation = useDeleteCustomField();

  // Filtros
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Estado do Modal de Criar/Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formKey, setFormKey] = useState('');
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false);
  const [formType, setFormType] = useState<CustomFieldType>('text');
  const [formDescription, setFormDescription] = useState('');
  const [formPlaceholder, setFormPlaceholder] = useState('');
  const [formRequired, setFormRequired] = useState(false);
  const [formActive, setFormActive] = useState(true);

  // Opções para tipo 'select'
  const [optionsList, setOptionsList] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState('');

  // Estado de confirmação de exclusão
  const [deletingField, setDeletingField] = useState<CustomFieldDefinition | null>(null);

  // Auto-gerar slug a partir do nome
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!isKeyManuallyEdited && !editingField) {
      setFormKey(generateSlug(val));
    }
  };

  const handleOpenCreateModal = () => {
    setEditingField(null);
    setFormName('');
    setFormKey('');
    setIsKeyManuallyEdited(false);
    setFormType('text');
    setFormDescription('');
    setFormPlaceholder('');
    setFormRequired(false);
    setFormActive(true);
    setOptionsList([]);
    setNewOptionInput('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setFormName(field.name);
    setFormKey(field.key);
    setIsKeyManuallyEdited(true);
    setFormType(field.field_type);
    setFormDescription(field.description || '');
    setFormPlaceholder(field.placeholder || '');
    setFormRequired(field.is_required);
    setFormActive(field.is_active);
    setOptionsList(field.options || []);
    setNewOptionInput('');
    setIsModalOpen(true);
  };

  const handleAddOption = () => {
    const trimmed = newOptionInput.trim();
    if (!trimmed) return;
    if (optionsList.includes(trimmed)) {
      toast({
        title: 'Opção já adicionada',
        description: 'Essa opção já existe na lista deste menu suspenso.',
        variant: 'destructive',
      });
      return;
    }
    setOptionsList([...optionsList, trimmed]);
    setNewOptionInput('');
  };

  const handleRemoveOption = (indexToRemove: number) => {
    setOptionsList(optionsList.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Por favor, insira o nome do campo.', variant: 'destructive' });
      return;
    }

    const finalKey = (formKey.trim() || generateSlug(formName)).toLowerCase();
    if (!finalKey) {
      toast({ title: 'Chave obrigatória', description: 'Por favor, forneça uma chave identificadora.', variant: 'destructive' });
      return;
    }

    if (formType === 'select' && optionsList.length === 0) {
      toast({
        title: 'Opções obrigatórias',
        description: 'Campos do tipo Menu Suspenso precisam de pelo menos uma opção cadastrada.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingField) {
        await updateMutation.mutateAsync({
          id: editingField.id,
          data: {
            name: formName.trim(),
            field_type: formType,
            description: formDescription.trim() || null,
            placeholder: formPlaceholder.trim() || null,
            options: formType === 'select' ? optionsList : [],
            is_required: formRequired,
            is_active: formActive,
          },
        });
        toast({ title: 'Campo atualizado!', description: `O campo "${formName}" foi atualizado com sucesso.` });
      } else {
        await createMutation.mutateAsync({
          name: formName.trim(),
          key: finalKey,
          field_type: formType,
          description: formDescription.trim() || undefined,
          placeholder: formPlaceholder.trim() || undefined,
          options: formType === 'select' ? optionsList : [],
          is_required: formRequired,
          is_active: formActive,
        });
        toast({
          title: 'Campo criado com sucesso!',
          description: `O campo "${formName}" agora está disponível no card do lead.`,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar campo',
        description: err.message || 'Ocorreu um erro ao processar a operação.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (field: CustomFieldDefinition) => {
    try {
      await updateMutation.mutateAsync({
        id: field.id,
        data: { is_active: !field.is_active },
      });
      toast({
        title: field.is_active ? 'Campo desativado' : 'Campo ativado',
        description: `O campo "${field.name}" foi ${field.is_active ? 'desativado' : 'ativado'}.`,
      });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingField) return;
    try {
      await deleteMutation.mutateAsync(deletingField.id);
      toast({
        title: 'Campo excluído',
        description: `O campo "${deletingField.name}" foi removido do sistema.`,
      });
      setDeletingField(null);
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    }
  };

  // Filtragem
  const filteredFields = useMemo(() => {
    return fields.filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.key.toLowerCase().includes(search.toLowerCase()) ||
        (f.description && f.description.toLowerCase().includes(search.toLowerCase()));

      const matchesType = typeFilter === 'all' || f.field_type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [fields, search, typeFilter]);

  // Contadores
  const stats = useMemo(() => {
    return {
      total: fields.length,
      active: fields.filter((f) => f.is_active).length,
      select: fields.filter((f) => f.field_type === 'select').length,
      text: fields.filter((f) => f.field_type === 'text' || f.field_type === 'textarea').length,
      number: fields.filter((f) => f.field_type === 'number').length,
    };
  }, [fields]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Topo / Voltar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/super-admin/recursos')}
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Recursos</span>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <SlidersHorizontal className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Campos Personalizados
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Crie e configure campos dinâmicos (ID de Grupo, menus suspensos, números e texto livre) para preenchimento direto no card do lead.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleOpenCreateModal}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Campo</span>
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border/70 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total de Campos</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {stats.active} ativos no card do lead
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Menus Suspensos</p>
              <p className="text-2xl font-bold text-foreground">{stats.select}</p>
              <p className="text-[11px] text-muted-foreground">Opções configuráveis</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ListFilter className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Texto Livre</p>
              <p className="text-2xl font-bold text-foreground">{stats.text}</p>
              <p className="text-[11px] text-muted-foreground">IDs, observações, etc.</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Type className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Numéricos</p>
              <p className="text-2xl font-bold text-foreground">{stats.number}</p>
              <p className="text-[11px] text-muted-foreground">Valores ou métricas</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Hash className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="border border-border/70 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou chave..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Filtrar por tipo:</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-9">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Campos */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground space-y-2">
          <SlidersHorizontal className="h-8 w-8 mx-auto animate-pulse text-muted-foreground/60" />
          <p>Carregando campos personalizados...</p>
        </div>
      ) : filteredFields.length === 0 ? (
        <Card className="border-dashed border-2 py-12 text-center">
          <CardContent className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-base">Nenhum campo encontrado</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search || typeFilter !== 'all'
                  ? 'Nenhum campo corresponde aos filtros aplicados.'
                  : 'Comece criando seu primeiro campo personalizado para usar no card do lead.'}
              </p>
            </div>
            {!search && typeFilter === 'all' && (
              <Button onClick={handleOpenCreateModal} size="sm" className="mt-2">
                <Plus className="w-4 h-4 mr-1.5" />
                Criar Campo Personalizado
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFields.map((field) => {
            const typeConfig = FIELD_TYPES.find((t) => t.value === field.field_type) || FIELD_TYPES[0];
            const TypeIcon = typeConfig.icon;

            return (
              <Card
                key={field.id}
                className={`border transition-all duration-200 hover:shadow-md ${
                  field.is_active ? 'border-border/80 bg-card' : 'border-border/40 bg-muted/20 opacity-70'
                }`}
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${typeConfig.color}`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-semibold">{field.name}</CardTitle>
                          {field.is_required && (
                            <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-500/30">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                            {field.key}
                          </span>
                          <Badge variant="outline" className={`text-[10px] ${typeConfig.color}`}>
                            {typeConfig.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEditModal(field)}
                        title="Editar campo"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingField(field)}
                        title="Excluir campo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-3">
                  {field.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{field.description}</p>
                  )}

                  {/* Detalhes específicos de tipo */}
                  {field.field_type === 'select' && field.options && field.options.length > 0 && (
                    <div className="pt-2 border-t space-y-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        <ListFilter className="w-3 h-3" />
                        Opções cadastradas ({field.options.length}):
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {field.options.map((opt, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-[11px] font-normal bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                          >
                            {opt}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {field.placeholder && (
                    <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
                      <span className="font-medium text-muted-foreground">Exemplo / Placeholder:</span>
                      <span className="italic truncate">{field.placeholder}</span>
                    </div>
                  )}

                  {/* Rodapé do Card com status */}
                  <div className="flex items-center justify-between pt-2 border-t text-xs">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.is_active}
                        onCheckedChange={() => handleToggleActive(field)}
                        id={`active-${field.id}`}
                      />
                      <Label htmlFor={`active-${field.id}`} className="text-xs cursor-pointer text-muted-foreground">
                        {field.is_active ? 'Disponível no Card do Lead' : 'Inativo no Card'}
                      </Label>
                    </div>

                    <span className="text-[11px] text-muted-foreground">
                      {field.is_active ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ativo
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Inativo
                        </span>
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição de Campo */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveField}>
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
                {editingField ? 'Editar Campo Personalizado' : 'Novo Campo Personalizado'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Defina como o campo será apresentado e preenchido dentro do card do lead.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Nome do Campo */}
              <div className="space-y-1.5">
                <Label htmlFor="field-name" className="text-sm font-medium">
                  Nome do Campo <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="field-name"
                  placeholder="Ex: ID de Grupo, Origem do Lead, Cargo..."
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>

              {/* Chave Identificadora */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="field-key" className="text-sm font-medium flex items-center gap-1.5">
                    Chave Identificadora (Slug) <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Usada para integrações e identificação</span>
                </div>
                <Input
                  id="field-key"
                  placeholder="Ex: id_grupo ou origem_lead"
                  value={formKey}
                  disabled={!!editingField}
                  onChange={(e) => {
                    setIsKeyManuallyEdited(true);
                    setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
                  }}
                  className="font-mono text-xs"
                  required
                />
              </div>

              {/* Tipo de Campo */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Tipo de Informação <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formType}
                  onValueChange={(val) => setFormType(val as CustomFieldType)}
                  disabled={!!editingField}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => {
                      const Icon = t.icon;
                      return (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span>{t.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {FIELD_TYPES.find((t) => t.value === formType)?.description}
                </p>
              </div>

              {/* Gerenciador de Opções quando for 'select' */}
              {formType === 'select' && (
                <div className="space-y-2 p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <ListFilter className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Opções do Menu Suspenso <span className="text-rose-500">*</span>
                    </Label>
                    <span className="text-[11px] text-purple-600/80 dark:text-purple-400/80">
                      {optionsList.length} {optionsList.length === 1 ? 'opção' : 'opções'}
                    </span>
                  </div>

                  {/* Input de nova opção */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite uma opção e pressione Enter (ex: Grupo VIP, Meta Ads...)"
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                      className="h-8 text-xs bg-background"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddOption}
                      variant="secondary"
                      className="h-8 px-3 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {/* Lista de opções com badge */}
                  {optionsList.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic py-1">
                      Nenhuma opção adicionada ainda. Adicione as opções que estarão no menu suspenso.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 pt-1 max-h-32 overflow-y-auto">
                      {optionsList.map((opt, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                        >
                          <span>{opt}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            className="hover:text-rose-500 p-0.5 rounded transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Placeholder */}
              <div className="space-y-1.5">
                <Label htmlFor="field-placeholder" className="text-sm font-medium">
                  Exemplo de Preenchimento (Placeholder)
                </Label>
                <Input
                  id="field-placeholder"
                  placeholder="Ex: GRP-9020 ou selecione uma opção..."
                  value={formPlaceholder}
                  onChange={(e) => setFormPlaceholder(e.target.value)}
                />
              </div>

              {/* Descrição / Ajuda */}
              <div className="space-y-1.5">
                <Label htmlFor="field-desc" className="text-sm font-medium">
                  Descrição / Instrução para quem preenche
                </Label>
                <Textarea
                  id="field-desc"
                  placeholder="Explique o que deve ser colocado nesse campo ao visualizar o lead..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Switches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="modal-required" className="text-xs font-medium cursor-pointer">
                      Preenchimento Obrigatório
                    </Label>
                    <p className="text-[11px] text-muted-foreground">Exigir valor ao cadastrar</p>
                  </div>
                  <Switch id="modal-required" checked={formRequired} onCheckedChange={setFormRequired} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="modal-active" className="text-xs font-medium cursor-pointer">
                      Campo Ativo
                    </Label>
                    <p className="text-[11px] text-muted-foreground">Disponível no card do lead</p>
                  </div>
                  <Switch id="modal-active" checked={formActive} onCheckedChange={setFormActive} />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : editingField ? 'Salvar Alterações' : 'Criar Campo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deletingField} onOpenChange={(open) => !open && setDeletingField(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Excluir Campo Personalizado
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir o campo{' '}
              <strong>"{deletingField?.name}"</strong>?
              <br />
              <br />
              Esta ação removerá este campo da seleção no card dos leads e todos os valores salvos para este campo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Excluir Campo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomFields;
