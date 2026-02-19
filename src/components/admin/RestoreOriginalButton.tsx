import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RestoreOriginalButtonProps {
  productId: string;
  originalName: string | null;
  originalDescription: string | null;
  originalImages: string[] | null;
  onRestore: () => void;
}

export function RestoreOriginalButton({
  productId,
  originalName,
  originalDescription,
  originalImages,
  onRestore,
}: RestoreOriginalButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!originalName) return null;

  const handleRestore = async () => {
    setLoading(true);
    try {
      const mainImage = originalImages && originalImages.length > 0 ? originalImages[0] : null;
      
      const { error } = await supabase
        .from('products')
        .update({
          name: originalName,
          description: originalDescription,
          images: originalImages || [],
          main_image_url: mainImage,
          image_url: mainImage,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: 'Dados originais restaurados',
        description: 'O nome, descrição e fotos foram restaurados para a versão original.',
      });
      onRestore();
    } catch (err) {
      console.error('Error restoring original:', err);
      toast({
        title: 'Erro ao restaurar',
        description: 'Não foi possível restaurar os dados originais.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Restaurar Original
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restaurar dados originais?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso irá substituir o nome, descrição e fotos atuais pelos dados originais do produto.
            Esta ação pode ser desfeita editando o produto novamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleRestore}>Restaurar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
