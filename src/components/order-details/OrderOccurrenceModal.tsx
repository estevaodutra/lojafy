import { useState, useId, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RotateCcw,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Upload,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  Check,
  Package,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TicketAuthorType } from '@/types/orderTickets';

export interface OccurrenceShippingFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
}

interface OrderOccurrenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    order_number: string;
    status: string;
    payment_status?: string;
    total_amount?: number;
    user_id?: string;
    reseller_id?: string | null;
    shipping_label_url?: string | null;
    shipping_label_status?: string | null;
    has_shipping_label?: boolean;
    customer_name?: string;
  };
  existingShippingFiles?: OccurrenceShippingFile[];
  deliveredAt?: string | null;
  onSuccess: () => void;
}

export type OccurrenceType = 'troca' | 'devolucao';

interface ReasonOption {
  code: string;
  label: string;
}

const TROCA_REASONS: ReasonOption[] = [
  { code: 'defeito_fabricacao', label: 'Produto com defeito de fabricação ou quebrado' },
  { code: 'nao_serviu_tamanho', label: 'Tamanho não serviu (muito pequeno / grande)' },
  { code: 'produto_diferente', label: 'Produto diferente do anunciado / cor incorreta' },
  { code: 'avariado_transporte', label: 'Produto avariado ou danificado no transporte' },
  { code: 'mudanca_ideia', label: 'Mudança de ideia / Cliente quer outro modelo' },
  { code: 'outro', label: 'Outro motivo de troca' },
];

const DEVOLUCAO_REASONS: ReasonOption[] = [
  { code: 'defeito_fabricacao', label: 'Produto com defeito de fabricação ou não funciona' },
  { code: 'danificado_transporte', label: 'Produto danificado / amassado no transporte' },
  { code: 'nao_serviu', label: 'Não serviu / Incompatível com o esperado' },
  { code: 'diferente_anunciado', label: 'Produto não corresponde à foto ou descrição' },
  { code: 'incompleto_faltando', label: 'Pedido incompleto (faltam peças ou acessórios)' },
  { code: 'arrependimento_7dias', label: 'Arrependimento de compra (dentro do prazo legal)' },
  { code: 'cliente_desistiu', label: 'Comprador desistiu / cancelou no marketplace' },
  { code: 'outro', label: 'Outro motivo de devolução' },
];

interface UploadedFilePreview {
  file: File;
  name: string;
  size: number;
  previewUrl?: string;
}

