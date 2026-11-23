import { CheckCircle2, Link2, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function MercadoLivreConnectionCard({ accountId, onConnect, onRefresh, loading = false }: {
  accountId?: string | number | null;
  onConnect: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}) {
  const connected = accountId != null;
  return <Card className="max-w-sm border-green-500/50">
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-yellow-100 p-3"><Store className="h-8 w-8 text-yellow-600" /></div>
        <Badge className="bg-green-500 hover:bg-green-600">{connected && <CheckCircle2 className="mr-1 h-3 w-3" />}{connected ? 'Conectado' : 'Disponível'}</Badge>
      </div>
      <CardTitle className="mt-4">Mercado Livre</CardTitle>
      <CardDescription>{connected ? `Conta #${accountId} conectada` : 'Integre com o maior marketplace da América Latina'}</CardDescription>
    </CardHeader>
    <CardFooter className="flex flex-col gap-2">
      <Button className="w-full" variant={connected ? 'outline' : 'default'} onClick={onConnect} disabled={loading}><Link2 className="mr-2 h-4 w-4" />{connected ? 'Reconectar' : 'Integrar'}</Button>
      {onRefresh && <Button className="w-full" variant="ghost" onClick={onRefresh} disabled={loading}>Atualizar conexão</Button>}
    </CardFooter>
  </Card>;
}
