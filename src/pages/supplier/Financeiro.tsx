import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Wallet,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Search,
  RefreshCw,
  Download,
  Eye,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Percent,
  CheckCircle2,
  Clock,
  XCircle,
  Receipt,
} from 'lucide-react';

interface SupplierTransactionItem {
  id: string;
  productId: string | null;
  productName: string;
  sku: string | null;
  imageUrl: string | null;
  quantity: number;
  unitGrossPrice: number;
  totalGrossPrice: number;
  unitNetPrice: number;
  totalNetPrice: number;
  feeAmount: number;
  platformAmount: number;
}

interface SupplierSaleTransaction {
  id: string;
  orderId: string;
  orderNumber: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string | null;
  isCreditedToWallet: boolean;
  items: SupplierTransactionItem[];
  totalQuantity: number;
  grossAmount: number;      // Produto pago pelo cliente (X)
  platformAmount: number;   // Montante que ficou com a plataforma
  feeAmount: number;        // Taxa da transação/gateway
  feePercentage: number;    // % da taxa aplicada
  netAmount: number;        // Quanto o fornecedor recebe líquido
}

interface WalletLedgerEntry {
  id: string;
  tipo: string;
  valor: number;
  taxa: number;
  saldo_anterior: number;
  saldo_posterior: number;
  descricao: string | null;
  referencia_tipo: string | null;
  referencia_id: string | null;
  status: string;
  created_at: string;
}

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