export const OrderOccurrenceModal = ({
  open,
  onOpenChange,
  order,
  existingShippingFiles = [],
  deliveredAt,
  onSuccess,
}: OrderOccurrenceModalProps) => {
  const { user, profile } = useAuth();
  const fileInputId = useId();
  const labelInputId = useId();

  // Wizard Step (1: Informações, 2: Etiqueta)
  const [step, setStep] = useState<1 | 2>(1);

  // Etapa 1: Dados da Ocorrência
  const [tipo, setTipo] = useState<OccurrenceType>('devolucao');
  const [motivo, setMotivo] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [evidenceFiles, setEvidenceFiles] = useState<UploadedFilePreview[]>([]);

  // Etapa 2: Etiqueta de Envio
  const [newShippingLabelFile, setNewShippingLabelFile] = useState<File | null>(null);
  const [returnTrackingCode, setReturnTrackingCode] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [localShippingFiles, setLocalShippingFiles] = useState<OccurrenceShippingFile[]>(existingShippingFiles);
  const [isFetchingMlLabel, setIsFetchingMlLabel] = useState(false);

  useEffect(() => {
    setLocalShippingFiles(existingShippingFiles);
  }, [existingShippingFiles]);

  const isMlLinked = Boolean(
    order.ml_order_id ||
    (order as any).channel === 'mercadolivre' ||
    (order as any).payment_method === 'mercadolivre' ||
    ((order as any).external_reference && String((order as any).external_reference).toLowerCase().includes('ml')) ||
    ((order as any).notes && String((order as any).notes).toLowerCase().includes('mercadolivre'))
  );

  // Checagem se o pedido já tem etiqueta registrada
  const hasExistingLabel =
    (localShippingFiles && localShippingFiles.length > 0) ||
    !!order.shipping_label_url ||
    order.shipping_label_status === 'ready' ||
    Boolean(order.has_shipping_label);

  const availableReasons = tipo === 'troca' ? TROCA_REASONS : DEVOLUCAO_REASONS;
  const currentReasonObj = availableReasons.find((r) => r.code === motivo);

  // Validação da Etapa 1
  const isStep1Valid = Boolean(tipo && motivo && descricao.trim().length >= 10);

  // Validação da Etapa 2: se não possui etiqueta anterior, deve enviar obrigatoriamente
  const isStep2Valid = hasExistingLabel || Boolean(newShippingLabelFile);

  const handleFetchMlLabel = async () => {
    setIsFetchingMlLabel(true);
    toast.info('Buscando etiqueta no Mercado Livre...');
    try {
      const { error } = await supabase.functions.invoke('ml-order-webhook', {
        body: {
          action: 'repair_orders',
          order_id: order.id,
        },
      });
      if (error) throw error;

      // Buscar arquivos atualizados de envio
      const { data: files } = await supabase
        .from('order_shipping_files')
        .select('*')
        .eq('order_id', order.id)
        .order('uploaded_at', { ascending: false });

      if (files && files.length > 0) {
        setLocalShippingFiles(files);
        toast.success('Etiqueta do Mercado Livre obtida com sucesso!');
      } else {
        toast.warning('Etiqueta ainda não disponível para download no Mercado Livre.');
      }
    } catch (err: any) {
      console.error('Erro ao buscar etiqueta do ML:', err);
      toast.error('Não foi possível obter a etiqueta do Mercado Livre.');
    } finally {
      setIsFetchingMlLabel(false);
    }
  };

  const handleTipoChange = (newTipo: OccurrenceType) => {
    setTipo(newTipo);
    setMotivo(''); // reset motivo ao trocar tipo para evitar inconsistências
  };

  const handleAddEvidenceFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFilesList: UploadedFilePreview[] = Array.from(files).map((file) => {
      const isImg = file.type.startsWith('image/');
      return {
        file,
        name: file.name,
        size: file.size,
        previewUrl: isImg ? URL.createObjectURL(file) : undefined,
      };
    });

    setEvidenceFiles((prev) => [...prev, ...newFilesList].slice(0, 8)); // até 8 anexos
  };

  const handleRemoveEvidenceFile = (index: number) => {
    setEvidenceFiles((prev) => {
      const item = prev[index];
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const resetForm = () => {
    setStep(1);
    setTipo('devolucao');
    setMotivo('');
    setDescricao('');
    setEvidenceFiles([]);
    setNewShippingLabelFile(null);
    setReturnTrackingCode('');
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!isStep1Valid || !isStep2Valid || !user) return;
    setLoading(true);

    try {
      const authorRole = profile?.role || 'customer';
      let authorType: TicketAuthorType = 'cliente';
      if (authorRole === 'super_admin' || authorRole === 'admin') authorType = 'superadmin';
      else if (authorRole === 'supplier') authorType = 'fornecedor';
      else if (authorRole === 'reseller') authorType = 'revendedor';

      const motivoLabel = currentReasonObj?.label || motivo;
      const occurrenceTicketType = tipo === 'troca' ? 'troca' : 'reembolso';

      // 1. Upload de Etiqueta de Envio (caso uma nova tenha sido fornecida)
      let uploadedLabelPath: string | null = null;
      if (newShippingLabelFile) {
        const fileExt = newShippingLabelFile.name.split('.').pop() || 'pdf';
        const labelFileName = `reverso_${order.id}_${Date.now()}.${fileExt}`;
        const filePath = `${order.id}/${labelFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('shipping-files')
          .upload(filePath, newShippingLabelFile, { upsert: true });

        if (!uploadError) {
          uploadedLabelPath = filePath;
          // Registrar na tabela de arquivos de envio
          await supabase.from('order_shipping_files').insert({
            order_id: order.id,
            file_name: newShippingLabelFile.name,
            file_path: filePath,
            file_size: newShippingLabelFile.size,
          });
        }
      }

      // 2. Upload de Imagens / Comprovantes de Evidência
      const uploadedAttachments: Array<{
        url: string;
        name: string;
        type: string;
        size: number;
      }> = [];

      for (const item of evidenceFiles) {
        try {
          const fileExt = item.name.split('.').pop() || 'jpg';
          const storagePath = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: attError } = await supabase.storage
            .from('order-ticket-attachments')
            .upload(storagePath, item.file);

          if (!attError) {
            const { data: urlData } = supabase.storage
              .from('order-ticket-attachments')
              .getPublicUrl(storagePath);

            uploadedAttachments.push({
              url: urlData.publicUrl,
              name: item.name,
              type: item.file.type,
              size: item.size,
            });
          }
        } catch (err) {
          console.warn('Erro ao fazer upload de anexo:', err);
        }
      }

      // 3. Criar registro na tabela de tickets (order_tickets)
      const ticketNumber = `OCORR-${Date.now().toString().slice(-6)}`;
      const formattedReason = `[${tipo === 'troca' ? 'TROCA DE PRODUTO' : 'DEVOLUÇÃO DE PRODUTO'}] ${motivoLabel} — ${descricao.trim()}`;

      const { data: createdTicket, error: ticketError } = await supabase
        .from('order_tickets')
        .insert({
          order_id: order.id,
          ticket_number: ticketNumber,
          tipo: occurrenceTicketType,
          status: 'aberto',
          reason: formattedReason,
          customer_id: user.id,
          reseller_id: order.reseller_id || user.id,
        })
        .select()
        .single();

      if (ticketError) {
        console.error('Erro ao inserir ticket:', ticketError);
      }

      const ticketId = createdTicket?.id;

      // 4. Inserir mensagem detalhada e anexos
      if (ticketId) {
        await supabase.from('order_ticket_messages').insert({
          ticket_id: ticketId,
          author_id: user.id,
          author_type: authorType,
          message: descricao.trim(),
        });

        if (uploadedAttachments.length > 0) {
          const attachmentRecords = uploadedAttachments.map((att) => ({
            ticket_id: ticketId,
            file_url: att.url,
            file_name: att.name,
            file_type: att.type,
            file_size: att.size,
          }));
          await supabase.from('order_ticket_attachments').insert(attachmentRecords);
        }
      }

      // 5. Atualizar status do pedido para devolução em andamento
      const orderUpdatePayload: Record<string, any> = {
        status: 'devolucao_andamento',
        devolucao_motivo: motivo,
        devolucao_iniciada_em: new Date().toISOString(),
      };

      if (returnTrackingCode.trim()) {
        orderUpdatePayload.devolucao_rastreio = returnTrackingCode.trim();
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update(orderUpdatePayload)
        .eq('id', order.id);

      if (orderError) throw orderError;

      // 6. Registrar histórico da movimentação
      const historyNotes = `Ocorrência aberta (${
        tipo === 'troca' ? 'Troca' : 'Devolução'
      }): ${motivoLabel}. ${descricao.trim()}${
        returnTrackingCode ? ` • Rastreio Reverso: ${returnTrackingCode.trim()}` : ''
      }`;

      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status: 'devolucao_andamento',
        notes: historyNotes,
      });

      // 7. Notificar webhook se disponível
      supabase.functions
        .invoke('dispatch-webhook', {
          body: {
            event_type: 'order.updated',
            order_id: order.id,
            event_reason: 'order_occurrence_opened',
            changes: {
              occurrence_type: tipo,
              occurrence_reason: motivoLabel,
              status: 'devolucao_andamento',
            },
          },
        })
        .catch(() => {});

      toast.success(
        `Ocorrência de ${
          tipo === 'troca' ? 'Troca' : 'Devolução'
        } aberta com sucesso! Pedido transferido para a aba Ocorrências.`
      );

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao abrir ocorrência:', error);
      toast.error(error.message || 'Erro ao abrir ocorrência.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header com Stepper */}
        <DialogHeader className="p-4 pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span>Abrir Ocorrência — Pedido #{order.order_number}</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Preencha os dados e anexe a documentação necessária para registrar a solicitação.
          </DialogDescription>

          {/* Stepper Visual (2 Etapas) */}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-border/40">
            {/* Etapa 1 */}
            <div
              className={cn(
                'flex items-center gap-2 cursor-pointer transition-colors',
                step === 1 ? 'text-primary font-semibold' : 'text-muted-foreground'
              )}
              onClick={() => step === 2 && !loading && setStep(1)}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors',
                  step === 1
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'bg-emerald-600 text-white'
                )}
              >
                {step > 1 ? <Check className="w-3 h-3 stroke-[3]" /> : '1'}
              </span>
              <span className="text-xs font-medium">1. Dados da Ocorrência</span>
            </div>

            <div className="flex-1 h-0.5 mx-3 bg-border/80" />

            {/* Etapa 2 */}
            <div
              className={cn(
                'flex items-center gap-2 transition-colors',
                step === 2 ? 'text-primary font-semibold' : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors',
                  step === 2
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'bg-muted text-muted-foreground border border-border/70'
                )}
              >
                2
              </span>
              <span className="text-xs font-medium">2. Etiqueta de Envio</span>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ============================================================== */}
          {/* ETAPA 1: DADOS DA OCORRÊNCIA                                    */}
          {/* ============================================================== */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Seleção do Tipo de Solicitação (2 Cards) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Tipo de Solicitação *
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Opção Troca */}
                  <div
                    onClick={() => handleTipoChange('troca')}
                    className={cn(
                      'p-3 rounded-lg border-2 cursor-pointer transition-all flex items-start gap-2.5',
                      tipo === 'troca'
                        ? 'border-primary bg-primary/5 shadow-2xs'
                        : 'border-border/70 hover:border-border hover:bg-muted/30'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5',
                        tipo === 'troca'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground">Troca de Produto</p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        Substituir por outro item, numeração ou nova unidade com defeito.
                      </p>
                    </div>
                  </div>

                  {/* Opção Devolução */}
                  <div
                    onClick={() => handleTipoChange('devolucao')}
                    className={cn(
                      'p-3 rounded-lg border-2 cursor-pointer transition-all flex items-start gap-2.5',
                      tipo === 'devolucao'
                        ? 'border-primary bg-primary/5 shadow-2xs'
                        : 'border-border/70 hover:border-border hover:bg-muted/30'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5',
                        tipo === 'devolucao'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground">Devolução de Produto</p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        Retorno do item para estorno e reembolso do valor pago.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Suspenso de Motivos Recorrentes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Motivo da {tipo === 'troca' ? 'Troca' : 'Devolução'} *
                </Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Selecione o motivo recorrente..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[220px]">
                    {availableReasons.map((r) => (
                      <SelectItem key={r.code} value={r.code} className="text-xs">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Explicação do que aconteceu (Mensagem) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">
                    O que aconteceu? Explique a situação *
                  </Label>
                  <span
                    className={cn(
                      'text-[10px]',
                      descricao.trim().length >= 10 ? 'text-primary font-medium' : 'text-muted-foreground'
                    )}
                  >
                    {descricao.trim().length}/10 caracteres mín.
                  </span>
                </div>
                <Textarea
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Explique o que o cliente relatou, detalhes do defeito, mensagens recebidas ou motivo da devolução..."
                  className="text-xs resize-none"
                />
              </div>

              {/* Prévia da Mensagem / Notificação (Live Preview) */}
              {descricao.trim().length > 0 && (
                <div className="rounded-lg border border-border/70 bg-muted/25 p-3 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between pb-1 border-b border-border/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-primary" />
                      Prévia do Registro da Ocorrência
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                      {tipo === 'troca' ? 'Troca' : 'Devolução'}
                    </Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      <strong>Motivo:</strong> {currentReasonObj?.label || 'Não selecionado'}
                    </p>
                    <p className="text-[11px] text-foreground bg-background/80 p-2 rounded border border-border/40 italic">
                      "{descricao.trim()}"
                    </p>
                  </div>
                </div>
              )}

              {/* Anexo de Imagens e Documentos Comprobatórios */}
              <div className="space-y-2 pt-1 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    <span>Fotos e Imagens Comprobatórias (Opcional)</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    {evidenceFiles.length}/8 anexos
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    id={fileInputId}
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleAddEvidenceFiles}
                    className="hidden"
                  />
                  <Label
                    htmlFor={fileInputId}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background hover:bg-accent text-xs font-medium transition-colors shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Adicionar Fotos ou Arquivos</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Aceita fotos (JPG, PNG) ou documentos PDF.
                  </span>
                </div>

                {/* Lista de Arquivos Anexados */}
                {evidenceFiles.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {evidenceFiles.map((item, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-md border border-border/70 p-1.5 bg-background flex flex-col items-center justify-center text-center group"
                      >
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="w-full h-16 object-cover rounded mb-1"
                          />
                        ) : (
                          <div className="w-full h-16 rounded bg-muted/40 flex items-center justify-center mb-1">
                            <FileText className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <p className="text-[10px] font-medium text-foreground truncate w-full" title={item.name}>
                          {item.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveEvidenceFile(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow hover:bg-destructive/90"
                          title="Remover arquivo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ETAPA 2: ETIQUETA DE ENVIO / LOGÍSTICA REVERSA                   */}
          {/* ============================================================== */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Status da Etiqueta do Pedido */}
              {hasExistingLabel ? (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                      Etiqueta do Pedido Identificada
                    </p>
                    <p className="text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
                      Este pedido já possui etiqueta de envio cadastrada no sistema
                      {(localShippingFiles[0] || existingShippingFiles[0]) ? ` (${(localShippingFiles[0] || existingShippingFiles[0]).file_name})` : ''}.
                    </p>
                    <p className="text-muted-foreground text-[10px] pt-1">
                      Você pode prosseguir diretamente ou anexar abaixo uma nova etiqueta específica de devolução / logística reversa se desejar.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1 flex-1">
                      <p className="font-semibold text-amber-900 dark:text-amber-200">
                        Etiqueta de Envio / Reversa Necessária *
                      </p>
                      <p className="text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                        Este pedido ainda não possui etiqueta vinculada. Você pode buscar automaticamente no Mercado Livre ou anexar o arquivo manualmente.
                      </p>
                    </div>
                  </div>

                  {/* Atalho de Busca Automática no Mercado Livre */}
                  {isMlLinked && (
                    <div className="p-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-yellow-950 dark:text-yellow-200 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                          <span>Pedido vinculado ao Mercado Livre</span>
                        </p>
                        <p className="text-[11px] text-yellow-800 dark:text-yellow-300">
                          Puxe a etiqueta oficial direto da remessa do Mercado Livre.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleFetchMlLabel}
                        disabled={isFetchingMlLabel}
                        className="h-8 px-3 text-xs font-semibold gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 shrink-0 shadow-xs cursor-pointer"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", isFetchingMlLabel && "animate-spin")} />
                        <span>{isFetchingMlLabel ? 'Buscando...' : 'Puxar do Mercado Livre'}</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Upload da Nova Etiqueta */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>
                    {hasExistingLabel
                      ? 'Anexar Nova Etiqueta Reversa (Opcional)'
                      : 'Anexar Etiqueta de Logística Reversa *'}
                  </span>
                  {newShippingLabelFile && (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500">
                      Arquivo selecionado
                    </Badge>
                  )}
                </Label>

                <div className="border-2 border-dashed border-border/80 rounded-lg p-4 text-center hover:bg-muted/15 transition-colors">
                  <Input
                    type="file"
                    id={labelInputId}
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setNewShippingLabelFile(f);
                    }}
                    className="hidden"
                  />
                  <Label
                    htmlFor={labelInputId}
                    className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    {newShippingLabelFile ? (
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-foreground">
                          {newShippingLabelFile.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(newShippingLabelFile.size / 1024).toFixed(1)} KB • Clique para trocar
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-foreground">
                          Clique para selecionar a Etiqueta de Envio
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Formatos aceitos: PDF ou imagens (PNG, JPG)
                        </p>
                      </div>
                    )}
                  </Label>
                </div>
              </div>

              {/* Código de Rastreamento Reverso (Opcional) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Código de Rastreamento da Devolução (Opcional)
                </Label>
                <Input
                  value={returnTrackingCode}
                  onChange={(e) => setReturnTrackingCode(e.target.value.toUpperCase())}
                  placeholder="Ex: QB123456789BR ou código de postagem"
                  className="text-xs font-mono h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                  Caso o marketplace ou os Correios já tenham emitido o código reverso, insira-o aqui para facilitar o rastreio.
                </p>
              </div>

              {/* Resumo da Ocorrência antes de Concluir */}
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1 text-xs">
                <p className="font-semibold text-foreground text-[11px]">Resumo do Envio:</p>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                  <span>Tipo: <strong className="text-foreground">{tipo === 'troca' ? 'Troca de Produto' : 'Devolução de Produto'}</strong></span>
                  <span>Motivo: <strong className="text-foreground">{currentReasonObj?.label}</strong></span>
                  <span>Fotos anexadas: <strong className="text-foreground">{evidenceFiles.length}</strong></span>
                  <span>Etiqueta: <strong className="text-foreground">{newShippingLabelFile ? 'Nova anexada' : hasExistingLabel ? 'Existente' : 'Pendente'}</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Navegação */}
        <DialogFooter className="p-3 border-t bg-muted/10 flex items-center justify-between sm:justify-between gap-2">
          {step === 1 ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleClose} disabled={loading} className="text-xs">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
                className="text-xs gap-1.5 shadow-2xs font-semibold"
              >
                <span>Avançar para Etiqueta</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                disabled={loading}
                className="text-xs gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!isStep2Valid || loading}
                className="text-xs gap-1.5 shadow-2xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Registrando Ocorrência...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Concluir Ocorrência</span>
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
