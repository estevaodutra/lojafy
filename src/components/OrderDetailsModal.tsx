import React, { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Package,
  Eye,
  Truck,
  Check,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  CreditCard,
  Calendar,
  User,
  FileText,
  Download,
  Upload,
  TrendingUp,
  MessageSquarePlus,
  Send,
  Loader2,
  RefreshCw,
  Trash2,
  Printer,
  ExternalLink,
  Copy,
  Link2,
  QrCode,
  Info,
  ArrowRight,
  ShieldCheck,
  Receipt,
  History,
  Plus,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { OpenTicketButton } from '@/components/order-tickets/OpenTicketButton';
import { getAvailableTicketTypes } from '@/types/orderTickets';
import {
  getStatusConfig,
  getStatusLabel,
  getStatusVariant,
} from '@/constants/orderStatus';
import { OrderActionBar } from '@/components/order-details/OrderActionBar';
import { RelatedTickets } from '@/components/order-details/RelatedTickets';
import { normalizeOrderToPipelineItem } from '@/utils/orderPipelineAdapter';
import { OrderPipelineItem } from '@/types/orderPipeline';
import { cn } from '@/lib/utils';
import { toast as sonnerToast } from 'sonner';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot?: any;
  supplier_unit_cost?: number;
  supplier_id?: string;
  supplier_organization_id?: string;
}

interface OrderStatusHistory {
  id: string;
  status: string;
  notes?: string;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  total_amount: number;
  shipping_amount?: number;
  tax_amount?: number;
  marketplace_fee?: number;
  created_at: string;
  tracking_number?: string;
  external_reference?: string;
  ml_order_id?: string;
  ml_shipment_id?: string;
  marketplace?: string;
  channel?: string;
  origin_type?: string;
  shipping_address?: any;
  billing_address?: any;
  notes?: string;
  user_id: string;
  reseller_id?: string;
  supplier_organization_id?: string;
  supplier_name?: string;
  order_items: OrderItem[];
}

interface CustomerProfile {
  first_name: string;
  last_name: string;
  cpf?: string;
  phone?: string;
}

interface ShippingFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
}

interface RefundDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by?: string;
}

interface WebhookLogInfo {
  id: string;
  dispatched_at: string;
  status_code: number | null;
  error_message: string | null;
}

