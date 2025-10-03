import { usePublicStoreContext } from '@/hooks/usePublicStoreContext';
import { usePublicStoreDocumentTitle } from '@/hooks/usePublicStoreDocumentTitle';
import PublicStoreHeader from '@/components/public-store/PublicStoreHeader';
import PublicStoreFooter from '@/components/public-store/PublicStoreFooter';
import { useResellerPages } from '@/hooks/useResellerPages';
import { replacePlaceholders } from '@/lib/placeholders';
import { Card } from '@/components/ui/card';
import { Building2, Target, Eye, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const PublicStoreAbout = () => {
  const { store } = usePublicStoreContext();
  usePublicStoreDocumentTitle(store, 'Quem Somos');

  const { aboutContent, isLoading } = useResellerPages(store.reseller_id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicStoreHeader store={store} />
        <main className="container mx-auto px-4 py-12">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
        <PublicStoreFooter store={store} />
      </div>
    );
  }

  const content = aboutContent || {
    story: '',
    mission: '',
    vision: '',
    values: [],
    team: []
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicStoreHeader store={store} />
      
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Sobre {store.store_name}
        </h1>

        {/* História */}
        {content.story && (
          <Card className="p-8 mb-8">
            <div className="flex items-start gap-4 mb-4">
              <Building2 className="h-8 w-8 text-primary flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-semibold mb-4">Nossa História</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {replacePlaceholders(content.story, store)}
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Missão */}
          {content.mission && (
            <Card className="p-6">
              <div className="flex items-start gap-3 mb-3">
                <Target className="h-6 w-6 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">Nossa Missão</h3>
              </div>
              <p className="text-muted-foreground">
                {replacePlaceholders(content.mission, store)}
              </p>
            </Card>
          )}

          {/* Visão */}
          {content.vision && (
            <Card className="p-6">
              <div className="flex items-start gap-3 mb-3">
                <Eye className="h-6 w-6 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">Nossa Visão</h3>
              </div>
              <p className="text-muted-foreground">
                {replacePlaceholders(content.vision, store)}
              </p>
            </Card>
          )}
        </div>

        {/* Valores */}
        {content.values && content.values.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Award className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-semibold">Nossos Valores</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {content.values.map((value, index) => (
                <Card key={index} className="p-6 text-center">
                  <h4 className="font-semibold text-lg mb-2">{value.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {replacePlaceholders(value.description, store)}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Equipe */}
        {content.team && content.team.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Nossa Equipe</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {content.team.map((member, index) => (
                <Card key={index} className="p-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <h4 className="font-semibold text-lg mb-1">{member.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{member.role}</p>
                  {member.description && (
                    <p className="text-sm text-muted-foreground">
                      {replacePlaceholders(member.description, store)}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Contato */}
        <Card className="p-8 mt-8 text-center bg-primary/5">
          <h3 className="text-xl font-semibold mb-4">Entre em Contato</h3>
          <p className="text-muted-foreground mb-4">
            Ficou com alguma dúvida? Estamos aqui para ajudar!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {store.contact_phone && (
              <a href={`tel:${store.contact_phone}`} className="text-primary hover:underline">
                {store.contact_phone}
              </a>
            )}
            {store.contact_email && (
              <a href={`mailto:${store.contact_email}`} className="text-primary hover:underline">
                {store.contact_email}
              </a>
            )}
          </div>
        </Card>
      </main>
      
      <PublicStoreFooter store={store} />
    </div>
  );
};

export default PublicStoreAbout;
