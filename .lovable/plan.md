

# Plano: Botão de voltar ao menu e atalho "Como Processar Pedido"

## Alterações

### 1. Botão "Voltar ao Menu" na tela de conversa

Quando o usuário está dentro de uma conversa (tela com mensagens), adicionar um botão no header ou na barra de status para voltar ao seletor de categorias e iniciar um novo assunto.

**Lógica:**
- Ao clicar, limpar o `currentTicketId` e ativar `showCategorySelector`
- Isso permite ao usuário voltar ao menu de assuntos sem fechar o chat

### 2. Botão "Como Processar Pedido" nas Ações Rápidas

Adicionar um novo botão na seção "Ações Rápidas" do seletor de categorias que redireciona diretamente para a aula "Como Processar Pedidos".

**Destino:** `/minha-conta/aula/74ad0121-0428-4e21-a027-5911dc2443ef`

---

## Detalhes Técnicos

### Arquivo: `src/components/support/ChatInterface.tsx`

**Importações:** Adicionar o ícone `ArrowLeft` e `GraduationCap` do lucide-react.

**Botão voltar (na barra de status, linhas 255-273):** Adicionar um botão com ícone de seta para a esquerda ao lado do status do ticket. Ao clicar, executa:
```typescript
setCurrentTicketId(null);
setShowCategorySelector(true);
```

**Botão "Como Processar Pedido" (na seção Ações Rápidas, linhas 195-250):** Adicionar um novo item na lista de ações rápidas:
```tsx
<Button variant="ghost" size="sm" className="justify-start hover:bg-accent" asChild onClick={() => onClose()}>
  <Link to="/minha-conta/aula/74ad0121-0428-4e21-a027-5911dc2443ef">
    <GraduationCap className="h-4 w-4 mr-2" />
    Como Processar Pedido
  </Link>
</Button>
```

Este botão ficara visivel para todos os usuarios, pois e uma aula util para clientes e revendedores.

