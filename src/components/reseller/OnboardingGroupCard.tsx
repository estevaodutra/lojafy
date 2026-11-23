import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  title: string | null;
  description?: string | null;
  photoUrl?: string | null;
  inviteUrl: string;
  created?: boolean;
};

export function OnboardingGroupCard({ title, description, photoUrl, inviteUrl, created = false }: Props) {
  return <div className="flex flex-col items-center rounded-lg border p-5 text-center">
    {created && <p className="mb-4 font-semibold text-green-700" role="status">Seu grupo foi criado</p>}
    {photoUrl && <img src={photoUrl} alt="Foto do grupo" className="mb-3 h-20 w-20 rounded-full object-cover" />}
    <h4 className="font-semibold">{title}</h4>
    {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    <Button variant="outline" className="mt-4" asChild>
      <a href={inviteUrl} target="_blank" rel="noopener noreferrer">Entrar no grupo<ExternalLink className="ml-2 h-4 w-4" /></a>
    </Button>
  </div>;
}
