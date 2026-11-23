import { MapPin } from 'lucide-react';

const address = [
  ['Logradouro', 'Av. Joaquim Rolla'],
  ['Número', '02'],
  ['Bairro', 'Quitandinha'],
  ['Cidade', 'Petrópolis'],
  ['Estado', 'RJ'],
  ['CEP', '25651-072'],
  ['Complemento', 'Condomínio — Nº 151'],
] as const;

export function OnboardingStockAddress() {
  return <div className="rounded-lg border bg-muted/30 p-4">
    <h4 className="mb-3 flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4" />Endereço do estoque</h4>
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
      {address.map(([label, value]) => <div key={label} className="contents"><dt className="font-medium">{label}:</dt><dd>{value}</dd></div>)}
    </dl>
  </div>;
}
