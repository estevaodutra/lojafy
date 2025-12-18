import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Eye, Search, Mail, Phone, MapPin, Calendar, ShoppingBag, Copy, IdCard, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Customer {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  created_at: string;
  auth_users?: {
    email: string;
  };
  order_count?: number;
  total_spent?: number;
  last_order?: string;
}

interface CustomerDetails extends Customer {
  addresses: any[];
  orders: any[];
}

const AdminCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      // Get profiles with user email and order statistics
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get order statistics for each customer
      const customersWithStats = await Promise.all(
        profiles.map(async (profile) => {
          const { data: orderStats } = await supabase
            .from('orders')
            .select('total_amount, created_at')
            .eq('user_id', profile.user_id);

          const orderCount = orderStats?.length || 0;
          const totalSpent = orderStats?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
          const lastOrder = orderStats?.length > 0 
            ? orderStats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
            : null;

          return {
            ...profile,
            order_count: orderCount,
            total_spent: totalSpent,
            last_order: lastOrder,
          };
        })
      );

      setCustomers(customersWithStats);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetails = async (customer: Customer) => {
    try {
      setDetailsLoading(true);

      // Fetch addresses
      const { data: addresses, error: addressError } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', customer.user_id);

      if (addressError) throw addressError;

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            products(name, image_url)
          )
        `)
        .eq('user_id', customer.user_id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      setSelectedCustomer({
        ...customer,
        addresses: addresses || [],
        orders: orders || [],
      });
    } catch (error) {
      console.error('Error fetching customer details:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do cliente",
        variant: "destructive",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const getCustomerStatus = (customer: Customer) => {
    if (!customer.last_order) return { label: "Novo", variant: "secondary" as const };
    
    const lastOrderDate = new Date(customer.last_order);
    const daysSinceLastOrder = Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastOrder <= 30) return { label: "Ativo", variant: "default" as const };
    if (daysSinceLastOrder <= 90) return { label: "Regular", variant: "secondary" as const };
    return { label: "Inativo", variant: "outline" as const };
  };

  const filteredCustomers = customers.filter(customer => {
    const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Clientes</h1>
        <Badge variant="outline" className="text-sm">
          <Users className="w-4 h-4 mr-1" />
          {customers.length} clientes
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Total Gasto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando clientes...
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => {
                  const status = getCustomerStatus(customer);
                  return (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.first_name} {customer.last_name}
                      </TableCell>
                      <TableCell>{customer.phone || "Não informado"}</TableCell>
                      <TableCell>
                        {format(new Date(customer.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{customer.order_count || 0}</Badge>
                      </TableCell>
                      <TableCell>R$ {(customer.total_spent || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchCustomerDetails(customer)}
                          disabled={detailsLoading}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Exibindo {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredCustomers.length)} de {filteredCustomers.length} clientes
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm font-medium px-2">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Próxima
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Customer Details Modal */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Detalhes do Cliente
            </DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedCustomer.first_name} {selectedCustomer.last_name}</span>
                  </div>
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Cliente desde {format(new Date(selectedCustomer.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-mono">{selectedCustomer.user_id}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedCustomer.user_id);
                        toast({
                          title: "ID copiado!",
                          description: "ID do cliente copiado para área de transferência",
                        });
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Addresses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Endereços ({selectedCustomer.addresses.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedCustomer.addresses.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum endereço cadastrado</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedCustomer.addresses.map((address) => (
                        <div key={address.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{address.type}</p>
                              <p className="text-sm text-muted-foreground">
                                {address.street}, {address.number}
                                {address.complement && `, ${address.complement}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {address.neighborhood} - {address.city}/{address.state}
                              </p>
                              <p className="text-sm text-muted-foreground">CEP: {address.zip_code}</p>
                            </div>
                            {address.is_default && (
                              <Badge variant="default" className="text-xs">Padrão</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    Histórico de Pedidos ({selectedCustomer.orders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedCustomer.orders.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum pedido realizado</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedCustomer.orders.slice(0, 5).map((order) => (
                        <div key={order.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{order.order_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {order.order_items?.length || 0} item(s)
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">R$ {Number(order.total_amount).toFixed(2)}</p>
                              <Badge variant="outline" className="text-xs">
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                      {selectedCustomer.orders.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center">
                          e mais {selectedCustomer.orders.length - 5} pedido(s)...
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCustomers;