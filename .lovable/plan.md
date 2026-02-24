

## Diagnostico: A pagina /super-admin/planos NAO tem erro 404 de codigo

### O que esta acontecendo

A rota `/super-admin/planos` esta corretamente definida no `App.tsx` (linha 314) e o componente `Planos.tsx` existe em `src/pages/admin/Planos.tsx`. O codigo esta correto.

O 404 acontece porque voce **nao esta logado como super_admin** no preview. O `RoleBasedRoute` verifica a autenticacao e, se o usuario nao esta logado, redireciona para `/auth`. Se esta logado mas nao e super_admin, redireciona para `/`.

Quando testei pelo browser, a pagina redirecionou corretamente para a tela de login (`/auth`), confirmando que a rota existe e funciona.

### Como testar

1. Acesse `/auth` no preview
2. Faca login com uma conta que tenha `role = 'super_admin'` no banco
3. Depois navegue para `/super-admin/planos`

### Verificacao do banco

Se quiser, posso verificar qual usuario tem role `super_admin` no banco para confirmar as credenciais de acesso. Nao ha nenhuma alteracao de codigo necessaria.

### Caso queira uma solucao alternativa

Se preferir, posso adicionar a pagina de Planos tambem nas rotas do `/admin` (acessivel por `admin` e `super_admin`), para que voce possa acessar por `/admin/planos` com sua conta admin atual.

