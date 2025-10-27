import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Eye, Truck, CheckCircle, Clock, XCircle, MapPin, CreditCard, Calendar, User, FileText, Download, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot: any;
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
  created_at: string;
  tracking_number?: string;
  shipping_address?: any;
  billing_address?: any;
  notes?: string;
  user_id: string;
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

interface OrderDetailsModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ orderId, isOpen, onClose }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistory[]>([]);
  const [shippingFiles, setShippingFiles] = useState<ShippingFile[]>([]);
  const [refundDocuments, setRefundDocuments] = useState<RefundDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [refundUploadFile, setRefundUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefundUploading, setIsRefundUploading] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  useEffect(() => {
    if (orderId && isOpen) {
      fetchOrderDetails();
      fetchStatusHistory();
      fetchShippingFiles();
      fetchRefundDocuments();
    }
  }, [orderId, isOpen]);

  const fetchOrderDetails = async () => {
    if (!orderId) return;

    setLoading(true);
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
          product_snapshot
        )
      `)
      .eq('id', orderId)
      .single();

      if (error) throw error;
      setOrder(data);

      // Fetch customer profile
      if (data?.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name, cpf, phone')
          .eq('user_id', data.user_id)
          .single();
        
        setCustomer(profileData);
      }
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

      if (error) throw error;
      setShippingFiles(data || []);
    } catch (error) {
      console.error('Erro ao buscar arquivos de envio:', error);
    }
  };

  const downloadShippingFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('shipping-files')
        .download(filePath);

      if (error) {
        console.error('Error downloading file:', error);
        toast({
          title: "Erro",
          description: "Não foi possível baixar o arquivo.",
          variant: "destructive"
        });
        return;
      }

      // Create blob URL and trigger download
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
        description: "Arquivo baixado com sucesso.",
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
    if (!orderId || !isAdmin) return;

    setIsUploading(true);
    try {
      // Generate unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `admin_upload_${Date.now()}.${fileExtension}`;
      const filePath = `${orderId}/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('shipping-files')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Insert file record into database
      const { error: dbError } = await supabase
        .from('order_shipping_files')
        .insert({
          order_id: orderId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
        });

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "Sucesso",
        description: "Arquivo enviado com sucesso.",
      });

      // Refresh shipping files
      fetchShippingFiles();
      setUploadFile(null);

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o arquivo.",
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
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('refund-documents')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Insert record
      const { error: dbError } = await supabase
        .from('order_refund_documents')
        .insert({
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
    } catch (error) {
      console.error('Error uploading refund document:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar comprovante.",
        variant: "destructive"
      });
    } finally {
      setIsRefundUploading(false);
    }
  };

  const downloadRefundDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('refund-documents')
        .download(filePath);
      
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'refunded': return <CheckCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Aguardando pagamento';
      case 'processing': return 'Processando';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregue';
      case 'cancelled': return 'Cancelado';
      case 'refunded': return 'Reembolsado';
      default: return 'Desconhecido';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'delivered': return 'default';
      case 'shipped': return 'secondary';
      case 'processing': return 'outline';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      case 'refunded': return 'secondary';
      default: return 'outline';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (!order && !loading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <div>Pedido #{order?.order_number}</div>
              {customer && (
                <div className="text-sm font-normal text-muted-foreground mt-1">
                  Cliente: {customer.first_name} {customer.last_name}
                </div>
              )}
            </div>
            {order && (
              <Badge variant={getStatusVariant(order.status)} className="flex items-center gap-1">
                {getStatusIcon(order.status)}
                {getStatusLabel(order.status)}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground mt-2">Carregando detalhes...</p>
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Customer Info */}
            {customer && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Informações do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Nome</p>
                      <p className="font-semibold">{customer.first_name} {customer.last_name}</p>
                    </div>
                    {customer.cpf && (
                      <div>
                        <p className="font-medium text-muted-foreground">CPF</p>
                        <p className="font-semibold">{customer.cpf}</p>
                      </div>
                    )}
                    {customer.phone && (
                      <div>
                        <p className="font-medium text-muted-foreground">Telefone</p>
                        <p className="font-semibold">{customer.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-muted-foreground">Total do Pedido</p>
                      <p className="font-semibold text-lg text-primary">{formatPrice(Number(order.total_amount))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{formatDate(order.created_at)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {order.payment_method === 'pix' ? 'PIX' : 
                       order.payment_method === 'credit_card' ? 'Cartão de Crédito' : 
                       order.payment_method || 'Não informado'}
                    </p>
                    <p className={`text-sm ${
                      order.payment_status === 'paid' 
                        ? 'text-green-600' 
                        : 'text-amber-600'
                    }`}>
                      {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {order.tracking_number && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Rastreamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">{order.tracking_number}</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Rastrear Pedido
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle>Produtos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                {order.order_items.map((item, index) => {
                  const product = item.product_snapshot;
                  return (
                    <div key={index} className="flex items-center gap-4 pb-4 border-b border-border last:border-0">
                      {product?.image_url && (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">{product?.name || 'Produto'}</h4>
                        {product?.brand && (
                          <p className="text-sm text-muted-foreground">{product.brand}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Quantidade: {item.quantity} • Preço unitário: {formatPrice(Number(item.unit_price))}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold">{formatPrice(Number(item.total_price))}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/super-admin/produtos?id=${item.product_id}`, '_blank')}
                          title="Ver página do produto"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(Number(order.total_amount) - Number(order.shipping_amount || 0) - Number(order.tax_amount || 0))}</span>
                </div>
                {order.shipping_amount && Number(order.shipping_amount) > 0 && (
                  <div className="flex justify-between">
                    <span>Frete:</span>
                    <span>{formatPrice(Number(order.shipping_amount))}</span>
                  </div>
                )}
                {order.tax_amount && Number(order.tax_amount) > 0 && (
                  <div className="flex justify-between">
                    <span>Taxas:</span>
                    <span>{formatPrice(Number(order.tax_amount))}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>{formatPrice(Number(order.total_amount))}</span>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Files */}
            {(shippingFiles.length > 0 || isAdmin) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Etiquetas de Envio
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setUploadFile(file);
                          }}
                          className="hidden"
                          id="file-upload"
                        />
                        <Label
                          htmlFor="file-upload"
                          className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Enviar Arquivo
                        </Label>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {uploadFile && isAdmin && (
                    <div className="mb-4 p-3 border border-border rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-medium">{uploadFile.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleFileUpload(uploadFile)}
                            disabled={isUploading}
                          >
                            {isUploading ? "Enviando..." : "Confirmar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setUploadFile(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {shippingFiles.length > 0 ? (
                      shippingFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{file.file_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(file.file_size)} • Enviado em {formatDate(file.uploaded_at)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadShippingFile(file.file_path, file.file_name)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Baixar
                          </Button>
                        </div>
                      ))
                    ) : !isAdmin ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma etiqueta disponível para este pedido.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma etiqueta enviada ainda. Use o botão acima para fazer upload.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Refund Documents - Only show if order is refunded or if admin */}
            {(order.status === 'refunded' || isAdmin) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-600" />
                      Comprovantes de Reembolso (PDF)
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.type === 'application/pdf') {
                              setRefundUploadFile(file);
                            } else {
                              toast({
                                title: "Erro",
                                description: "Por favor, selecione apenas arquivos PDF.",
                                variant: "destructive"
                              });
                            }
                          }}
                          className="hidden"
                          id="refund-file-upload"
                        />
                        <Label
                          htmlFor="refund-file-upload"
                          className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Enviar PDF
                        </Label>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {refundUploadFile && isAdmin && (
                    <div className="mb-4 p-3 border border-amber-200 rounded-lg bg-amber-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-900">{refundUploadFile.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRefundFileUpload(refundUploadFile)}
                            disabled={isRefundUploading}
                          >
                            {isRefundUploading ? "Enviando..." : "Confirmar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRefundUploadFile(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {refundDocuments.length > 0 ? (
                      refundDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border border-amber-200 rounded-lg bg-amber-50">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-lg">
                              <FileText className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium text-amber-900">{doc.file_name}</p>
                              <p className="text-sm text-amber-700">
                                {formatFileSize(doc.file_size)} • Enviado em {formatDate(doc.uploaded_at)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadRefundDocument(doc.file_path, doc.file_name)}
                            className="border-amber-300 hover:bg-amber-100"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Baixar PDF
                          </Button>
                        </div>
                      ))
                    ) : !isAdmin ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum comprovante disponível.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum comprovante enviado. Use o botão acima para fazer upload de PDFs.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Addresses */}
            {(order.shipping_address || order.billing_address) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.shipping_address && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Endereço de Entrega
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p>{order.shipping_address.street}, {order.shipping_address.number}</p>
                      {order.shipping_address.complement && <p>{order.shipping_address.complement}</p>}
                      <p>{order.shipping_address.neighborhood}</p>
                      <p>{order.shipping_address.city} - {order.shipping_address.state}</p>
                      <p>CEP: {order.shipping_address.zip_code}</p>
                    </CardContent>
                  </Card>
                )}

                {order.billing_address && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Endereço de Cobrança
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p>{order.billing_address.street}, {order.billing_address.number}</p>
                      {order.billing_address.complement && <p>{order.billing_address.complement}</p>}
                      <p>{order.billing_address.neighborhood}</p>
                      <p>{order.billing_address.city} - {order.billing_address.state}</p>
                      <p>CEP: {order.billing_address.zip_code}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Status History */}
            {statusHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Histórico do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {statusHistory.map((item) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full mt-0.5">
                          {getStatusIcon(item.status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{getStatusLabel(item.status)}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(item.created_at)}</p>
                          </div>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Notes */}
            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Pedido não encontrado.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;