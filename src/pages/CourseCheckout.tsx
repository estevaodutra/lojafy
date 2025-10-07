import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, ArrowLeft, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { createModernPixPayment } from '@/lib/mercadoPago';
import { ModernPixPayment } from '@/components/ModernPixPayment';

export default function CourseCheckout() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId!)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  // Verificar se já está matriculado
  const { data: enrollment } = useQuery({
    queryKey: ['enrollment-check', courseId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('course_id', courseId!)
        .eq('user_id', user!.id)
        .maybeSingle();

      return data;
    },
    enabled: !!courseId && !!user,
  });

  // Redirecionar se já estiver matriculado
  if (enrollment) {
    navigate(`/minha-conta/aulas/${courseId}`);
    return null;
  }

  const handlePixPayment = async () => {
    if (!user || !course) return;

    setLoading(true);
    try {
      const response = await createModernPixPayment({
        amount: course.price,
        description: `Curso: ${course.title}`,
        payer: {
          email: user.email || '',
          firstName: user.user_metadata?.first_name || 'Cliente',
          lastName: user.user_metadata?.last_name || '',
          cpf: user.user_metadata?.cpf || '00000000000',
        },
        orderItems: [
          {
            productId: course.id,
            productName: course.title,
            quantity: 1,
            unitPrice: course.price,
          }
        ]
      });

      setPixData(response);
      toast.success('QR Code PIX gerado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar PIX:', error);
      toast.error(error.message || 'Erro ao gerar pagamento PIX');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollAfterPayment = async () => {
    if (!user || !courseId) return;

    try {
      const { error } = await supabase
        .from('course_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
        });

      if (error) throw error;

      toast.success('Matrícula realizada com sucesso! 🎉');
      navigate(`/minha-conta/aulas/${courseId}`);
    } catch (error: any) {
      console.error('Erro ao matricular:', error);
      toast.error('Erro ao realizar matrícula');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <Skeleton className="h-64 w-full" />
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Curso não encontrado</h3>
            <Button asChild variant="outline" className="mt-4">
              <a href="/minha-conta/academy">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Academy
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pixData) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <ModernPixPayment
          qrCode={pixData.qr_code}
          qrCodeBase64={pixData.qr_code_base64}
          amount={course.price}
          paymentId={pixData.payment_id}
          onPaymentConfirmed={handleEnrollAfterPayment}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/minha-conta/academy')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Academy
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações do Curso */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Finalizar Compra</CardTitle>
              <CardDescription>
                Você está adquirindo acesso completo a este curso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.thumbnail_url && (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img 
                    src={course.thumbnail_url} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <h2 className="text-xl font-semibold mb-2">{course.title}</h2>
                <p className="text-muted-foreground">{course.description}</p>
              </div>

              {course.instructor_name && (
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="w-4 h-4" />
                  <span>Instrutor: {course.instructor_name}</span>
                </div>
              )}

              {course.duration_hours && (
                <p className="text-sm text-muted-foreground">
                  Duração: {course.duration_hours} horas
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumo do Pagamento */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Curso</span>
                  <span className="font-medium">{course.title}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    {course.price > 0 ? (
                      <>R$ {course.price.toFixed(2).replace('.', ',')}</>
                    ) : (
                      'Gratuito'
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Button 
                  className="w-full" 
                  onClick={handlePixPayment}
                  disabled={loading}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {loading ? 'Gerando PIX...' : 'Pagar com PIX'}
                </Button>

                {course.price === 0 && (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={handleEnrollAfterPayment}
                  >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Matricular-se Gratuitamente
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Ao finalizar a compra, você terá acesso imediato a todo o conteúdo do curso.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