interface OrderDetailsModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialOrder?: OrderPipelineItem;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  orderId,
  isOpen,
  onClose,
  initialOrder,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [pipelineItem, setPipelineItem] = useState<OrderPipelineItem | null>(initialOrder || null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistory[]>([]);
  const [shippingFiles, setShippingFiles] = useState<ShippingFile[]>([]);
  const [refundDocuments, setRefundDocuments] = useState<RefundDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [refundUploadFile, setRefundUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefundUploading, setIsRefundUploading] = useState(false);
  const [existingTicketId, setExistingTicketId] = useState<string | null>(null);
  const [deliveredAt, setDeliveredAt] = useState<string | null>(null);
  const [webhookLog, setWebhookLog] = useState<WebhookLogInfo | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [isDispatchingWebhook, setIsDispatchingWebhook] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Quick note state
  const [quickNote, setQuickNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const { toast } = useToast();
  const { profile } = useAuth();
  const { isSuperAdmin, isSupplier } = useUserRole();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const showAdminMetrics = isSuperAdmin() || isAdmin;
  const canManageShippingFiles = isAdmin || isSupplier();

  useEffect(() => {
    if (initialOrder) {
      setPipelineItem(initialOrder);
    }
  }, [initialOrder]);

  useEffect(() => {
    if (orderId && isOpen) {
      fetchOrderDetails();
      fetchStatusHistory();
      fetchShippingFiles();
      fetchRefundDocuments();
      fetchExistingTicket();
      fetchDeliveredAt();
      if (isAdmin) {
        fetchWebhookLog();
      }
    } else {
      setExistingTicketId(null);
      setDeliveredAt(null);
      setWebhookLog(null);
      setOrder(null);
      if (!initialOrder) {
        setPipelineItem(null);
      }
    }
  }, [orderId, isOpen, isAdmin]);

  const fetchExistingTicket = async () => {
    if (!orderId) return;
    try {
      const { data } = await supabase
        .from('order_tickets')
        .select('id')
        .eq('order_id', orderId)
        .not('status', 'in', '("resolvido","cancelado")')
        .maybeSingle();
      setExistingTicketId(data?.id || null);
    } catch (error) {
      console.error('Erro ao buscar ticket existente:', error);
    }
  };

  const fetchDeliveredAt = async () => {
    if (!orderId) return;
    try {
      const { data } = await supabase
        .from('order_status_history')
        .select('created_at')
        .eq('order_id', orderId)
        .eq('status', 'finalizado')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setDeliveredAt(data?.created_at || null);
    } catch (error) {
      console.error('Erro ao buscar data de entrega:', error);
    }
  };

  const fetchWebhookLog = async () => {
    if (!orderId) return;
    setWebhookLoading(true);
    try {
      const { data, error } = await supabase
        .from('webhook_dispatch_logs')
        .select('id, dispatched_at, status_code, error_message, payload')
        .eq('event_type', 'order.paid')
        .order('dispatched_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Erro ao buscar log de webhook:', error);
        setWebhookLog(null);
        return;
      }

      const matchingLog = data?.find((log: any) => {
        const payload = log.payload;
        return payload?.data?.order_id === orderId;
      });

      if (matchingLog) {
        setWebhookLog({
          id: matchingLog.id,
          dispatched_at: matchingLog.dispatched_at,
          status_code: matchingLog.status_code,
          error_message: matchingLog.error_message,
        });
      } else {
        setWebhookLog(null);
      }
    } catch (error) {
      console.error('Erro ao buscar log de webhook:', error);
      setWebhookLog(null);
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleDispatchWebhook = async () => {
    if (!orderId) return;
    setIsDispatchingWebhook(true);
    try {
      const { data, error } = await supabase.functions.invoke('dispatch-order-webhook', {
        body: { order_id: orderId },
      });

      if (error) {
        let errorDetail = error.message;
        try {
          if ('context' in error && (error as any).context) {
            const errBody = await (error as any).context.json();
            if (errBody?.error || errBody?.details) {
              errorDetail = errBody.error || errBody.details;
            }
          }
        } catch {
          // ignore
        }
        throw new Error(errorDetail);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Sucesso",
        description: `Webhook order.paid disparado para o pedido ${data?.order_number || orderId}`,
      });

      await fetchWebhookLog();
    } catch (error: any) {
      console.error('Erro ao disparar webhook:', error);
      toast({
        title: "Erro ao disparar webhook",
        description: error?.message || "Não foi possível disparar o webhook.",
        variant: "destructive",
      });
    } finally {
      setIsDispatchingWebhook(false);
    }
  };

  const fetchOrderDetails = async () => {
    if (!orderId) return;
    // Don't show full-screen spinner if we already have initialOrder
    if (!initialOrder) setLoading(true);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product_snapshot,
            supplier_unit_cost,
            supplier_id,
            supplier_organization_id
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder(data);

      // Resolve Customer Profile
      let resolvedCustomer: any = null;
      if (data?.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name, cpf, phone')
          .eq('user_id', data.user_id)
          .maybeSingle();
        resolvedCustomer = profileData;
      }

      // Fallback: shipping_address
      const parseAddr = (addr: any) => {
        if (!addr) return null;
        if (typeof addr === 'string') {
          try { return JSON.parse(addr); } catch { return null; }
        }
        if (typeof addr === 'object') return addr;
        return null;
      };

      const sa = parseAddr(data.shipping_address) || parseAddr(data.billing_address);
      if (sa && (!resolvedCustomer || (!resolvedCustomer.first_name && !resolvedCustomer.last_name))) {
        let firstName = sa.first_name || '';
        let lastName = sa.last_name || '';
        if (!firstName && !lastName) {
          const fullName = sa.name || sa.full_name || sa.recipient_name || sa.customer_name || sa.receiver_name;
          if (fullName && typeof fullName === 'string' && fullName.trim()) {
            const parts = fullName.trim().split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
          }
        }
        if (firstName || lastName) {
          resolvedCustomer = {
            first_name: firstName,
            last_name: lastName,
            cpf: sa.cpf || sa.document || resolvedCustomer?.cpf || null,
            phone: sa.phone || sa.telephone || resolvedCustomer?.phone || null,
          };
        }
      }

      setCustomer(resolvedCustomer);

      // Normalize into pipeline item to guarantee parity, while preserving initialOrder attributes
      const normalized = normalizeOrderToPipelineItem(data);
      setPipelineItem((prev) => {
        const base = initialOrder || prev;
        return {
          ...normalized,
          ...(base || {}),
          seller_name: base?.seller_name || normalized.seller_name,
          customer_name: base?.customer_name || normalized.customer_name,
          supplier_name: base?.supplier_name || normalized.supplier_name,
          sale_amount: base?.sale_amount ?? normalized.sale_amount,
          marketplace_fee: base?.marketplace_fee ?? normalized.marketplace_fee,
          seller_cost: base?.seller_cost ?? normalized.seller_cost,
          seller_profit: base?.seller_profit ?? normalized.seller_profit,
          seller_margin_pct: base?.seller_margin_pct ?? normalized.seller_margin_pct,
          lojafy_sale: base?.lojafy_sale ?? normalized.lojafy_sale,
          lojafy_fee: base?.lojafy_fee ?? normalized.lojafy_fee,
          lojafy_cost: base?.lojafy_cost ?? normalized.lojafy_cost,
          lojafy_profit: base?.lojafy_profit ?? normalized.lojafy_profit,
          lojafy_margin_pct: base?.lojafy_margin_pct ?? normalized.lojafy_margin_pct,
        };
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes do pedido:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusHistory = async () => {
    if (!orderId) return;
    try {
      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    }
  };

  const fetchShippingFiles = async () => {
    if (!orderId) return;
    try {
      const { data, error } = await supabase
        .from('order_shipping_files')
        .select('*')
        .eq('order_id', orderId)
        .order('uploaded_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setShippingFiles(data);
        return;
      }

      const fallbackFiles: ShippingFile[] = [];

      try {
        const { data: extractions } = await (supabase
          .from('shipment_label_extractions' as any)
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false }) as any);

        if (extractions && extractions.length > 0) {
          const extractionFiles: ShippingFile[] = extractions.map((ext: any) => ({
            id: ext.id,
            file_name: ext.file_path.split('/').pop() || `etiqueta_${orderId}.pdf`,
            file_path: ext.file_path,
            file_size: 50500,
            uploaded_at: ext.created_at || new Date().toISOString(),
          }));
          setShippingFiles(extractionFiles);
          return;
        }
      } catch (e) {
        console.log('Error checking shipment_label_extractions:', e);
      }

      const buckets = ['shipping-labels', 'shipping-files'];
      for (const bucket of buckets) {
        try {
          const { data: subFiles } = await supabase.storage.from(bucket).list(orderId, {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
          });
          if (subFiles && subFiles.length > 0) {
            subFiles.filter(f => f.name && f.name !== '.emptyFolderPlaceholder').forEach(f => {
              if (!fallbackFiles.some(existing => existing.file_name === f.name)) {
                fallbackFiles.push({
                  id: f.id || f.name,
                  file_name: f.name,
                  file_path: `${orderId}/${f.name}`,
                  file_size: f.metadata?.size || 50500,
                  uploaded_at: f.created_at || new Date().toISOString(),
                });
              }
            });
          }
        } catch (err) {
          console.error(`Error listing storage bucket ${bucket}:`, err);
        }
      }

      setShippingFiles(fallbackFiles);
    } catch (error) {
      console.error('Erro ao buscar arquivos de envio:', error);
    }
  };

  const deleteShippingFile = async (fileId: string, filePath: string) => {
    if (!isAdmin && !isSupplier()) return;
    if (!confirm('Tem certeza que deseja excluir esta etiqueta de envio?')) return;
    
    try {
      const { error: dbError } = await supabase
        .from('order_shipping_files')
        .delete()
        .eq('id', fileId);
        
      if (dbError) throw dbError;
      
      await supabase.storage.from('shipping-files').remove([filePath]);
      await supabase.storage.from('shipping-labels').remove([filePath]);
      
      setShippingFiles(prev => prev.filter(f => f.id !== fileId));
      toast({
        title: "Sucesso",
        description: "Etiqueta excluída com sucesso."
      });
    } catch (error) {
      console.error('Erro ao excluir etiqueta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a etiqueta.",
        variant: "destructive"
      });
    }
  };

  const getShippingFileBlob = async (filePath: string, fileName: string) => {
    if (filePath && (filePath.startsWith('http://') || filePath.startsWith('https://'))) {
      try {
        const response = await fetch(filePath);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const ext = fileName.split('.').pop()?.toLowerCase();
          const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/pdf';
          return new Blob([arrayBuffer], { type: mimeType });
        }
      } catch (e) {
        console.error('Error fetching file from signed URL:', e);
      }
    }

    let { data, error } = await supabase.storage.from('shipping-labels').download(filePath);
    if (error && filePath.includes('/')) {
      const pureFileName = filePath.split('/').pop() || fileName;
      const { data: d2, error: e2 } = await supabase.storage.from('shipping-labels').download(pureFileName);
      if (!e2 && d2) {
        data = d2;
        error = null;
      }
    }

    if (error || !data) {
      const { data: fData, error: fError } = await supabase.storage.from('shipping-files').download(filePath);
      if (fError && filePath.includes('/')) {
        const pureFileName = filePath.split('/').pop() || fileName;
        const { data: d3, error: e3 } = await supabase.storage.from('shipping-files').download(pureFileName);
        if (!e3 && d3) {
          data = d3;
          error = null;
        }
      } else if (!fError && fData) {
        data = fData;
        error = null;
      }
    }

    if (!data) {
      throw new Error('Não foi possível carregar o arquivo dos buckets de armazenamento.');
    }

    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeType = data.type || (ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/pdf');
    return new Blob([data], { type: mimeType });
  };

  const viewShippingFile = async (filePath: string, fileName: string) => {
    try {
      const blob = await getShippingFileBlob(filePath, fileName);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error: any) {
      console.error('Error viewing file:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao visualizar o arquivo.",
        variant: "destructive"
      });
    }
  };

  const printShippingFile = async (filePath: string, fileName: string) => {
    try {
      const blob = await getShippingFileBlob(filePath, fileName);
      const blobUrl = window.URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        setTimeout(() => {
          try {
            printWindow.print();
          } catch (e) {
            console.error('Error triggering print:', e);
          }
        }, 600);
      } else {
        toast({
          title: "Aviso",
          description: "Pop-up bloqueado. Permita janelas pop-up no navegador para abrir a janela de impressão.",
        });
      }
    } catch (error: any) {
      console.error('Error printing shipping file:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao tentar imprimir etiqueta.",
        variant: "destructive"
      });
    }
  };

  const downloadShippingFile = async (filePath: string, fileName: string) => {
    try {
      const blob = await getShippingFileBlob(filePath, fileName);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Sucesso",
        description: "Arquivo baixado com sucesso."
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao baixar o arquivo.",
        variant: "destructive"
      });
    }
  };

  const fetchRefundDocuments = async () => {
    if (!orderId) return;
    try {
      const { data, error } = await supabase
        .from('order_refund_documents')
        .select('*')
        .eq('order_id', orderId)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      setRefundDocuments(data || []);
    } catch (error) {
      console.error('Erro ao buscar documentos de reembolso:', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!orderId || (!isAdmin && !isSupplier())) return;
    setIsUploading(true);
    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `upload_${Date.now()}.${fileExtension}`;
      const filePath = `${orderId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('shipping-files').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('order_shipping_files').insert({
        order_id: orderId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size
      });
      if (dbError) throw dbError;

      toast({
        title: "Sucesso",
        description: "Etiqueta enviada com sucesso."
      });

      supabase.functions.invoke('dispatch-webhook', {
        body: {
          event_type: 'order.updated',
          order_id: orderId,
          event_reason: 'shipping_label_attached',
          changes: {
            shipping_label: {
              attached: true,
              file_name: file.name,
            }
          }
        }
      }).catch(err => console.warn('[OrderDetailsModal] Aviso webhook order.updated:', err));

      fetchShippingFiles();
      setUploadFile(null);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erro",
        description: `Não foi possível enviar o arquivo: ${error.message || error}`,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRefundFileUpload = async (file: File) => {
    if (!orderId || !isAdmin) return;
    setIsRefundUploading(true);
    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `refund_${Date.now()}.${fileExtension}`;
      const filePath = `${orderId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('refund-documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('order_refund_documents').insert({
        order_id: orderId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        uploaded_by: profile?.user_id
      });
      if (dbError) throw dbError;

      toast({
        title: "Sucesso",
        description: "Comprovante enviado com sucesso."
      });
      fetchRefundDocuments();
      setRefundUploadFile(null);
    } catch (error: any) {
      console.error('Error uploading refund document:', error);
      toast({
        title: "Erro",
        description: `Erro ao enviar comprovante: ${error.message || error}`,
        variant: "destructive"
      });
    } finally {
      setIsRefundUploading(false);
    }
  };

  const deleteRefundDocument = async (fileId: string, filePath: string) => {
    if (!isAdmin) return;
    if (!confirm('Tem certeza que deseja excluir este comprovante?')) return;
    
    try {
      const { error: dbError } = await supabase
        .from('order_refund_documents')
        .delete()
        .eq('id', fileId);
        
      if (dbError) throw dbError;
      
      await supabase.storage.from('refund-documents').remove([filePath]);
      setRefundDocuments(prev => prev.filter(f => f.id !== fileId));
      toast({
        title: "Sucesso",
        description: "Comprovante excluído com sucesso."
      });
    } catch (error) {
      console.error('Erro ao excluir comprovante:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o comprovante.",
        variant: "destructive"
      });
    }
  };

  const downloadRefundDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from('refund-documents').download(filePath);
      if (error) throw error;
      const blob = new Blob([data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Sucesso",
        description: "Documento baixado com sucesso."
      });
    } catch (error) {
      console.error('Error downloading refund document:', error);
      toast({
        title: "Erro",
        description: "Erro ao baixar documento.",
        variant: "destructive"
      });
    }
  };

  const handleAddQuickNote = async () => {
    if (!quickNote.trim() || !orderId) return;
    setIsAddingNote(true);
    try {
      const { error } = await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: order?.status || pipelineItem?.status || 'pendente',
        notes: `[Observação] ${quickNote.trim()}`,
      });
      if (error) throw error;
      sonnerToast.success('Observação registrada com sucesso!');
      setQuickNote('');
      fetchStatusHistory();
    } catch (err: any) {
      sonnerToast.error(err.message || 'Erro ao registrar observação.');
    } finally {
      setIsAddingNote(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    const Icon = getStatusConfig(status).icon;
    return <Icon className="h-3.5 w-3.5" />;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

  const formatBRL = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

  const formatAmountOnly = (val: number) =>
    Math.abs(val || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatPercent = (val: number) =>
    `${(val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopyPaymentLink = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const id = order?.id || pipelineItem?.id || orderId;
    if (!id) return;
    const paymentUrl = `https://lojafy.app/pagamento/${id}`;
    navigator.clipboard.writeText(paymentUrl);
    setCopiedLink(true);
    sonnerToast.success("Link de pagamento copiado!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyOrderNumber = () => {
    const num = order?.order_number || pipelineItem?.order_number;
    if (!num) return;
    navigator.clipboard.writeText(num);
    setCopiedOrderId(true);
    sonnerToast.success("Número do pedido copiado!");
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  // Regra de identificação do fornecedor conforme o perfil:
  const displayedSupplierName = useMemo(() => {
    if (isSuperAdmin() || isAdmin) {
      return pipelineItem?.supplier_name || order?.supplier_name || 'Fornecedor';
    }
    if (isSupplier()) {
      return (
        profile?.business_name ||
        `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
        pipelineItem?.supplier_name ||
        'Fornecedor'
      );
    }
    // Cliente e Revendedor / Seller veem Lojafy
    return 'Lojafy';
  }, [isSuperAdmin, isAdmin, isSupplier, profile, pipelineItem, order]);

  const isPaid = order?.payment_status === 'paid' || order?.status === 'pago' || pipelineItem?.is_paid;
  const displayOrderNumber = order?.order_number || pipelineItem?.order_number || orderId?.slice(0, 8);
  const displayTracking = order?.tracking_number || pipelineItem?.tracking_number;
  const displayExternalRef =
    order?.external_reference ||
    order?.ml_order_id ||
    pipelineItem?.external_reference;

  // Products list to render
  const itemsToRender = order?.order_items && order.order_items.length > 0
    ? order.order_items
    : pipelineItem?.main_product
    ? [
        {
          id: pipelineItem.id,
          product_id: pipelineItem.main_product.id || '',
          quantity: pipelineItem.main_product.quantity || 1,
          unit_price: pipelineItem.sale_amount,
          total_price: pipelineItem.sale_amount,
          product_snapshot: {
            name: pipelineItem.main_product.name,
            imageUrl: pipelineItem.main_product.imageUrl,
            image_url: pipelineItem.main_product.imageUrl,
          },
        },
      ]
    : [];

  if (!order && !pipelineItem && !loading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background shadow-2xl border">
        <TooltipProvider>
          {/* ============================================================== */}
          {/* HEADER SLIM (Linha Única & Informações Essenciais)              */}
          {/* ============================================================== */}
          <DialogHeader className="p-3.5 sm:p-4 pb-2.5 border-b bg-muted/20 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Esquerda: Identificação + Badges em linha */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <DialogTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-1">
                    <span>Pedido #{displayOrderNumber}</span>
                    <button
                      onClick={handleCopyOrderNumber}
                      title="Copiar número do pedido"
                      className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
                    >
                      {copiedOrderId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </DialogTitle>

                  {/* Status Operacional */}
                  {(order?.status || pipelineItem?.status) && (
                    <Badge variant={getStatusVariant(order?.status || pipelineItem?.status || 'pendente')} className="gap-1 text-[10px] font-semibold h-5 px-1.5">
                      {getStatusIcon(order?.status || pipelineItem?.status || 'pendente')}
                      <span>{getStatusLabel(order?.status || pipelineItem?.status || 'pendente')}</span>
                    </Badge>
                  )}

                  {/* Canal / Plataforma */}
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1.5 py-0 font-semibold uppercase tracking-wider h-5",
                      pipelineItem?.channel === "mercadolivre"
                        ? "bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800"
                        : pipelineItem?.channel === "shopee"
                        ? "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {pipelineItem?.channel_label || "LOJAFY"}
                  </Badge>

                  {/* Origem AUTO / MANUAL */}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[9px] px-1.5 py-0 font-semibold tracking-wider h-5",
                      pipelineItem?.origin_type === "AUTO"
                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {pipelineItem?.origin_type || "AUTO"}
                  </Badge>

                  {/* Tempo na etapa */}
                  {pipelineItem?.time_in_stage_display && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                      <Clock className="w-2.5 h-2.5 text-muted-foreground/80" />
                      {pipelineItem.time_in_stage_display}
                    </span>
                  )}
                </div>

                {/* Sublinha de identificadores secundários */}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
                  {displayExternalRef && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-background/80 px-1.5 py-0.2 rounded border border-border/50">
                      <span className="text-muted-foreground">Ref:</span>
                      <strong className="text-foreground">{displayExternalRef}</strong>
                    </span>
                  )}

                  {displayTracking && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-background/80 px-1.5 py-0.2 rounded border border-border/50">
                      <Truck className="w-3 h-3 text-blue-500" />
                      <span>{displayTracking}</span>
                    </span>
                  )}

                  {order?.created_at && (
                    <span className="text-[10px] text-muted-foreground">
                      Criado em {formatDate(order.created_at)}
                    </span>
                  )}
                </div>
              </div>

              {/* Botão de Pagamento Contextual */}
              <div className="flex items-center gap-2 shrink-0">
                {isPaid ? (
                  <Badge
                    variant="default"
                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-600 text-white font-medium gap-1 pointer-events-none select-none shadow-none"
                  >
                    <Check className="w-3 h-3 stroke-[2.5]" />
                    <span>Pago ✓</span>
                  </Badge>
                ) : isSuperAdmin() || isSupplier() ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2.5 text-xs font-medium gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 shadow-2xs transition-colors cursor-pointer"
                    onClick={handleCopyPaymentLink}
                    title="Copiar link da página de pagamento"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                        <span className="font-semibold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2.5 text-xs font-medium gap-1 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20 cursor-pointer"
                    onClick={handleCopyPaymentLink}
                  >
                    <QrCode className="w-3 h-3" />
                    <span>Gerar Pix</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Ações Operacionais (Inline, compactas) */}
            {order && profile && (
              <div className="pt-2 mt-1.5 border-t border-border/40">
                <OrderActionBar
                  order={order}
                  userRole={profile.role || 'customer'}
                  deliveredAt={deliveredAt}
                  existingTicketId={existingTicketId}
                  onRefresh={() => {
                    fetchOrderDetails();
                    fetchStatusHistory();
                    fetchExistingTicket();
                    fetchDeliveredAt();
                  }}
                />
              </div>
            )}
          </DialogHeader>

          {/* ============================================================== */}
          {/* CORPO COMPACTO — ZERO SCROLL (Tudo Visível no Primeiro Plano)   */}
          {/* ============================================================== */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">
            {/* 1. Grade Superior: Produto (Esquerda) e Participantes (Direita) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {/* Coluna Produto */}
              <div className="rounded-lg border border-border/60 bg-muted/15 p-2.5 flex items-center gap-3">
                {itemsToRender.length > 0 && (
                  <>
                    <div className="w-11 h-11 rounded border bg-background overflow-hidden shrink-0 flex items-center justify-center">
                      {itemsToRender[0]?.product_snapshot?.image_url ||
                      itemsToRender[0]?.product_snapshot?.imageUrl ||
                      itemsToRender[0]?.product_snapshot?.images?.[0] ? (
                        <img
                          src={
                            itemsToRender[0]?.product_snapshot?.image_url ||
                            itemsToRender[0]?.product_snapshot?.imageUrl ||
                            itemsToRender[0]?.product_snapshot?.images?.[0]
                          }
                          alt="Produto"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
                        {itemsToRender[0]?.product_snapshot?.name || pipelineItem?.main_product?.name || "Produto"}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground mt-0.5">
                        <span>
                          Qtd: <strong className="text-foreground">{itemsToRender[0]?.quantity || 1} un.</strong>
                        </span>
                        {itemsToRender[0]?.product_snapshot?.sku && (
                          <span>• SKU: <span className="font-mono">{itemsToRender[0]?.product_snapshot?.sku}</span></span>
                        )}
                        {itemsToRender.length > 1 && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                            +{itemsToRender.length - 1} outro(s)
                          </Badge>
                        )}
                      </div>
                    </div>

                    {itemsToRender[0]?.product_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => window.open(`/produto/${itemsToRender[0].product_id}`, '_blank')}
                        title="Ver produto"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Coluna Participantes da Operação */}
              <div className="rounded-lg border border-border/60 bg-muted/15 p-2.5 flex flex-col justify-center space-y-1 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Seller:</span>
                  <span className="font-bold text-foreground truncate max-w-[200px] text-right" title={pipelineItem?.seller_name}>
                    {pipelineItem?.seller_name || "Lojafy"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-bold text-foreground truncate max-w-[200px] text-right" title={pipelineItem?.customer_name}>
                    {pipelineItem?.customer_name || "Cliente Final"}
                    {(pipelineItem?.customer_city || pipelineItem?.customer_state) && (
                      <span className="font-normal text-muted-foreground ml-1 text-[10px]">
                        ({[pipelineItem.customer_city, pipelineItem.customer_state].filter(Boolean).join(" / ")})
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Fornecedor:</span>
                  <span className="font-bold text-foreground truncate max-w-[200px] text-right" title={displayedSupplierName}>
                    {displayedSupplierName}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Decomposição Financeira Completa (Exibida Direto, Sem Abas!) */}
            <div className={cn(
              "grid gap-2.5",
              showAdminMetrics ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
            )}>
              {/* Bloco 1: REVENDEDOR */}
              <div className="rounded-lg border border-border/70 bg-card p-3 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between pb-1 border-b border-border/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Receipt className="w-3 h-3 text-primary" />
                    Revendedor
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {pipelineItem?.is_marketplace ? "Marketplace (ML)" : "Venda Direta"}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 gap-y-1 text-xs">
                  {/* Venda */}
                  <span className="text-muted-foreground">Venda</span>
                  <span className="font-mono text-muted-foreground text-right text-[11px]">R$</span>
                  <span className="font-mono font-semibold text-foreground text-right tabular-nums">
                    {formatAmountOnly(pipelineItem?.sale_amount || order?.total_amount || 0)}
                  </span>

                  {/* Taxas Marketplace com Tooltip Informativo */}
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <span>Taxas</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help inline-flex items-center">
                          <Info className="w-2.5 h-2.5 text-muted-foreground/70 hover:text-foreground transition-colors" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] p-2 space-y-1 text-xs bg-popover text-popover-foreground shadow-md border">
                        <p className="font-semibold text-foreground text-[10px]">Composição das Taxas:</p>
                        <div className="space-y-0.5 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tarifa Fixa ML:</span>
                            <span className="font-mono text-rose-500 font-medium">R$ 6,00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Comissão ML:</span>
                            <span className="font-mono text-rose-500 font-medium">
                              {formatBRL(Math.max(0, (pipelineItem?.marketplace_fee || 0) - 6))}
                            </span>
                          </div>
                        </div>
                        <div className="border-t border-border/60 pt-1 mt-1 flex justify-between font-semibold text-[10px]">
                          <span>Total Retido ML:</span>
                          <span className="font-mono text-rose-600 dark:text-rose-400">
                            -{formatBRL(pipelineItem?.marketplace_fee || 0)}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className="font-mono text-rose-600 dark:text-rose-400 text-right text-[11px] font-medium">-R$</span>
                  <span className="font-mono font-medium text-rose-600 dark:text-rose-400 text-right tabular-nums">
                    {formatAmountOnly(pipelineItem?.marketplace_fee || 0)}
                  </span>

                  {/* Custo (Preço Cobrado pela Lojafy) */}
                  <span className="text-muted-foreground">Custo</span>
                  <span className="font-mono text-muted-foreground text-right text-[11px]">R$</span>
                  <span className="font-mono font-semibold text-foreground text-right tabular-nums">
                    {formatAmountOnly(pipelineItem?.seller_cost || 0)}
                  </span>

                  <Separator className="col-span-3 my-0.5" />

                  {/* Lucro Líquido Revendedor */}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span>Lucro Líquido:</span>
                    <span className="font-mono text-[10px] font-semibold">
                      {formatPercent(pipelineItem?.seller_margin_pct || 0)}
                    </span>
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 text-right text-[11px] font-bold">R$</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right tabular-nums text-sm">
                    {formatAmountOnly(pipelineItem?.seller_profit || 0)}
                  </span>
                </div>
              </div>

              {/* Bloco 2: LOJAFY (Exclusivo para SuperAdmin / Admin) */}
              {showAdminMetrics && (
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between pb-1 border-b border-border/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Lojafy
                    </span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                      Admin
                    </Badge>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 gap-y-1 text-xs">
                    {/* Venda Lojafy */}
                    <span className="text-[11px] text-muted-foreground">Venda</span>
                    <span className="font-mono text-muted-foreground text-right text-[11px]">R$</span>
                    <span className="font-mono font-medium text-foreground text-right tabular-nums text-[11px]">
                      {formatAmountOnly(pipelineItem?.lojafy_sale || pipelineItem?.seller_cost || 0)}
                    </span>

                    {/* Taxas Lojafy com Tooltip */}
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span>Taxas</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help inline-flex items-center">
                            <Info className="w-2.5 h-2.5 text-muted-foreground/70 hover:text-foreground transition-colors" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px] p-2 space-y-1 text-xs bg-popover text-popover-foreground shadow-md border">
                          <p className="font-semibold text-foreground text-[10px]">Taxas Lojafy:</p>
                          <div className="space-y-0.5 text-[10px]">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Transação (4,5%):</span>
                              <span className="font-mono text-rose-500 font-medium">
                                {formatBRL((pipelineItem?.lojafy_sale || 0) * 0.045)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Contingenciamento (1%):</span>
                              <span className="font-mono text-rose-500 font-medium">
                                {formatBRL(((pipelineItem?.lojafy_sale || 0) * 0.955) * 0.01)}
                              </span>
                            </div>
                          </div>
                          <div className="border-t border-border/60 pt-1 mt-1 flex justify-between font-semibold text-[10px]">
                            <span>Total Lojafy:</span>
                            <span className="font-mono text-rose-600 dark:text-rose-400">
                              -{formatBRL(pipelineItem?.lojafy_fee || 0)}
                            </span>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                    <span className="font-mono text-rose-600 dark:text-rose-400 text-right text-[11px] font-medium">-R$</span>
                    <span className="font-mono font-medium text-rose-600 dark:text-rose-400 text-right tabular-nums text-[11px]">
                      {formatAmountOnly(pipelineItem?.lojafy_fee || 0)}
                    </span>

                    {/* Custo Fornecedor */}
                    <span className="text-[11px] text-muted-foreground">Custo Fornecedor</span>
                    <span className="font-mono text-muted-foreground text-right text-[11px]">R$</span>
                    <span className="font-mono font-medium text-foreground text-right tabular-nums text-[11px]">
                      {formatAmountOnly(pipelineItem?.lojafy_cost || 0)}
                    </span>

                    <Separator className="col-span-3 my-0.5" />

                    {/* Lucro Líquido Lojafy */}
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span>Lucro Líquido:</span>
                      <span className="font-mono text-[10px] font-semibold">
                        {formatPercent(pipelineItem?.lojafy_margin_pct || 0)}
                      </span>
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-right text-[11px] font-bold">R$</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right tabular-nums text-xs">
                      {formatAmountOnly(pipelineItem?.lojafy_profit || 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Seções Recolhíveis (Anexos, Observações, Histórico e Endereço) */}
            <Accordion type="multiple" className="w-full space-y-2 pt-0.5">
              {/* A. Anexos & Etiquetas de Envio */}
              <AccordionItem value="documents" className="border border-border/60 rounded-lg px-3 bg-muted/10">
                <AccordionTrigger className="py-2 text-xs font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span>Anexos & Etiquetas de Envio</span>
                    {(shippingFiles.length > 0 || refundDocuments.length > 0) && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                        {shippingFiles.length + refundDocuments.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1.5 pb-2.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">Etiquetas Disponíveis:</span>
                    {canManageShippingFiles && (
                      <div>
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setUploadFile(file);
                          }}
                          className="hidden"
                          id="modal-quick-shipping-upload"
                        />
                        <Label
                          htmlFor="modal-quick-shipping-upload"
                          className="cursor-pointer inline-flex items-center rounded text-xs font-medium border border-input bg-background hover:bg-accent px-2 py-1 gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Anexar Nova Etiqueta</span>
                        </Label>
                      </div>
                    )}
                  </div>

                  {uploadFile && canManageShippingFiles && (
                    <div className="p-2 border rounded bg-muted/40 flex items-center justify-between text-xs">
                      <span className="truncate max-w-[200px] font-medium">{uploadFile.name}</span>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleFileUpload(uploadFile)} disabled={isUploading}>
                          {isUploading ? "Enviando..." : "Confirmar"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setUploadFile(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {shippingFiles.length > 0 ? (
                    <div className="space-y-1.5">
                      {shippingFiles.map((file) => (
                        <div key={file.id} className="flex flex-wrap items-center justify-between gap-2 p-2 border border-border/50 rounded bg-background text-xs">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{file.file_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatFileSize(file.file_size)} • {formatDate(file.uploaded_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={() => viewShippingFile(file.file_path, file.file_name)}>
                              <Eye className="w-3 h-3 mr-1" />
                              Ver
                            </Button>
                            <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={() => downloadShippingFile(file.file_path, file.file_name)}>
                              <Download className="w-3 h-3 mr-1" />
                              Baixar
                            </Button>
                            <Button size="sm" className="h-6 px-2 text-[11px] bg-blue-600 hover:bg-blue-700 text-white" onClick={() => printShippingFile(file.file_path, file.file_name)}>
                              <Printer className="w-3 h-3 mr-1" />
                              Imprimir
                            </Button>
                            {canManageShippingFiles && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => deleteShippingFile(file.id, file.file_path)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-1 text-center">Nenhuma etiqueta anexada a este pedido.</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* B. Observações do Pedido & Campo para Anotar */}
              <AccordionItem value="notes" className="border border-border/60 rounded-lg px-3 bg-muted/10">
                <AccordionTrigger className="py-2 text-xs font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    <span>Observações do Pedido</span>
                    {(order?.notes || statusHistory.some((h) => h.notes)) && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-300 text-amber-700">
                        Possui notas
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1.5 pb-2.5 space-y-2.5 text-xs">
                  {/* Notas existentes registradas no pedido */}
                  {order?.notes && (
                    <div className="p-2 rounded border border-border/50 bg-background whitespace-pre-wrap text-muted-foreground font-mono text-[11px]">
                      {order.notes}
                    </div>
                  )}

                  {/* Notas do histórico */}
                  {statusHistory.filter((h) => h.notes).length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Anotações Anteriores:</span>
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {statusHistory
                          .filter((h) => h.notes)
                          .map((h) => (
                            <div key={h.id} className="p-1.5 rounded bg-background border border-border/40 text-[11px]">
                              <p className="text-foreground">{h.notes}</p>
                              <span className="text-[9px] text-muted-foreground block mt-0.5 font-mono">
                                {formatDate(h.created_at)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Campo direto para registrar nova anotação */}
                  <div className="pt-1 border-t border-border/40 space-y-1.5">
                    <Label className="text-[11px] font-medium text-foreground">Nova Observação:</Label>
                    <div className="flex gap-2">
                      <Input
                        value={quickNote}
                        onChange={(e) => setQuickNote(e.target.value)}
                        placeholder="Escreva uma anotação sobre o pedido..."
                        className="h-8 text-xs flex-1 bg-background"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddQuickNote();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs gap-1 cursor-pointer shrink-0"
                        onClick={handleAddQuickNote}
                        disabled={isAddingNote || !quickNote.trim()}
                      >
                        {isAddingNote ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                        <span>Salvar</span>
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* C. Histórico de Movimentações */}
              <AccordionItem value="history" className="border border-border/60 rounded-lg px-3 bg-muted/10">
                <AccordionTrigger className="py-2 text-xs font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Histórico de Movimentações</span>
                    {statusHistory.length > 0 && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                        {statusHistory.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1.5 pb-2.5 text-xs">
                  {statusHistory.length > 0 ? (
                    <div className="relative border-l-2 border-border/70 ml-2.5 space-y-3 pl-3 py-1">
                      {statusHistory.map((item) => (
                        <div key={item.id} className="relative">
                          <div className="absolute -left-[19px] top-0.5 w-5 h-5 rounded-full bg-primary/10 border-2 border-background text-primary flex items-center justify-center">
                            {getStatusIcon(item.status)}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant={getStatusVariant(item.status)} className="text-[9px] px-1 py-0 h-4">
                                {getStatusLabel(item.status)}
                              </Badge>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {formatDate(item.created_at)}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 bg-muted/30 p-1.5 rounded border border-border/40">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Nenhuma movimentação registrada no histórico.
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* D. Endereço Completo de Entrega */}
              {(order?.shipping_address || pipelineItem?.customer_city) && (
                <AccordionItem value="address" className="border border-border/60 rounded-lg px-3 bg-muted/10">
                  <AccordionTrigger className="py-2 text-xs font-semibold hover:no-underline">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      <span>Endereço Completo de Entrega</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1.5 pb-2.5 text-xs">
                    {order?.shipping_address ? (
                      <div className="p-2 rounded border border-border/50 bg-background space-y-0.5 text-[11px]">
                        {(order.shipping_address.name || order.shipping_address.receiver_name) && (
                          <p className="font-semibold text-foreground">
                            Destinatário: {order.shipping_address.name || order.shipping_address.receiver_name}
                          </p>
                        )}
                        <p className="text-foreground">
                          {[
                            order.shipping_address.street || order.shipping_address.address,
                            order.shipping_address.number,
                            order.shipping_address.complement,
                          ].filter(Boolean).join(", ")}
                        </p>
                        {order.shipping_address.neighborhood && (
                          <p className="text-muted-foreground">Bairro: {order.shipping_address.neighborhood}</p>
                        )}
                        <p className="text-muted-foreground">
                          {[order.shipping_address.city, order.shipping_address.state].filter(Boolean).join(" - ")}
                          {order.shipping_address.zip_code && ` • CEP: ${order.shipping_address.zip_code}`}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Destino: {[pipelineItem?.customer_city, pipelineItem?.customer_state].filter(Boolean).join(" / ")}
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;
