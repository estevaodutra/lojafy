import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Type,
  ListFilter,
  Hash,
  AlignLeft,
  Calendar,
  ToggleLeft,
  Info,
  Loader2,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  useCustomFields,
  useLeadCustomFields,
  useSaveLeadFieldValue,
  useDeleteLeadFieldValue,
  CustomFieldDefinition,
  LeadCustomFieldValue,
  CustomFieldType,
} from '@/services/customFieldsService';

interface LeadCustomFieldsSectionProps {
  leadId: string;
  leadName?: string;
}

const FIELD_ICONS: Record<CustomFieldType, React.ComponentType<any>> = {
  text: Type,
  select: ListFilter,
  number: Hash,
  textarea: AlignLeft,
  date: Calendar,
  boolean: ToggleLeft,
};

export const LeadCustomFieldsSection: React.FC<LeadCustomFieldsSectionProps> = ({
  leadId,
  leadName,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: allFields = [], isLoading: isLoadingFields } = useCustomFields();
  const { data: leadValues = [], isLoading: isLoadingValues } = useLeadCustomFields(leadId);
  const saveValueMutation = useSaveLeadFieldValue();
  const deleteValueMutation = useDeleteLeadFieldValue();

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');

  // Editing state
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Apenas campos ativos
  const activeFields = allFields.filter((f) => f.is_active);

  // Mapeia definições por ID
  const fieldsMap = new Map<string, CustomFieldDefinition>(allFields.map((f) => [f.id, f]));

  // Identifica campos já preenchidos
  const filledFieldIds = new Set(leadValues.map((v) => v.field_id));
  const availableFieldsToAdd = activeFields.filter((f) => !filledFieldIds.has(f.id));

  // Campo selecionado no modal
  const currentSelectedField = selectedFieldId ? fieldsMap.get(selectedFieldId) : null;

  const handleOpenAddModal = (defaultFieldId?: string) => {
    const fieldToUse = defaultFieldId || (availableFieldsToAdd.length > 0 ? availableFieldsToAdd[0].id : '');
    setSelectedFieldId(fieldToUse);
    setInputValue('');
    setIsAddModalOpen(true);
  };

  const handleFieldChange = (fieldId: string) => {
    setSelectedFieldId(fieldId);
    const field = fieldsMap.get(fieldId);
    if (field?.field_type === 'boolean') {
      setInputValue('true');
    } else if (field?.field_type === 'select' && field.options.length > 0) {
      setInputValue(field.options[0]);
    } else {
      setInputValue('');
    }
  };

  const handleSaveFieldToLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFieldId) {
      toast({ title: 'Selecione um campo', description: 'Escolha qual campo deseja adicionar ao lead.', variant: 'destructive' });
      return;
    }

    if (!inputValue.trim() && currentSelectedField?.field_type !== 'boolean') {
      toast({ title: 'Preencha o valor', description: 'Informe o valor para este campo.', variant: 'destructive' });
      return;
    }

    try {
      await saveValueMutation.mutateAsync({
        leadId,
        fieldId: selectedFieldId,
        value: inputValue.trim(),
      });

      toast({
        title: 'Campo adicionado!',
        description: `Informação adicionada com sucesso ao card do lead.`,
      });
      setIsAddModalOpen(false);
      setSelectedFieldId('');
      setInputValue('');
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar informação',
        description: err.message || 'Falha ao salvar campo no lead.',
        variant: 'destructive',
      });
    }
  };

  const handleStartInlineEdit = (val: LeadCustomFieldValue) => {
    setEditingValueId(val.id);
    setEditingText(val.value);
  };

  const handleSaveInlineEdit = async (val: LeadCustomFieldValue) => {
    if (!editingText.trim() && val.field?.field_type !== 'boolean') {
      toast({ title: 'Valor obrigatório', description: 'O valor não pode ficar vazio.', variant: 'destructive' });
      return;
    }

    try {
      await saveValueMutation.mutateAsync({
        leadId,
        fieldId: val.field_id,
        value: editingText.trim(),
      });
      setEditingValueId(null);
      toast({ title: 'Atualizado!', description: 'Campo atualizado no lead com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteFieldFromLead = async (val: LeadCustomFieldValue) => {
    try {
      await deleteValueMutation.mutateAsync({
        leadId,
        fieldId: val.field_id,
      });
      toast({
        title: 'Campo removido',
        description: 'A informação foi removida deste lead.',
      });
    } catch (err: any) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    }
  };

  const renderValueDisplay = (val: LeadCustomFieldValue) => {
    const field = val.field || fieldsMap.get(val.field_id);
    const fieldType = field?.field_type || 'text';

    if (fieldType === 'select') {
      return (
        <Badge
          variant="secondary"
          className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 font-medium px-2 py-0.5 text-xs"
        >
          {val.value}
        </Badge>
      );
    }

    if (fieldType === 'boolean') {
      const isTrue = val.value === 'true' || val.value === 'Sim';
      return (
        <Badge
          variant="outline"
          className={
            isTrue
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
          }
        >
          {isTrue ? 'Sim' : 'Não'}
        </Badge>
      );
    }

    if (fieldType === 'number') {
      return <span className="font-mono font-medium text-foreground">{val.value}</span>;
    }

    if (fieldType === 'date') {
      return <span className="font-medium text-foreground">{val.value}</span>;
    }

    return <span className="text-foreground text-sm break-all font-medium">{val.value}</span>;
  };

  return (
    <div className="pt-3 border-t space-y-3">
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h4 className="text-sm font-semibold text-foreground">Campos Personalizados</h4>
          {leadValues.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {leadValues.length}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenAddModal()}
            className="h-7 text-xs px-2.5 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Campo</span>
          </Button>
        </div>
      </div>

      {/* Lista de Campos já preenchidos neste lead */}
      {isLoadingFields || isLoadingValues ? (
        <div className="p-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Carregando campos do lead...</span>
        </div>
      ) : leadValues.length === 0 ? (
        <div className="rounded-lg border border-dashed p-3.5 text-center bg-muted/10 space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Nenhum campo personalizado adicionado a este lead ainda.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleOpenAddModal()}
              className="h-7 text-xs text-primary hover:text-primary/90 underline font-medium p-0"
            >
              + Adicionar campo agora (ID de Grupo, opções, etc.)
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {leadValues.map((val) => {
            const field = val.field || fieldsMap.get(val.field_id);
            const fieldType = field?.field_type || 'text';
            const FieldIcon = FIELD_ICONS[fieldType] || Type;
            const isEditing = editingValueId === val.id;

            return (
              <div
                key={val.id}
                className="p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors flex flex-col justify-between gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FieldIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs font-semibold text-muted-foreground truncate" title={field?.name}>
                      {field?.name || 'Campo'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleStartInlineEdit(val)}
                        className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                        title="Editar valor"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteFieldFromLead(val)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                      title="Remover campo deste lead"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Exibição ou Edição do Valor */}
                {isEditing ? (
                  <div className="space-y-1.5 pt-1">
                    {fieldType === 'select' && field?.options && field.options.length > 0 ? (
                      <Select value={editingText} onValueChange={setEditingText}>
                        <SelectTrigger className="h-7 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((opt, i) => (
                            <SelectItem key={i} value={opt} className="text-xs">
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : fieldType === 'boolean' ? (
                      <Select value={editingText} onValueChange={setEditingText}>
                        <SelectTrigger className="h-7 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true" className="text-xs">
                            Sim
                          </SelectItem>
                          <SelectItem value="false" className="text-xs">
                            Não
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : fieldType === 'number' ? (
                      <Input
                        type="number"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="h-7 text-xs bg-background"
                      />
                    ) : (
                      <Input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="h-7 text-xs bg-background"
                      />
                    )}

                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setEditingValueId(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        className="h-6 w-6 bg-primary"
                        onClick={() => handleSaveInlineEdit(val)}
                        disabled={saveValueMutation.isPending}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-0.5">{renderValueDisplay(val)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal / Diálogo para "Add Campo" no Card do Lead */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveFieldToLead}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                Adicionar Campo Personalizado ao Lead
              </DialogTitle>
              <DialogDescription className="text-xs">
                Selecione o campo desejado e preencha as informações do lead.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Seleção do Campo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="select-field" className="text-xs font-medium">
                    Selecione o Campo <span className="text-rose-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      navigate('/super-admin/recursos/campos-personalizados');
                    }}
                  >
                    <span>Gerenciar Campos</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Button>
                </div>

                <Select value={selectedFieldId} onValueChange={handleFieldChange}>
                  <SelectTrigger id="select-field" className="h-9">
                    <SelectValue placeholder="Escolha um campo para preencher..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeFields.map((f) => {
                      const isAlreadyFilled = filledFieldIds.has(f.id);
                      return (
                        <SelectItem key={f.id} value={f.id} className="text-xs">
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="font-medium">{f.name}</span>
                            <span className="text-[10px] text-muted-foreground capitalize">
                              ({f.field_type === 'select' ? 'Menu Suspenso' : f.field_type === 'text' ? 'Texto Livre' : f.field_type})
                              {isAlreadyFilled ? ' - Atualizar' : ''}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Input adaptativo de acordo com o tipo do campo */}
              {currentSelectedField && (
                <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Valor / Informação para "{currentSelectedField.name}"
                    </Label>
                    <Badge variant="outline" className="text-[10px]">
                      {currentSelectedField.field_type === 'select'
                        ? 'Menu Suspenso'
                        : currentSelectedField.field_type === 'text'
                        ? 'Texto Livre'
                        : currentSelectedField.field_type}
                    </Badge>
                  </div>

                  {/* Se for SELECT (Menu Suspenso) */}
                  {currentSelectedField.field_type === 'select' && (
                    <Select value={inputValue} onValueChange={setInputValue}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione uma opção do menu suspenso..." />
                      </SelectTrigger>
                      <SelectContent>
                        {currentSelectedField.options.map((opt, i) => (
                          <SelectItem key={i} value={opt} className="text-xs">
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Se for TEXTO LIVRE */}
                  {currentSelectedField.field_type === 'text' && (
                    <Input
                      type="text"
                      placeholder={currentSelectedField.placeholder || 'Digite a informação aqui...'}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="bg-background"
                      autoFocus
                    />
                  )}

                  {/* Se for NÚMERO */}
                  {currentSelectedField.field_type === 'number' && (
                    <Input
                      type="number"
                      placeholder={currentSelectedField.placeholder || '0'}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="bg-background"
                      autoFocus
                    />
                  )}

                  {/* Se for TEXTO LONGO */}
                  {currentSelectedField.field_type === 'textarea' && (
                    <Textarea
                      placeholder={currentSelectedField.placeholder || 'Digite as observações detalhadas...'}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      rows={3}
                      className="resize-none bg-background text-xs"
                      autoFocus
                    />
                  )}

                  {/* Se for DATA */}
                  {currentSelectedField.field_type === 'date' && (
                    <Input
                      type="date"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="bg-background"
                    />
                  )}

                  {/* Se for BOOLEANO */}
                  {currentSelectedField.field_type === 'boolean' && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs text-muted-foreground">Marcar como verdadeiro/sim</span>
                      <Switch
                        checked={inputValue === 'true'}
                        onCheckedChange={(checked) => setInputValue(checked ? 'true' : 'false')}
                      />
                    </div>
                  )}

                  {/* Descrição de ajuda do campo */}
                  {currentSelectedField.description && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                      <Info className="w-3 h-3 flex-shrink-0 text-muted-foreground/80" />
                      <span>{currentSelectedField.description}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveValueMutation.isPending || !selectedFieldId}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {saveValueMutation.isPending ? 'Salvando...' : 'Adicionar ao Lead'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
