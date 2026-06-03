import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Package, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORDER_STATUS_CONFIG, type OrderStatus } from "@/constants/orderStatus";

const PAGE_SIZE = 10;

interface UserOrdersTabProps {
  userId: string;
}

export const UserOrdersTab = ({ userId }: UserOrdersTabProps) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-orders", userId, statusFilter, search, limit],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("id, order_number, created_at, total_amount, status, order_items(id)", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (search.trim()) {
        query = query.ilike("order_number", `%${search.trim()}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { orders: data || [], total: count || 0 };
    },
  });

  const orders = data?.orders || [];
  const total = data?.total || 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Nenhum pedido encontrado
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const statusConfig = ORDER_STATUS_CONFIG[order.status as OrderStatus];
            const StatusIcon = statusConfig?.icon;

            return (
              <div key={order.id} className="p-3 border rounded-lg flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">#{order.order_number}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant={statusConfig?.variant || "outline"} className="text-xs">
                      {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                      {statusConfig?.label || order.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {(order as any).order_items?.length || 0} item(s) · {formatCurrency(Number(order.total_amount))}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => window.open(`/super-admin/pedidos?order=${order.id}`, "_blank")}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {orders.length < total && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            Carregar mais ({total - orders.length} restantes)
          </Button>
        </div>
      )}
    </div>
  );
};
