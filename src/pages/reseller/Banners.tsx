import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useResellerBanners, ResellerBanner } from '@/hooks/useResellerBanners';
import { useAuth } from '@/contexts/AuthContext';
import ResellerBannerForm from '@/components/reseller/ResellerBannerForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const ResellerBanners = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'carousel' | 'featured'>('carousel');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<ResellerBanner | null>(null);

  const { banners, isLoading, deleteBanner, toggleActive } = useResellerBanners(user?.id, activeTab);

  const handleEdit = (banner: ResellerBanner) => {
    setEditingBanner(banner);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingBanner(null);
  };

  const activeBannersCount = banners.filter(b => b.active).length;
  const maxBanners = activeTab === 'carousel' ? 5 : 6;

  const BannerList = () => {
    if (isLoading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground mt-2">Carregando banners...</p>
        </div>
      );
    }

    if (banners.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Nenhum banner encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro banner {activeTab === 'carousel' ? 'rotativo' : 'de destaque'}.
            </p>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Banner
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4">
        {banners.map((banner) => (
          <Card key={banner.id} className={`${!banner.active ? 'opacity-60' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <img
                  src={banner.desktop_image_url}
                  alt="Banner"
                  className="w-32 h-20 object-cover rounded-md flex-shrink-0"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          Posição {banner.position}
                        </Badge>
                        <Badge variant={banner.active ? "default" : "secondary"}>
                          {banner.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      
                      {banner.link_url && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Link:</span>
                          <span className="font-medium truncate">{banner.link_url}</span>
                          {banner.open_new_tab && (
                            <Badge variant="outline" className="text-xs">Nova aba</Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive.mutate({ 
                          id: banner.id, 
                          active: !banner.active 
                        })}
                        disabled={!banner.active && activeBannersCount >= maxBanners}
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
                              Tem certeza que deseja excluir este banner? 
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteBanner.mutate(banner.id)}
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
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gerenciar Banners</h1>
        <p className="text-muted-foreground">
          Gerencie os banners da sua loja
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'carousel' | 'featured')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="carousel">Banners Rotativos</TabsTrigger>
          <TabsTrigger value="featured">Banners de Destaque</TabsTrigger>
        </TabsList>

        <TabsContent value="carousel" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Máximo de 5 banners rotativos ativos ({activeBannersCount}/5)
              </p>
            </div>
            <Button 
              onClick={() => setIsFormOpen(true)}
              disabled={activeBannersCount >= 5}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Banner
              {activeBannersCount >= 5 && " (Limite atingido)"}
            </Button>
          </div>

          {activeBannersCount >= 5 && (
            <Card className="border-warning bg-warning/5">
              <CardContent className="pt-6">
                <p className="text-warning font-medium">
                  Você atingiu o limite máximo de 5 banners rotativos ativos. 
                  Desative um banner existente para adicionar um novo.
                </p>
              </CardContent>
            </Card>
          )}

          <BannerList />
        </TabsContent>

        <TabsContent value="featured" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Máximo de 6 banners de destaque ativos ({activeBannersCount}/6)
              </p>
            </div>
            <Button 
              onClick={() => setIsFormOpen(true)}
              disabled={activeBannersCount >= 6}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Banner
              {activeBannersCount >= 6 && " (Limite atingido)"}
            </Button>
          </div>

          {activeBannersCount >= 6 && (
            <Card className="border-warning bg-warning/5">
              <CardContent className="pt-6">
                <p className="text-warning font-medium">
                  Você atingiu o limite máximo de 6 banners de destaque ativos. 
                  Desative um banner existente para adicionar um novo.
                </p>
              </CardContent>
            </Card>
          )}

          <BannerList />
        </TabsContent>
      </Tabs>

      {user && (
        <ResellerBannerForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          banner={editingBanner}
          resellerId={user.id}
          bannerType={activeTab}
          existingBanners={banners}
        />
      )}
    </div>
  );
};

export default ResellerBanners;