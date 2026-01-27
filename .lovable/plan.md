

# Implementar Campo de Anexos e Regra de 7 Dias para Troca

## Resumo das Alterações

Adicionar funcionalidade de upload de arquivos (fotos e PDFs) ao modal de abertura de tickets e implementar a regra de negócio que limita a opção "Troca" a apenas 7 dias após a entrega do pedido.

---

## Alterações Necessárias

### 1. Atualizar Regra de Troca (7 dias após entrega)

**Arquivo**: `src/types/orderTickets.ts`

Alterar a função `getAvailableTicketTypes` para receber uma nova propriedade opcional `deliveredAt` e verificar se a troca está dentro do prazo:

```typescript
export const getAvailableTicketTypes = (
  orderStatus: string, 
  paymentStatus: string,
  deliveredAt?: string | null  // Nova propriedade
): OrderTicketType[] => {
  const types: OrderTicketType[] = [];
  
  // Reembolso: available after payment confirmed
  if (['confirmed', 'processing', 'shipped', 'delivered'].includes(orderStatus) && paymentStatus === 'paid') {
    types.push('reembolso');
  }
  
  // Troca: apenas para pedidos entregues, DENTRO de 7 dias após a entrega
  if (orderStatus === 'delivered' && deliveredAt) {
    const deliveryDate = new Date(deliveredAt);
    const now = new Date();
    const daysSinceDelivery = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceDelivery <= 7) {
      types.push('troca');
    }
  }
  
  // Cancelamento: before shipping
  if (['confirmed', 'processing'].includes(orderStatus) && paymentStatus === 'paid') {
    types.push('cancelamento');
  }
  
  return types;
};
```

### 2. Atualizar Props do Modal

**Arquivo**: `src/components/order-tickets/OpenTicketModal.tsx`

Adicionar propriedade `deliveredAt` às props:

```typescript
interface OpenTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  deliveredAt?: string | null;  // Nova prop
}
```

### 3. Criar Componente de Upload de Arquivos

**Novo Arquivo**: `src/components/order-tickets/TicketAttachmentUpload.tsx`

Criar componente baseado no padrão existente em `AnswerImageUpload.tsx`:

| Propriedade | Valor |
|-------------|-------|
| Formatos aceitos | `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf` |
| Tamanho máximo | 5MB por arquivo |
| Quantidade máxima | 5 arquivos |
| Bucket | `order-ticket-attachments` |

O componente terá:
- Área de drag-and-drop usando `react-dropzone`
- Preview de imagens e ícone de PDF para documentos
- Botão para remover arquivos
- Indicador de progresso de upload

### 4. Integrar Upload no Modal

**Arquivo**: `src/components/order-tickets/OpenTicketModal.tsx`

Adicionar:
- Estado para gerenciar arquivos: `const [attachments, setAttachments] = useState<Attachment[]>([])`
- Componente `TicketAttachmentUpload` abaixo do campo de motivo
- Validação: pelo menos 1 anexo obrigatório para tipo "troca"

### 5. Atualizar Hook de Criação de Tickets

**Arquivo**: `src/hooks/useOrderTickets.ts`

Após criar o ticket, salvar os arquivos na tabela `order_ticket_attachments`:

```typescript
// Após criar o ticket e a mensagem inicial
if (data.attachments && data.attachments.length > 0) {
  const attachmentRecords = data.attachments.map(att => ({
    ticket_id: ticket.id,
    message_id: null, // Anexos iniciais sem mensagem associada
    file_url: att.url,
    file_name: att.name,
    file_type: att.type,
    file_size: att.size,
  }));
  
  await supabase.from('order_ticket_attachments').insert(attachmentRecords);
}
```

### 6. Atualizar Componentes que Usam o Modal

**Arquivos a atualizar**:
- `src/components/order-tickets/OpenTicketButton.tsx` - passar `deliveredAt`
- `src/components/OrderDetailsModal.tsx` - passar `deliveredAt` para o botão

Será necessário obter a data de entrega do pedido. Isso pode ser feito:
- Via consulta à tabela `order_status_history` onde `status = 'delivered'`
- Ou passando diretamente se já disponível no componente pai

### 7. Criar Políticas RLS para o Bucket

**Migration SQL**:

```sql
-- Permitir upload para usuários autenticados
CREATE POLICY "Users can upload ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-ticket-attachments');

-- Permitir leitura para participantes do ticket
CREATE POLICY "Ticket participants can view attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'order-ticket-attachments');

-- Permitir deleção para o próprio autor
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'order-ticket-attachments');
```

---

## Fluxo de Usuário

```text
┌─────────────────────────────────────────────────────────────┐
│                    Abrir Ticket de Suporte                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tipo de Solicitação *                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Troca                                            ▼  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ⓘ Solicite a substituição de um produto por outro.       │
│    Disponível até 7 dias após a entrega.                   │
│                                                             │
│  Motivo da Solicitação *                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Explique detalhadamente...                          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  20/20 caracteres mínimos                                  │
│                                                             │
│  Anexos (Fotos ou PDF) *                                    │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│  │  📁 Arraste arquivos ou clique para selecionar      │ │
│  │     JPG, PNG, WEBP ou PDF (máx. 5MB cada)           │ │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│                                                             │
│  ┌───────────┐  ┌─────────────┐                            │
│  │ 🖼️ foto1  │  │ 📄 doc.pdf  │                            │
│  │     ✕     │  │      ✕      │                            │
│  └───────────┘  └─────────────┘                            │
│                                                             │
│  ⚠️ Para solicitações de troca, é obrigatório anexar       │
│     foto(s) do produto.                                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    [Cancelar]  [Abrir Ticket]              │
└─────────────────────────────────────────────────────────────┘
```

---

## Regras de Negócio

| Tipo | Anexo Obrigatório | Prazo |
|------|-------------------|-------|
| Reembolso | Não | - |
| Troca | Sim (mín. 1 foto) | 7 dias após entrega |
| Cancelamento | Não | Antes do envio |

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/order-tickets/TicketAttachmentUpload.tsx` | Criar | Componente de upload de anexos |
| `src/types/orderTickets.ts` | Modificar | Adicionar validação de 7 dias na função `getAvailableTicketTypes` |
| `src/components/order-tickets/OpenTicketModal.tsx` | Modificar | Integrar upload e nova prop `deliveredAt` |
| `src/components/order-tickets/OpenTicketButton.tsx` | Modificar | Passar `deliveredAt` para o modal |
| `src/hooks/useOrderTickets.ts` | Modificar | Salvar anexos no banco |
| `src/components/OrderDetailsModal.tsx` | Modificar | Obter data de entrega e passar para o botão |
| Migration SQL | Criar | Políticas RLS para o bucket |

---

## Seção Técnica

### Obtenção da Data de Entrega

A data de entrega será obtida da tabela `order_status_history`:

```typescript
const { data: statusHistory } = await supabase
  .from('order_status_history')
  .select('created_at')
  .eq('order_id', orderId)
  .eq('status', 'delivered')
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

const deliveredAt = statusHistory?.created_at;
```

### Interface de Anexo

```typescript
interface TicketAttachment {
  name: string;
  size: number;
  url: string;
  type: string;
}
```

### Validação de Submissão

```typescript
const requiresAttachment = tipo === 'troca';
const hasAttachments = attachments.length > 0;
const canSubmit = tipo && isValidReason && !isCreating && (!requiresAttachment || hasAttachments);
```

