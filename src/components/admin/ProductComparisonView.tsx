import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProductComparisonViewProps {
  product: {
    name: string;
    description: string | null;
    images: string[];
    original_name: string | null;
    original_description: string | null;
    original_images: string[] | null;
    original_saved_at: string | null;
  };
}

export function ProductComparisonView({ product }: ProductComparisonViewProps) {
  const hasOriginal = product.original_name !== null;

  if (!hasOriginal) return null;

  const isNameChanged = product.name !== product.original_name;
  const isDescriptionChanged = product.description !== product.original_description;
  const isImagesChanged = JSON.stringify(product.images) !== JSON.stringify(product.original_images);
  const hasAnyChange = isNameChanged || isDescriptionChanged || isImagesChanged;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Comparação: Original vs Otimizado</CardTitle>
          {hasAnyChange && <Badge variant="destructive">Modificado</Badge>}
        </div>
        {product.original_saved_at && (
          <p className="text-xs text-muted-foreground">
            Original salvo em: {new Date(product.original_saved_at).toLocaleDateString('pt-BR')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="nome">
          <TabsList className="w-full">
            <TabsTrigger value="nome" className="flex-1">
              Nome {isNameChanged && <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">!</Badge>}
            </TabsTrigger>
            <TabsTrigger value="descricao" className="flex-1">
              Descrição {isDescriptionChanged && <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">!</Badge>}
            </TabsTrigger>
            <TabsTrigger value="fotos" className="flex-1">
              Fotos {isImagesChanged && <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">!</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nome">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Original</p>
                <p className="text-sm border rounded-md p-3 bg-muted/30 min-h-[40px]">{product.original_name}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Atual (Otimizado)</p>
                  {isNameChanged && <Badge variant="secondary" className="text-[10px] px-1 py-0">Alterado</Badge>}
                </div>
                <p className="text-sm border rounded-md p-3 min-h-[40px]">{product.name}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="descricao">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Original</p>
                <p className="text-sm border rounded-md p-3 bg-muted/30 min-h-[80px] whitespace-pre-wrap">
                  {product.original_description || '(sem descrição)'}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Atual (Otimizado)</p>
                  {isDescriptionChanged && <Badge variant="secondary" className="text-[10px] px-1 py-0">Alterado</Badge>}
                </div>
                <p className="text-sm border rounded-md p-3 min-h-[80px] whitespace-pre-wrap">
                  {product.description || '(sem descrição)'}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fotos">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Original ({(product.original_images as string[])?.length || 0} fotos)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(product.original_images as string[])?.map((img, i) => (
                    <img key={i} src={img} alt={`Original ${i + 1}`} className="w-full h-20 object-cover rounded border" />
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Atual ({product.images?.length || 0} fotos)
                  </p>
                  {isImagesChanged && <Badge variant="secondary" className="text-[10px] px-1 py-0">Alterado</Badge>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {product.images?.map((img, i) => (
                    <img key={i} src={img} alt={`Atual ${i + 1}`} className="w-full h-20 object-cover rounded border" />
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
