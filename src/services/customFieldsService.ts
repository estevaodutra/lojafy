import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CustomFieldType = 'text' | 'select' | 'number' | 'textarea' | 'date' | 'boolean';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  key: string;
  field_type: CustomFieldType;
  description?: string | null;
  placeholder?: string | null;
  options: string[];
  is_required: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface LeadCustomFieldValue {
  id: string;
  lead_id: string;
  field_id: string;
  value: string;
  created_at: string;
  updated_at: string;
  field?: CustomFieldDefinition;
}

// Chaves do localStorage para fallback e cache resiliente
const STORAGE_KEY_DEFINITIONS = 'lojafy_custom_field_definitions';
const STORAGE_KEY_VALUES = 'lojafy_lead_custom_field_values';

const INITIAL_FALLBACK_DEFINITIONS: CustomFieldDefinition[] = [
  {
    id: 'cf-grupo-id-001',
    name: 'ID de Grupo',
    key: 'id_grupo',
    field_type: 'text',
    description: 'Identificador ou código do grupo ao qual o lead pertence (ex: WhatsApp, Telegram ou CRM)',
    placeholder: 'Ex: GRP-2048 ou 91823',
    options: [],
    is_required: false,
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cf-origem-lead-002',
    name: 'Origem do Lead',
    key: 'origem_lead',
    field_type: 'select',
    description: 'Canal ou campanha de aquisição de onde o lead se cadastrou',
    placeholder: 'Selecione a origem',
    options: ['Campanha Meta Ads', 'Google Ads', 'WhatsApp Orgânico', 'Indicação', 'Loja Virtual', 'Outro'],
    is_required: false,
    is_active: true,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cf-etapa-lead-003',
    name: 'Etapa do Lead',
    key: 'etapa_lead',
    field_type: 'select',
    description: 'Status ou estágio atual do lead no funil de vendas',
    placeholder: 'Selecione o estágio',
    options: ['Novo Contato', 'Qualificado', 'Em Negociação', 'Aguardando Resposta', 'Convertido', 'Perdido'],
    is_required: false,
    is_active: true,
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cf-potencial-compra-004',
    name: 'Potencial de Compra (R$)',
    key: 'potencial_compra',
    field_type: 'number',
    description: 'Estimativa de faturamento ou limite de compra do lead',
    placeholder: 'Ex: 5000',
    options: [],
    is_required: false,
    is_active: true,
    display_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Funções auxiliares para LocalStorage
function getLocalDefinitions(): CustomFieldDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DEFINITIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_DEFINITIONS, JSON.stringify(INITIAL_FALLBACK_DEFINITIONS));
      return INITIAL_FALLBACK_DEFINITIONS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler custom_fields do localStorage:', err);
    return INITIAL_FALLBACK_DEFINITIONS;
  }
}

function saveLocalDefinitions(defs: CustomFieldDefinition[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DEFINITIONS, JSON.stringify(defs));
  } catch (err) {
    console.error('Erro ao salvar custom_fields no localStorage:', err);
  }
}

function getLocalValues(): LeadCustomFieldValue[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VALUES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler lead_custom_field_values do localStorage:', err);
    return [];
  }
}

function saveLocalValues(vals: LeadCustomFieldValue[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_VALUES, JSON.stringify(vals));
  } catch (err) {
    console.error('Erro ao salvar lead_custom_field_values no localStorage:', err);
  }
}

// Normaliza o retorno de options garantindo que seja string[]
function normalizeOptions(options: any): string[] {
  if (!options) return [];
  if (Array.isArray(options)) {
    return options.map((opt) => (typeof opt === 'string' ? opt : opt?.label || opt?.value || String(opt)));
  }
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [options];
    }
  }
  return [];
}

// -------------------------------------------------------------
// OPERAÇÕES: DEFINIÇÃO DE CAMPOS PERSONALIZADOS
// -------------------------------------------------------------

