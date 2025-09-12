import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import BannerForm from './BannerForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image_url: string;
  button_text?: string;
  button_link?: string;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const BannerManagement = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as Banner[];
    }
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      toast({
        title: "Banner excluído",
        description: "O banner foi excluído com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir banner",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('banners')
        .update({ active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      toast({
        title: "Status atualizado",
        description: "O status do banner foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingBanner(null);
  };

  const activeBannersCount = banners.filter(banner => banner.active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Banners</h2>
          <p className="text-muted-foreground">
            Gerencie os banners da página inicial (máximo 5 ativos)
          </p>
        </div>
        <Button 
          onClick={() => setIsFormOpen(true)}
          disabled={activeBannersCount >= 5}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Banner
          {activeBannersCount >= 5 && " (Limite atingido)"}
        </Button>
      </div>

      {activeBannersCount >= 5 && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="pt-6">
            <p className="text-warning font-medium">
              Você atingiu o limite máximo de 5 banners ativos. 
              Desative um banner existente para adicionar um novo.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground mt-2">Carregando banners...</p>
          </div>
        ) : banners.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">Nenhum banner encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro banner para começar.
              </p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Banner
              </Button>
            </CardContent>
          </Card>
        ) : (
          banners.map((banner) => (
            <Card key={banner.id} className={`${!banner.active ? 'opacity-60' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-32 h-20 object-cover rounded-md flex-shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg truncate">{banner.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            Posição {banner.position}
                          </Badge>
                          <Badge variant={banner.active ? "default" : "secondary"}>
                            {banner.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        
                        {banner.subtitle && (
                          <p className="text-muted-foreground mb-1">{banner.subtitle}</p>
                        )}
                        
                        {banner.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {banner.description}
                          </p>
                        )}
                        
                        {banner.button_text && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Botão:</span>
                            <span className="font-medium">{banner.button_text}</span>
                            {banner.button_link && (
                              <span className="text-muted-foreground">→ {banner.button_link}</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActiveMutation.mutate({ 
                            id: banner.id, 
                            active: !banner.active 
                          })}
                          disabled={!banner.active && activeBannersCount >= 5}
                        >
                          {banner.active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(banner)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o banner "{banner.title}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteBannerMutation.mutate(banner.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <BannerForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        banner={editingBanner}
        existingBanners={banners}
      />
    </div>
  );
};

export default BannerManagement;