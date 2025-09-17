# Como Configurar os Templates de Email no Supabase

## Passos para implementar:

### 1. Acessar o Dashboard do Supabase
1. Vá para https://supabase.com/dashboard/project/bbrmjrjorcgsgeztzbsr
2. Faça login na sua conta
3. Navegue para **Authentication** > **Email Templates**

### 2. Configurar cada Template

#### Template: "Confirm signup"
1. Clique em **"Confirm signup"**
2. Substitua todo o conteúdo HTML pelo código do arquivo `confirm-signup.html`
3. **Subject**: `Confirme seu cadastro - Complete sua conta`
4. Clique em **Save**

#### Template: "Reset password"  
1. Clique em **"Reset password"**
2. Substitua todo o conteúdo HTML pelo código do arquivo `reset-password.html`
3. **Subject**: `Redefinir senha - Solicitação de nova senha`
4. Clique em **Save**

#### Template: "Magic link"
1. Clique em **"Magic link"**
2. Substitua todo o conteúdo HTML pelo código do arquivo `magic-link.html`
3. **Subject**: `Link de acesso - Entre na sua conta`
4. Clique em **Save**

### 3. Configurações Importantes

#### Sender Settings
- **From email**: Use um email válido (ex: `noreply@seudominio.com`)
- **From name**: Nome da sua loja

#### Variables Disponíveis
Os templates usam estas variáveis do Supabase:
- `{{ .ConfirmationURL }}` - Link de confirmação/ação
- `{{ .Email }}` - Email do usuário
- `{{ .SiteURL }}` - URL do site
- `{{ .Token }}` - Token (quando aplicável)

### 4. Testar os Templates
1. Faça um novo cadastro com um email de teste
2. Verifique se o email chegou com o novo design
3. Teste o link de confirmação
4. Teste também reset de senha

### 5. Configurar Domínio Personalizado (Opcional)
1. Vá em **Settings** > **SMTP Settings**
2. Configure seu próprio servidor SMTP
3. Isso melhora a deliverability dos emails

## Links Úteis
- [Dashboard Supabase](https://supabase.com/dashboard/project/bbrmjrjorcgsgeztzbsr)
- [Email Templates](https://supabase.com/dashboard/project/bbrmjrjorcgsgeztzbsr/auth/templates)
- [SMTP Settings](https://supabase.com/dashboard/project/bbrmjrjorcgsgeztzbsr/settings/smtp)

## Troubleshooting
- Se os emails não chegarem, verifique a pasta de spam
- Certifique-se que o "From email" está configurado
- Teste com diferentes provedores de email (Gmail, Outlook, etc.)