export async function fetchCustomFields(): Promise<CustomFieldDefinition[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('custom_field_definitions')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      // Fallback para localStorage
      const local = getLocalDefinitions();
      return local;
    }

    const normalized = data.map((item: any) => ({
      ...item,
      options: normalizeOptions(item.options),
    }));

    // Sincroniza localmente
    saveLocalDefinitions(normalized);
    return normalized;
  } catch (err) {
    console.warn('Usando fallback local para custom_field_definitions:', err);
    return getLocalDefinitions();
  }
}

export async function createCustomField(input: {
  name: string;
  key: string;
  field_type: CustomFieldType;
  description?: string;
  placeholder?: string;
  options?: string[];
  is_required?: boolean;
  is_active?: boolean;
}): Promise<CustomFieldDefinition> {
  const newField: CustomFieldDefinition = {
    id: `cf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: input.name.trim(),
    key: input.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    field_type: input.field_type,
    description: input.description?.trim() || null,
    placeholder: input.placeholder?.trim() || null,
    options: input.options || [],
    is_required: !!input.is_required,
    is_active: input.is_active !== undefined ? input.is_active : true,
    display_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await (supabase as any)
      .from('custom_field_definitions')
      .insert({
        name: newField.name,
        key: newField.key,
        field_type: newField.field_type,
        description: newField.description,
        placeholder: newField.placeholder,
        options: newField.options,
        is_required: newField.is_required,
        is_active: newField.is_active,
      })
      .select()
      .single();

    if (!error && data) {
      const created = { ...data, options: normalizeOptions(data.options) };
      // Atualiza local
      const local = getLocalDefinitions();
      saveLocalDefinitions([created, ...local.filter((f) => f.id !== created.id)]);
      return created;
    }
  } catch (err) {
    console.warn('Erro ao inserir no Supabase, salvando localmente:', err);
  }

  // Fallback local
  const current = getLocalDefinitions();
  const updated = [newField, ...current.filter((c) => c.key !== newField.key)];
  saveLocalDefinitions(updated);
  return newField;
}

export async function updateCustomField(
  id: string,
  input: Partial<Omit<CustomFieldDefinition, 'id' | 'created_at' | 'updated_at'>>
): Promise<CustomFieldDefinition> {
  const now = new Date().toISOString();

  try {
    const { data, error } = await (supabase as any)
      .from('custom_field_definitions')
      .update({
        ...input,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      const updated = { ...data, options: normalizeOptions(data.options) };
      const local = getLocalDefinitions();
      saveLocalDefinitions(local.map((item) => (item.id === id ? updated : item)));
      return updated;
    }
  } catch (err) {
    console.warn('Erro ao atualizar no Supabase, atualizando localmente:', err);
  }

  // Fallback local
  const current = getLocalDefinitions();
  let found = current.find((c) => c.id === id);
  if (!found) throw new Error('Campo não encontrado');
  found = { ...found, ...input, updated_at: now };
  saveLocalDefinitions(current.map((item) => (item.id === id ? (found as CustomFieldDefinition) : item)));
  return found;
}

export async function deleteCustomField(id: string): Promise<void> {
  try {
    await (supabase as any).from('custom_field_definitions').delete().eq('id', id);
  } catch (err) {
    console.warn('Erro ao deletar no Supabase:', err);
  }

  const current = getLocalDefinitions();
  saveLocalDefinitions(current.filter((c) => c.id !== id));

  // Remove valores vinculados
  const vals = getLocalValues();
  saveLocalValues(vals.filter((v) => v.field_id !== id));
}

// -------------------------------------------------------------
// OPERAÇÕES: VALORES PREENCHIDOS NO LEAD
// -------------------------------------------------------------

export async function fetchLeadFieldValues(leadId: string): Promise<LeadCustomFieldValue[]> {
  if (!leadId) return [];

  // Pega as definições primeiro para montar o join
  const definitions = await fetchCustomFields();
  const defMap = new Map<string, CustomFieldDefinition>(definitions.map((d) => [d.id, d]));

  try {
    const { data, error } = await (supabase as any)
      .from('lead_custom_field_values')
      .select('*')
      .eq('lead_id', leadId);

    if (!error && data && data.length > 0) {
      const list: LeadCustomFieldValue[] = data.map((item: any) => ({
        ...item,
        field: defMap.get(item.field_id) || undefined,
      }));
      return list;
    }
  } catch (err) {
    console.warn('Erro ao consultar lead_custom_field_values no Supabase, usando local:', err);
  }

  // Fallback local
  const localVals = getLocalValues();
  return localVals
    .filter((v) => v.lead_id === leadId)
    .map((item) => ({
      ...item,
      field: defMap.get(item.field_id) || undefined,
    }));
}

export async function saveLeadFieldValue(
  leadId: string,
  fieldId: string,
  value: string
): Promise<LeadCustomFieldValue> {
  const now = new Date().toISOString();
  const defs = getLocalDefinitions();
  const fieldDef = defs.find((d) => d.id === fieldId);

  const item: LeadCustomFieldValue = {
    id: `val-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    lead_id: leadId,
    field_id: fieldId,
    value: value.trim(),
    created_at: now,
    updated_at: now,
    field: fieldDef,
  };

  try {
    const { data, error } = await (supabase as any)
      .from('lead_custom_field_values')
      .upsert(
        {
          lead_id: leadId,
          field_id: fieldId,
          value: item.value,
          updated_at: now,
        },
        { onConflict: 'lead_id,field_id' }
      )
      .select()
      .single();

    if (!error && data) {
      item.id = data.id;
    }
  } catch (err) {
    console.warn('Erro ao salvar no Supabase, mantendo local:', err);
  }

  // Salva no LocalStorage
  const allVals = getLocalValues();
  const index = allVals.findIndex((v) => v.lead_id === leadId && v.field_id === fieldId);
  if (index >= 0) {
    allVals[index] = { ...allVals[index], value: item.value, updated_at: now };
  } else {
    allVals.push(item);
  }
  saveLocalValues(allVals);

  return item;
}