const ORDER_STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  pendente: { label: 'Pendente', variant: 'secondary' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  confirmado: { label: 'Confirmado', variant: 'default' },
  processing: { label: 'Em Processamento', variant: 'default' },
  em_separacao: { label: 'Em Separação', variant: 'secondary' },
  shipped: { label: 'Enviado', variant: 'default' },
  enviado: { label: 'Enviado', variant: 'default' },
  delivered: { label: 'Entregue', variant: 'default' },
  finalizado: { label: 'Finalizado', variant: 'default' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
  reembolsado: { label: 'Reembolsado', variant: 'destructive' },
  devolucao_aprovada: { label: 'Devolvido', variant: 'destructive' },
};

const LEDGER_TYPE_LABELS: Record<string, string> = {
  pagamento_pedido: 'Recebimento de Venda',
  recarga: 'Crédito',
  estorno: 'Estorno / Cancelamento',
  bonus: 'Bônus',
  ajuste_credito: 'Ajuste de Crédito (+)',
  ajuste_debito: 'Baixa / Repasse PIX (-)',
  cashback: 'Comissão',
};

const SupplierFinanceiro: React.FC = () => {
  const { getEffectiveUserId } = useAuth();
  const userId = getEffectiveUserId();
  const { data: orgData, isLoading: orgLoading } = useSupplierOrganization();
  const orgId = orgData?.organization?.id;
  const ownerUserId = orgData?.organization?.owner_user_id;
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<SupplierSaleTransaction | null>(null);
  const [activeTab, setActiveTab] = useState('transactions');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['supplier-financeiro', orgId, userId, ownerUserId],
    enabled: !!userId && !orgLoading,
    queryFn: async () => {
      const candidateUserIds = Array.from(new Set([userId, ownerUserId].filter(Boolean))) as string[];

      // 1. Buscar configurações financeiras da plataforma (taxas e splits)
      const { data: platformSettings } = await supabase
        .from('platform_settings')
        .select('gateway_fee_percentage, platform_fee_value, platform_fee_type, split_fornecedor_percentual, split_plataforma_percentual')
        .maybeSingle();

      // Taxa de transação padrão (ex: 4.5% transação + 1% contingência = 5.5% ou configurada no banco)
      const gatewayFeePct = Number(platformSettings?.gateway_fee_percentage) > 0
        ? Number(platformSettings?.gateway_fee_percentage)
        : 5.5;
      const splitFornecedorPct = Number(platformSettings?.split_fornecedor_percentual) || 0;

      // 2. Buscar carteira do fornecedor
      let walletData: { id: string; saldo: number; saldo_bloqueado: number } | null = null;
      if (candidateUserIds.length > 0) {
        const { data: wallets } = await supabase
          .from('wallets')
          .select('id, user_id, saldo, saldo_bloqueado')
          .in('user_id', candidateUserIds);

        if (wallets && wallets.length > 0) {
          walletData = wallets.find(w => w.user_id === ownerUserId) || wallets[0];
        }
      }

      // 3. Buscar movimentações da carteira (wallet_transactions) e splits creditados
      let ledgerEntries: WalletLedgerEntry[] = [];
      if (walletData?.id) {
        const { data: wTxs } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', walletData.id)
          .order('created_at', { ascending: false });
        ledgerEntries = (wTxs || []) as WalletLedgerEntry[];
      }

      let splitsByOrderId = new Map<string, number>();
      if (candidateUserIds.length > 0) {
        const { data: splits } = await supabase
          .from('order_payment_splits')
          .select('order_id, valor, status')
          .in('recipient_user_id', candidateUserIds)
          .eq('recipient_role', 'supplier');

        if (splits) {
          for (const sp of splits) {
            if (sp.status === 'credited') {
              splitsByOrderId.set(sp.order_id, (splitsByOrderId.get(sp.order_id) || 0) + Number(sp.valor || 0));
            }
          }
        }
      }

      // 4. Buscar produtos do fornecedor para referência de preço/custo
      let productsQuery = supabase
        .from('products')
        .select('id, name, sku, price, cost_price, supplier_cost_price, main_image_url, image_url');

      if (orgId && userId) {
        productsQuery = productsQuery.or(`supplier_organization_id.eq.${orgId},supplier_id.eq.${userId}`);
      } else if (orgId) {
        productsQuery = productsQuery.eq('supplier_organization_id', orgId);
      } else if (userId) {
        productsQuery = productsQuery.eq('supplier_id', userId);
      }

      const { data: supplierProducts } = await productsQuery;
      const productsMap = new Map((supplierProducts || []).map(p => [p.id, p]));

      // 5. Buscar fulfillments do fornecedor (fonte primária de vendas da organização)
      let fulfillmentsData: any[] = [];
      if (orgId) {
        const { data: fData } = await supabase
          .from('supplier_fulfillments')
          .select(`
            id,
            order_id,
            status,
            created_at,
            shipped_at,
            delivered_at,
            orders (
              id,
              order_number,
              status,
              payment_status,
              total_amount,
              created_at,
              user_id
            ),
            supplier_fulfillment_items (
              id,
              order_item_id,
              product_id,
              quantity,
              products (
                id,
                name,
                sku,
                price,
                cost_price,
                supplier_cost_price,
                main_image_url,
                image_url
              )
            )
          `)
          .eq('supplier_organization_id', orgId)
          .order('created_at', { ascending: false });

        fulfillmentsData = fData || [];
      }

      // Coletar todos os order_ids conhecidos (de fulfillments e de transações de carteira)
      const orderIdsSet = new Set<string>();
      fulfillmentsData.forEach(f => {
        if (f.order_id) orderIdsSet.add(f.order_id);
      });
      ledgerEntries.forEach(tx => {
        if (tx.referencia_id && (tx.referencia_tipo === 'venda_pedido' || tx.referencia_tipo === 'pagamento_pedido')) {
          orderIdsSet.add(tx.referencia_id);
        }
      });

      // 6. Buscar order_items correspondentes (se disponíveis via RLS)
      let orderItemsData: any[] = [];
      const allOrderIds = Array.from(orderIdsSet);
      if (allOrderIds.length > 0) {
        const { data: oiData } = await supabase
          .from('order_items')
          .select('id, order_id, product_id, quantity, unit_price, total_price, product_snapshot, supplier_unit_cost, supplier_total_cost, supplier_net_amount, platform_fee_amount, reseller_margin_amount')
          .in('order_id', allOrderIds);
        if (oiData) orderItemsData = oiData;
      }

      // Também buscar order_items diretamente vinculados ao supplier_id / supplier_organization_id caso não tenham fulfillment
      if (orgId || userId) {
        let directOiQuery = supabase
          .from('order_items')
          .select('id, order_id, product_id, quantity, unit_price, total_price, product_snapshot, supplier_unit_cost, supplier_total_cost, supplier_net_amount, platform_fee_amount, reseller_margin_amount');

        if (orgId && userId) {
          directOiQuery = directOiQuery.or(`supplier_organization_id.eq.${orgId},supplier_id.eq.${userId}`);
        } else if (orgId) {
          directOiQuery = directOiQuery.eq('supplier_organization_id', orgId);
        } else if (userId) {
          directOiQuery = directOiQuery.eq('supplier_id', userId);
        }

        const { data: directOi } = await directOiQuery;
        if (directOi && directOi.length > 0) {
          const existingIds = new Set(orderItemsData.map(i => i.id));
          for (const item of directOi) {
            if (!existingIds.has(item.id)) {
              orderItemsData.push(item);
              if (item.order_id) orderIdsSet.add(item.order_id);
            }
          }
        }
      }

      const orderItemsById = new Map(orderItemsData.map(item => [item.id, item]));
      const orderItemsByOrderId = new Map<string, any[]>();
      orderItemsData.forEach(item => {
        if (!orderItemsByOrderId.has(item.order_id)) {
          orderItemsByOrderId.set(item.order_id, []);
        }
        orderItemsByOrderId.get(item.order_id)!.push(item);
      });

      // 7. Buscar pedidos faltantes na tabela orders
      const ordersMap = new Map<string, any>();
      fulfillmentsData.forEach(f => {
        if (f.orders && f.order_id) {
          ordersMap.set(f.order_id, f.orders);
        }
      });

      const missingOrderIds = Array.from(orderIdsSet).filter(id => !ordersMap.has(id));
      if (missingOrderIds.length > 0) {
        const { data: extraOrders } = await supabase
          .from('orders')
          .select('id, order_number, status, payment_status, total_amount, created_at, user_id')
          .in('id', missingOrderIds);
        if (extraOrders) {
          extraOrders.forEach(o => ordersMap.set(o.id, o));
        }
      }

      // Helper para calcular a decomposição financeira de um item
      const buildItemFinancials = (params: {
        id: string;
        productId: string | null;
        quantity: number;
        orderItem?: any;
        productObj?: any;
      }): SupplierTransactionItem => {
        const { id, productId, quantity, orderItem, productObj } = params;
        const snapshot = orderItem?.product_snapshot || {};
        const prod = productObj || (productId ? productsMap.get(productId) : null) || {};

        const productName = prod.name || snapshot.name || 'Produto';
        const sku = prod.sku || snapshot.sku || null;
        const imageUrl = prod.main_image_url || prod.image_url || snapshot.main_image_url || snapshot.image_url || null;

        // 1. Preço unitário e total pago pelo cliente (Valor Bruto)
        const unitGrossPrice = Number(orderItem?.unit_price) > 0
          ? Number(orderItem.unit_price)
          : Number(snapshot?.price) > 0
            ? Number(snapshot.price)
            : Number(prod?.price) || 0;

        const totalGrossPrice = Number(orderItem?.total_price) > 0
          ? Number(orderItem.total_price)
          : unitGrossPrice * quantity;

        // 2. Valor Líquido que o Fornecedor recebe (Repasse Líquido)
        let totalNetPrice = 0;
        if (Number(orderItem?.supplier_net_amount) > 0) {
          totalNetPrice = Number(orderItem.supplier_net_amount);
        } else if (Number(orderItem?.supplier_unit_cost) > 0) {
          totalNetPrice = Number(orderItem.supplier_unit_cost) * quantity;
        } else if (Number(snapshot?.cost_price) > 0) {
          totalNetPrice = Number(snapshot.cost_price) * quantity;
        } else if (Number(prod?.cost_price) > 0) {
          totalNetPrice = Number(prod.cost_price) * quantity;
        } else if (splitFornecedorPct > 0) {
          totalNetPrice = totalGrossPrice * (splitFornecedorPct / 100);
        } else {
          totalNetPrice = totalGrossPrice * 0.7;
        }

        const unitNetPrice = quantity > 0 ? totalNetPrice / quantity : totalNetPrice;

        // 3. Taxa da Transação / Gateway
        const rawFeeAmount = totalGrossPrice * (gatewayFeePct / 100);
        const availableMargin = Math.max(0, totalGrossPrice - totalNetPrice);
        const feeAmount = totalGrossPrice >= totalNetPrice
          ? Math.min(rawFeeAmount, availableMargin)
          : rawFeeAmount;

        // 4. Montante que ficou com a Plataforma
        const platformAmount = Math.max(0, totalGrossPrice - totalNetPrice - feeAmount);

        return {
          id,
          productId,
          productName,
          sku,
          imageUrl,
          quantity,
          unitGrossPrice,
          totalGrossPrice,
          unitNetPrice,
          totalNetPrice,
          feeAmount,
          platformAmount,
        };
      };

      // 8. Construir lista consolidada de transações de venda do fornecedor
      const salesTransactions: SupplierSaleTransaction[] = [];
      const processedOrderIds = new Set<string>();

      // A partir dos fulfillments da organização
      for (const f of fulfillmentsData) {
        const orderId = f.order_id;
        processedOrderIds.add(orderId);
        const orderObj = ordersMap.get(orderId) || f.orders;
        const fItems = f.supplier_fulfillment_items || [];

        const txItems: SupplierTransactionItem[] = fItems.map((fi: any) => {
          const oi = orderItemsById.get(fi.order_item_id);
          return buildItemFinancials({
            id: fi.id,
            productId: fi.product_id,
            quantity: Number(fi.quantity || 1),
            orderItem: oi,
            productObj: fi.products,
          });
        });

        // Caso o fulfillment não tenha itens detalhados mas o pedido tenha order_items do fornecedor
        if (txItems.length === 0 && orderItemsByOrderId.has(orderId)) {
          const ois = orderItemsByOrderId.get(orderId) || [];
          for (const oi of ois) {
            txItems.push(
              buildItemFinancials({
                id: oi.id,
                productId: oi.product_id,
                quantity: Number(oi.quantity || 1),
                orderItem: oi,
              })
            );
          }
        }

        const grossAmount = txItems.reduce((acc, i) => acc + i.totalGrossPrice, 0) || Number(orderObj?.total_amount || 0);
        const netAmount = splitsByOrderId.get(orderId) ?? txItems.reduce((acc, i) => acc + i.totalNetPrice, 0);
        const rawFee = grossAmount * (gatewayFeePct / 100);
        const feeAmount = grossAmount >= netAmount ? Math.min(rawFee, Math.max(0, grossAmount - netAmount)) : rawFee;
        const platformAmount = Math.max(0, grossAmount - netAmount - feeAmount);
        const totalQuantity = txItems.reduce((acc, i) => acc + i.quantity, 0) || 1;

        const isCredited = splitsByOrderId.has(orderId) || ledgerEntries.some(
          l => l.referencia_id === orderId && l.tipo === 'pagamento_pedido'
        );

        salesTransactions.push({
          id: f.id,
          orderId,
          orderNumber: orderObj?.order_number || orderId.slice(0, 8).toUpperCase(),
          createdAt: orderObj?.created_at || f.created_at,
          orderStatus: orderObj?.status || f.status || 'confirmed',
          paymentStatus: orderObj?.payment_status || 'paid',
          fulfillmentStatus: f.status,
          isCreditedToWallet: isCredited,
          items: txItems,
          totalQuantity,
          grossAmount,
          platformAmount,
          feeAmount,
          feePercentage: gatewayFeePct,
          netAmount,
        });
      }

      // B. Incluir pedidos que têm order_items do fornecedor mas ainda não tinham fulfillment
      for (const [orderId, ois] of orderItemsByOrderId.entries()) {
        if (processedOrderIds.has(orderId)) continue;
        const supplierOis = ois.filter(
          oi =>
            (orgId && oi.supplier_organization_id === orgId) ||
            (userId && oi.supplier_id === userId) ||
            (oi.product_id && productsMap.has(oi.product_id))
        );
        if (supplierOis.length === 0) continue;

        processedOrderIds.add(orderId);
        const orderObj = ordersMap.get(orderId);
        const txItems = supplierOis.map(oi =>
          buildItemFinancials({
            id: oi.id,
            productId: oi.product_id,
            quantity: Number(oi.quantity || 1),
            orderItem: oi,
          })
        );

        const grossAmount = txItems.reduce((acc, i) => acc + i.totalGrossPrice, 0) || Number(orderObj?.total_amount || 0);
        const netAmount = splitsByOrderId.get(orderId) ?? txItems.reduce((acc, i) => acc + i.totalNetPrice, 0);
        const rawFee = grossAmount * (gatewayFeePct / 100);
        const feeAmount = grossAmount >= netAmount ? Math.min(rawFee, Math.max(0, grossAmount - netAmount)) : rawFee;
        const platformAmount = Math.max(0, grossAmount - netAmount - feeAmount);
        const totalQuantity = txItems.reduce((acc, i) => acc + i.quantity, 0) || 1;

        const isCredited = splitsByOrderId.has(orderId) || ledgerEntries.some(
          l => l.referencia_id === orderId && l.tipo === 'pagamento_pedido'
        );

        salesTransactions.push({
          id: orderId,
          orderId,
          orderNumber: orderObj?.order_number || orderId.slice(0, 8).toUpperCase(),
          createdAt: orderObj?.created_at || new Date().toISOString(),
          orderStatus: orderObj?.status || 'confirmed',
          paymentStatus: orderObj?.payment_status || 'paid',
          fulfillmentStatus: null,
          isCreditedToWallet: isCredited,
          items: txItems,
          totalQuantity,
          grossAmount,
          platformAmount,
          feeAmount,
          feePercentage: gatewayFeePct,
          netAmount,
        });
      }

      // Ordenar por data decrescente
      salesTransactions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return {
        wallet: walletData,
        salesTransactions,
        ledgerEntries,
        gatewayFeePct,
      };
    },
  });

  const salesTransactions = data?.salesTransactions || [];
  const ledgerEntries = data?.ledgerEntries || [];
  const wallet = data?.wallet;

  // Filtragem de transações
  const filteredTransactions = useMemo(() => {
    return salesTransactions.filter(tx => {
      const searchLower = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !searchLower ||
        tx.orderNumber.toLowerCase().includes(searchLower) ||
        tx.items.some(
          i =>
            i.productName.toLowerCase().includes(searchLower) ||
            (i.sku && i.sku.toLowerCase().includes(searchLower))
        );

      let matchesStatus = true;
      if (statusFilter === 'credited') {
        matchesStatus = tx.isCreditedToWallet;
      } else if (statusFilter === 'pending_release') {
        matchesStatus = !tx.isCreditedToWallet && !['cancelado', 'cancelled', 'reembolsado'].includes(tx.orderStatus);
      } else if (statusFilter === 'cancelled') {
        matchesStatus = ['cancelado', 'cancelled', 'reembolsado', 'devolucao_aprovada'].includes(tx.orderStatus);
      }

      return matchesSearch && matchesStatus;
    });
  }, [salesTransactions, searchTerm, statusFilter]);

  // Cálculo dos KPIs gerais do fornecedor
  const metrics = useMemo(() => {
    const validSales = salesTransactions.filter(
      tx => !['cancelado', 'cancelled', 'reembolsado', 'devolucao_aprovada'].includes(tx.orderStatus)
    );

    const totalSalesCount = validSales.length;
    const totalUnitsSold = validSales.reduce((acc, tx) => acc + tx.totalQuantity, 0);
    const totalGrossAmount = validSales.reduce((acc, tx) => acc + tx.grossAmount, 0);
    const totalNetAmount = validSales.reduce((acc, tx) => acc + tx.netAmount, 0);
    const totalPlatformAmount = validSales.reduce((acc, tx) => acc + tx.platformAmount, 0);
    const totalFeeAmount = validSales.reduce((acc, tx) => acc + tx.feeAmount, 0);
    const pendingReleaseAmount = validSales
      .filter(tx => !tx.isCreditedToWallet)
      .reduce((acc, tx) => acc + tx.netAmount, 0);

    const walletBalance = wallet ? Number(wallet.saldo) : 0;
    const walletBlocked = wallet ? Number(wallet.saldo_bloqueado) : 0;

    return {
      totalSalesCount,
      totalUnitsSold,
      totalGrossAmount,
      totalNetAmount,
      totalPlatformAmount,
      totalFeeAmount,
      pendingReleaseAmount,
      walletBalance,
      walletBlocked,
    };
  }, [salesTransactions, wallet]);

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast({ variant: 'destructive', title: 'Sem transações para exportar' });
      return;
    }

    const headers = [
      'Pedido',
      'Data',
      'Produtos',
      'Qtd Itens',
      'Status',
      'Valor Pago Cliente (Bruto)',
      'Montante Plataforma',
      'Taxa Transacao',
      'Valor Liquido Fornecedor',
    ];

    const rows = filteredTransactions.map(tx => {
      const productNames = tx.items.map(i => `${i.quantity}x ${i.productName}`).join(' | ') || 'Pedido';
      const st = ORDER_STATUS_LABELS[tx.orderStatus]?.label || tx.orderStatus;
      return [
        `#${tx.orderNumber}`,
        format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm'),
        `"${productNames.replace(/"/g, '""')}"`,
        tx.totalQuantity,
        st,
        tx.grossAmount.toFixed(2),
        tx.platformAmount.toFixed(2),
        tx.feeAmount.toFixed(2),
        tx.netAmount.toFixed(2),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financeiro_fornecedor_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'Relatório exportado', description: 'O arquivo CSV foi baixado com sucesso.' });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe suas vendas realizadas, saldo na carteira da plataforma e o valor líquido de cada transação
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Indicadores (Saldo na Carteira + Vendas Realizadas + Total Líquido + Bruto) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo na Carteira da Plataforma */}
        <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Saldo na Carteira
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBRL(metrics.walletBalance)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {metrics.pendingReleaseAmount > 0
                    ? `+ ${formatBRL(metrics.pendingReleaseAmount)} em pedidos em andamento`
                    : 'Disponível na plataforma'}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Vendas Realizadas */}
        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Vendas Realizadas
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {metrics.totalSalesCount} {metrics.totalSalesCount === 1 ? 'venda' : 'vendas'}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {metrics.totalUnitsSold} {metrics.totalUnitsSold === 1 ? 'unidade vendida' : 'unidades vendidas'}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                <ShoppingBag className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Total Líquido do Fornecedor */}
        <Card className="border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Líquido (Seu Valor)
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
                    {formatBRL(metrics.totalNetAmount)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Valor líquido total das suas vendas
                </p>
              </div>
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Valor Bruto Pago pelos Clientes */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Pago pelos Clientes
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {formatBRL(metrics.totalGrossAmount)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Plataforma + taxas: {formatBRL(metrics.totalPlatformAmount + metrics.totalFeeAmount)}
                </p>
              </div>
              <div className="p-3 bg-muted text-muted-foreground rounded-xl">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas: Transações de Vendas e Extrato da Carteira */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">
            Transações Realizadas ({salesTransactions.length})
          </TabsTrigger>
          <TabsTrigger value="wallet_ledger">
            Extrato da Carteira ({ledgerEntries.length})
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: TRANSAÇÕES DE VENDAS COM VALOR LÍQUIDO E DETALHAMENTO */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nº do pedido, produto ou SKU..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as transações</SelectItem>
                <SelectItem value="credited">Liberadas na Carteira</SelectItem>
                <SelectItem value="pending_release">Em Processamento / Envio</SelectItem>
                <SelectItem value="cancelled">Canceladas / Estornadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="font-semibold text-foreground">Nenhuma transação encontrada</p>
                <p className="text-sm text-muted-foreground max-w-md mt-1">
                  Assim que seus produtos forem vendidos na plataforma, todas as transações e os respectivos valores líquidos aparecerão listados aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Produto(s)</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Produto Pago (Cliente)</TableHead>
                    <TableHead className="text-right">Valor Líquido (Você Recebe)</TableHead>
                    <TableHead className="text-right">Detalhamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map(tx => {
                    const firstItem = tx.items[0];
                    const moreCount = tx.items.length - 1;
                    const st = ORDER_STATUS_LABELS[tx.orderStatus] || {
                      label: tx.orderStatus,
                      variant: 'outline' as const,
                    };
                    const isCancelled = ['cancelado', 'cancelled', 'reembolsado', 'devolucao_aprovada'].includes(
                      tx.orderStatus
                    );

                    return (
                      <TableRow
                        key={tx.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedTransaction(tx)}
                      >
                        <TableCell className="font-mono font-semibold text-sm whitespace-nowrap">
                          #{tx.orderNumber}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-3 min-w-[200px]">
                            {firstItem?.imageUrl ? (
                              <img
                                src={firstItem.imageUrl}
                                alt={firstItem.productName}
                                className="h-10 w-10 rounded-md object-cover border shrink-0"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[240px]">
                                {firstItem?.productName || 'Produto do Pedido'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {firstItem?.sku && <span className="font-mono">SKU: {firstItem.sku}</span>}
                                {moreCount > 0 && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    +{moreCount} {moreCount === 1 ? 'item' : 'itens'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-center font-medium text-sm">
                          {tx.totalQuantity}
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(tx.createdAt), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <Badge variant={st.variant}>{st.label}</Badge>
                            {tx.isCreditedToWallet && !isCancelled && (
                              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Creditado na carteira
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right text-sm text-muted-foreground font-mono whitespace-nowrap">
                          {formatBRL(tx.grossAmount)}
                        </TableCell>

                        <TableCell className="text-right whitespace-nowrap">
                          <span
                            className={`font-mono font-bold text-base ${
                              isCancelled
                                ? 'line-through text-muted-foreground'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {formatBRL(tx.netAmount)}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedTransaction(tx);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1.5" />
                            Detalhar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ABA 2: EXTRATO DA CARTEIRA (WALLET TRANSACTIONS) */}
        <TabsContent value="wallet_ledger" className="space-y-4">
          {ledgerEntries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Wallet className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="font-semibold text-foreground">Nenhuma movimentação na carteira</p>
                <p className="text-sm text-muted-foreground max-w-md mt-1">
                  Os créditos de vendas enviadas e as baixas de repasses via PIX realizados pela plataforma aparecerão neste extrato.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Operação</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Saldo Anterior</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo Posterior</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.map(entry => {
                    const isCredit = Number(entry.saldo_posterior ?? 0) >= Number(entry.saldo_anterior ?? 0);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isCredit ? 'default' : 'secondary'} className="gap-1">
                            {isCredit ? (
                              <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 text-amber-400" />
                            )}
                            {LEDGER_TYPE_LABELS[entry.tipo] || entry.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {entry.descricao || 'Movimentação de carteira'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {formatBRL(Number(entry.saldo_anterior))}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-bold text-sm ${
                            isCredit ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatBRL(Math.abs(Number(entry.valor)))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {formatBRL(Number(entry.saldo_posterior))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL DE DETALHAMENTO DA TRANSAÇÃO */}
      <Dialog
        open={!!selectedTransaction}
        onOpenChange={open => {
          if (!open) setSelectedTransaction(null);
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-4">
              <span className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Detalhamento da Transação — Pedido #{selectedTransaction?.orderNumber}
              </span>
            </DialogTitle>
            <DialogDescription>
              Demonstrativo transparente dos valores pagos, taxas da operação e seu recebimento líquido.
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (() => {
            const tx = selectedTransaction;
            const st = ORDER_STATUS_LABELS[tx.orderStatus] || {
              label: tx.orderStatus,
              variant: 'outline' as const,
            };

            const netPct = tx.grossAmount > 0 ? Math.round((tx.netAmount / tx.grossAmount) * 100) : 0;
            const platformPct = tx.grossAmount > 0 ? Math.round((tx.platformAmount / tx.grossAmount) * 100) : 0;
            const feePct = tx.grossAmount > 0 ? Math.max(0, 100 - netPct - platformPct) : 0;

            return (
              <div className="space-y-5 py-2">
                {/* 1. Card de Destaque: Quanto você está recebendo líquido */}
                <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Valor Líquido (Quanto você recebe)
                    </span>
                    <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                      {formatBRL(tx.netAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                       Realizado em {format(new Date(tx.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    {tx.isCreditedToWallet ? (
                      <Badge variant="outline" className="bg-emerald-100/80 text-emerald-800 border-emerald-300 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Liberado na Carteira
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" /> Liberação após envio
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 2. Decomposição Passo a Passo da Transação */}
                <div className="rounded-xl border bg-card p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-primary" />
                      Resumo Financeiro da Transação
                    </h4>
                    <span className="text-xs text-muted-foreground">Decomposição do valor</span>
                  </div>

                  <Separator />

                  <div className="space-y-3 text-sm">
                    {/* Linha 1: Produto pago foi X */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-600">
                          <ShoppingBag className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Valor do Produto Pago</p>
                          <p className="text-xs text-muted-foreground">
                            Montante bruto pago pelo cliente no pedido
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-base text-foreground">
                        {formatBRL(tx.grossAmount)}
                      </span>
                    </div>

                    {/* Linha 2: Esse montante ficou com a plataforma */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-dashed">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">(-) Montante da Plataforma</p>
                          <p className="text-xs text-muted-foreground">
                            Margem operacional retida pela plataforma / revenda
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        - {formatBRL(tx.platformAmount)}
                      </span>
                    </div>

                    {/* Linha 3: Esse montante aqui é a taxa */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-dashed">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-600">
                          <Percent className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            (-) Taxa da Transação ({tx.feePercentage}%)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Taxa de processamento do pagamento e segurança
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                        - {formatBRL(tx.feeAmount)}
                      </span>
                    </div>

                    <Separator />

                    {/* Linha 4: Quanto você está recebendo líquido */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-emerald-500 text-white">
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-emerald-700 dark:text-emerald-400">
                            (=) Valor Líquido que Você Recebe
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Valor creditado para você por esta venda
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-extrabold text-lg text-emerald-600 dark:text-emerald-400">
                        {formatBRL(tx.netAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Barra visual de distribuição */}
                  {tx.grossAmount > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-muted">
                        <div
                          className="bg-emerald-500 h-full transition-all"
                          style={{ width: `${netPct}%` }}
                          title={`Você recebe: ${netPct}%`}
                        />
                        <div
                          className="bg-indigo-500 h-full transition-all"
                          style={{ width: `${platformPct}%` }}
                          title={`Plataforma: ${platformPct}%`}
                        />
                        <div
                          className="bg-amber-500 h-full transition-all"
                          style={{ width: `${feePct}%` }}
                          title={`Taxa: ${feePct}%`}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                          Seu Líquido ({netPct}%)
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-indigo-500 inline-block" />
                          Plataforma ({platformPct}%)
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                          Taxa ({feePct}%)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Itens do Pedido nesta Transação */}
                {tx.items.length > 0 && (
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-primary" />
                      Produto(s) Vendido(s) ({tx.totalQuantity} {tx.totalQuantity === 1 ? 'unidade' : 'unidades'})
                    </h4>
                    <div className="space-y-2.5">
                      {tx.items.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-muted/20"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="h-11 w-11 rounded-md object-cover border shrink-0"
                              />
                            ) : (
                              <div className="h-11 w-11 rounded-md bg-muted flex items-center justify-center shrink-0">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.quantity}x • Pago pelo cliente: {formatBRL(item.unitGrossPrice)}/un
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[11px] text-muted-foreground block">Seu líquido</span>
                            <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                              {formatBRL(item.totalNetPrice)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTransaction(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierFinanceiro;
