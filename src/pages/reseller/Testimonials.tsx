import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useResellerTestimonials } from "@/hooks/useResellerTestimonials";
import { useResellerStore } from "@/hooks/useResellerStore";
import { Plus, Star, Edit, Trash2, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ResellerTestimonials() {
  const { testimonials, isLoading, createTestimonial, updateTestimonial, deleteTestimonial } = useResellerTestimonials();
  const { products: resellerProducts, isLoading: isLoadingProducts } = useResellerStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);

  const [formData, setFormData] = useState({
    customer_name: "",
    customer_avatar_url: "",
    rating: 5,
    comment: "",
    product_purchased: "",
    position: 0,
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Gerar iniciais do nome
    const initials = formData.customer_name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const testimonialData = {
      ...formData,
      customer_initials: initials,
    };

    if (editingTestimonial) {
      await updateTestimonial.mutateAsync({ id: editingTestimonial.id, ...testimonialData });
    } else {
      await createTestimonial.mutateAsync(testimonialData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_avatar_url: "",
      rating: 5,
      comment: "",
      product_purchased: "",
      position: 0,
      active: true,
    });
    setEditingTestimonial(null);
  };

  const handleEdit = (testimonial: any) => {
    setEditingTestimonial(testimonial);
    setFormData({
      customer_name: testimonial.customer_name,
      customer_avatar_url: testimonial.customer_avatar_url || "",
      rating: testimonial.rating,
      comment: testimonial.comment,
      product_purchased: testimonial.product_purchased || "",
      position: testimonial.position,
      active: testimonial.active,
    });
    setIsDialogOpen(true);
  };

  const activeTestimonials = testimonials.filter(t => t.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Depoimentos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os depoimentos exibidos na sua loja
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Depoimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTestimonial ? "Editar Depoimento" : "Adicionar Novo Depoimento"}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do depoimento do cliente
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Nome do Cliente *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="João Silva"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating">Avaliação *</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="1"
                    max="5"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) || 5 })}
                    required
                  />
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= formData.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comentário *</Label>
                <Textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Excelente produto, super recomendo!"
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_purchased">Produto Comprado (opcional)</Label>
                <Select
                  value={formData.product_purchased}
                  onValueChange={(value) => setFormData({ ...formData, product_purchased: value === "none" ? "" : value })}
                  disabled={isLoadingProducts}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum produto</SelectItem>
                    {resellerProducts.map((rp) => (
                      <SelectItem key={rp.id} value={rp.product?.name || rp.product_name_snapshot || ""}>
                        {rp.product?.name || rp.product_name_snapshot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {isLoadingProducts ? "Carregando produtos..." : `${resellerProducts.length} produtos disponíveis`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_avatar_url">URL do Avatar (opcional)</Label>
                <Input
                  id="customer_avatar_url"
                  type="url"
                  value={formData.customer_avatar_url}
                  onChange={(e) => setFormData({ ...formData, customer_avatar_url: e.target.value })}
                  placeholder="https://exemplo.com/avatar.jpg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position">Posição</Label>
                  <Input
                    id="position"
                    type="number"
                    min="0"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ordem de exibição (menor número aparece primeiro)
                  </p>
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label htmlFor="active">Depoimento ativo</Label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createTestimonial.isPending || updateTestimonial.isPending}
                >
                  {editingTestimonial ? "Atualizar" : "Adicionar"} Depoimento
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Depoimentos</CardDescription>
            <CardTitle className="text-3xl">{testimonials.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Depoimentos Ativos</CardDescription>
            <CardTitle className="text-3xl text-green-600">{activeTestimonials.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avaliação Média</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">
              {testimonials.length > 0
                ? (testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length).toFixed(1)
                : "0.0"}
              <Star className="inline h-6 w-6 ml-1 fill-yellow-400 text-yellow-400" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lista de Depoimentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Carregando depoimentos...</p>
            </CardContent>
          </Card>
        ) : testimonials.length > 0 ? (
          testimonials.map((testimonial) => (
            <Card key={testimonial.id} className={!testimonial.active ? "opacity-60" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    {testimonial.customer_avatar_url ? (
                      <AvatarImage src={testimonial.customer_avatar_url} alt={testimonial.customer_name} />
                    ) : null}
                    <AvatarFallback>
                      {testimonial.customer_initials || <User className="h-6 w-6" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{testimonial.customer_name}</h3>
                        <div className="flex gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= testimonial.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(testimonial)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir este depoimento?")) {
                              deleteTestimonial.mutate(testimonial.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{testimonial.comment}</p>
                    {testimonial.product_purchased && (
                      <p className="text-xs text-muted-foreground">
                        <strong>Produto:</strong> {testimonial.product_purchased}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="md:col-span-2">
            <CardContent className="p-12 text-center">
              <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum depoimento adicionado</h3>
              <p className="text-muted-foreground mb-4">
                Adicione depoimentos de clientes para aumentar a credibilidade da sua loja
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Depoimento
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}