export async function deleteLeadFieldValue(leadId: string, fieldId: string): Promise<void> {
  try {
    await (supabase as any)
      .from('lead_custom_field_values')
      .delete()
      .eq('lead_id', leadId)
      .eq('field_id', fieldId);
  } catch (err) {
    console.warn('Erro ao deletar valor no Supabase:', err);
  }

  const allVals = getLocalValues();
  saveLocalValues(allVals.filter((v) => !(v.lead_id === leadId && v.field_id === fieldId)));
}

// -------------------------------------------------------------
// REACT QUERY HOOKS
// -------------------------------------------------------------

export function useCustomFields() {
  return useQuery({
    queryKey: ['custom-fields-definitions'],
    queryFn: fetchCustomFields,
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

export function useLeadCustomFields(leadId: string | null | undefined) {
  return useQuery({
    queryKey: ['lead-custom-fields', leadId],
    queryFn: () => (leadId ? fetchLeadFieldValues(leadId) : Promise.resolve([])),
    enabled: !!leadId,
    staleTime: 1000 * 30, // 30s
  });
}

export function useCreateCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomField,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields-definitions'] });
    },
  });
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomFieldDefinition> }) =>
      updateCustomField(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['lead-custom-fields'] });
    },
  });
}

export function useDeleteCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCustomField,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['lead-custom-fields'] });
    },
  });
}

export function useSaveLeadFieldValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, fieldId, value }: { leadId: string; fieldId: string; value: string }) =>
      saveLeadFieldValue(leadId, fieldId, value),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-custom-fields', variables.leadId] });
    },
  });
}

export function useDeleteLeadFieldValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, fieldId }: { leadId: string; fieldId: string }) =>
      deleteLeadFieldValue(leadId, fieldId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-custom-fields', variables.leadId] });
    },
  });
}
