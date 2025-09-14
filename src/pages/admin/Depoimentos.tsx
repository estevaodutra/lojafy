import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Star, ArrowUp, ArrowDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Testimonial {
  id: string;
  customer_name: string;
  customer_avatar_url: string | null;
  customer_initials: string | null;
  rating: number;
  comment: string;
  product_purchased: string | null;
  position: number;
  active: boolean;
}

const Depoimentos = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("position", { ascending: true });

      if (error) throw error;
      return data as Testimonial[];
    },
  });

  const updatePositionMutation = useMutation({
    mutationFn: async ({ id, newPosition }: { id: string; newPosition: number }) => {
      const { error } = await supabase
        .from("testimonials")
        .update({ position: newPosition })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast({ title: "Posição atualizada com sucesso!" });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar posição",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("testimonials")
        .update({ active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast({ title: "Status atualizado com sucesso!" });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar status",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("testimonials")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast({ title: "Depoimento removido!" });
    },
    onError: () => {
      toast({
        title: "Erro ao remover depoimento",
        variant: "destructive",
      });
    },
  });

  const movePosition = (id: string, direction: "up" | "down") => {
    if (!testimonials) return;

    const currentTestimonial = testimonials.find(t => t.id === id);
    if (!currentTestimonial) return;

    const newPosition = direction === "up" 
      ? Math.max(1, currentTestimonial.position - 1)
      : currentTestimonial.position + 1;

    updatePositionMutation.mutate({ id, newPosition });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gerenciar Depoimentos
          </h1>
          <p className="text-muted-foreground">
            Administrar comentários de clientes na homepage
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Depoimento
        </Button>
      </div>

      <div className="grid gap-4">
        {testimonials?.map((testimonial) => (
          <Card key={testimonial.id} className="border-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => movePosition(testimonial.id, "up")}
                      disabled={testimonial.position === 1}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => movePosition(testimonial.id, "down")}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      Posição {testimonial.position}
                    </Badge>
                    
                    <div className="flex gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 flex-1">
                    {testimonial.customer_avatar_url ? (
                      <img 
                        src={testimonial.customer_avatar_url} 
                        alt={testimonial.customer_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground font-semibold">
                          {testimonial.customer_initials}
                        </span>
                      </div>
                    )}

                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {testimonial.customer_name}
                      </h3>
                      {testimonial.product_purchased && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Produto: {testimonial.product_purchased}
                        </p>
                      )}
                      <p className="text-sm text-foreground italic">
                        "{testimonial.comment}"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${testimonial.id}`}>Ativo</Label>
                    <Switch
                      id={`active-${testimonial.id}`}
                      checked={testimonial.active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: testimonial.id, active: checked })
                      }
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTestimonial(testimonial);
                      setIsEditModalOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(testimonial.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!testimonials || testimonials.length === 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Nenhum depoimento encontrado</CardTitle>
              <CardDescription>
                Adicione depoimentos para exibir na homepage
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* Add Testimonial Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Depoimento</DialogTitle>
          </DialogHeader>
          <TestimonialForm 
            onClose={() => setIsAddModalOpen(false)}
            existingTestimonials={testimonials || []}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Testimonial Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Depoimento</DialogTitle>
          </DialogHeader>
          {editingTestimonial && (
            <TestimonialForm 
              testimonial={editingTestimonial}
              onClose={() => {
                setIsEditModalOpen(false);
                setEditingTestimonial(null);
              }}
              existingTestimonials={testimonials || []}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Testimonial Form Component
const TestimonialForm = ({ 
  testimonial, 
  onClose, 
  existingTestimonials 
}: { 
  testimonial?: Testimonial; 
  onClose: () => void;
  existingTestimonials: Testimonial[];
}) => {
  const [customerName, setCustomerName] = useState(testimonial?.customer_name || "");
  const [customerInitials, setCustomerInitials] = useState(testimonial?.customer_initials || "");
  const [customerAvatarUrl, setCustomerAvatarUrl] = useState(testimonial?.customer_avatar_url || "");
  const [rating, setRating] = useState(testimonial?.rating?.toString() || "5");
  const [comment, setComment] = useState(testimonial?.comment || "");
  const [productPurchased, setProductPurchased] = useState(testimonial?.product_purchased || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (testimonial) {
        // Update existing testimonial
        const { error } = await supabase
          .from("testimonials")
          .update({
            customer_name: data.customerName,
            customer_initials: data.customerInitials,
            customer_avatar_url: data.customerAvatarUrl || null,
            rating: data.rating,
            comment: data.comment,
            product_purchased: data.productPurchased || null
          })
          .eq("id", testimonial.id);

        if (error) throw error;
      } else {
        // Create new testimonial
        const maxPosition = Math.max(...existingTestimonials.map(t => t.position), 0) + 1;
        
        const { error } = await supabase
          .from("testimonials")
          .insert({
            customer_name: data.customerName,
            customer_initials: data.customerInitials,
            customer_avatar_url: data.customerAvatarUrl || null,
            rating: data.rating,
            comment: data.comment,
            product_purchased: data.productPurchased || null,
            position: maxPosition,
            active: true
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast({ 
        title: testimonial ? "Depoimento atualizado!" : "Depoimento criado!" 
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro ao salvar depoimento",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName.trim() || !comment.trim()) {
      toast({
        title: "Preencha os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({
      customerName,
      customerInitials: customerInitials || customerName.split(" ").map(n => n[0]).join("").toUpperCase(),
      customerAvatarUrl,
      rating: parseInt(rating),
      comment,
      productPurchased
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="customer-name">Nome do Cliente *</Label>
        <Input
          id="customer-name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Nome completo"
          required
        />
      </div>

      <div>
        <Label htmlFor="customer-initials">Iniciais</Label>
        <Input
          id="customer-initials"
          value={customerInitials}
          onChange={(e) => setCustomerInitials(e.target.value)}
          placeholder="Ex: JS (gerado automaticamente se vazio)"
          maxLength={3}
        />
      </div>

      <div>
        <Label htmlFor="customer-avatar">URL do Avatar</Label>
        <Input
          id="customer-avatar"
          value={customerAvatarUrl}
          onChange={(e) => setCustomerAvatarUrl(e.target.value)}
          placeholder="https://exemplo.com/avatar.jpg"
          type="url"
        />
      </div>

      <div>
        <Label htmlFor="rating">Avaliação *</Label>
        <Select value={rating} onValueChange={setRating}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((num) => (
              <SelectItem key={num} value={num.toString()}>
                {num} estrela{num > 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="comment">Comentário *</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Depoimento do cliente"
          required
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="product-purchased">Produto Comprado</Label>
        <Input
          id="product-purchased"
          value={productPurchased}
          onChange={(e) => setProductPurchased(e.target.value)}
          placeholder="Ex: iPhone 15 Pro"
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">
          {testimonial ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
};

export default Depoimentos;