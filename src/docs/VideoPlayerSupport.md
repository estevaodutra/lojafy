# Suporte a Vídeos na Lojafy Academy

## Formatos Suportados

A Lojafy Academy suporta três tipos principais de vídeos para as aulas:

### 1. YouTube

**Formatos aceitos:**
- URL padrão: `https://www.youtube.com/watch?v=VIDEO_ID`
- URL curta: `https://youtu.be/VIDEO_ID`
- URL embed: `https://www.youtube.com/embed/VIDEO_ID`

**Exemplo:**
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### 2. Google Drive

**Formatos aceitos:**
- URL de visualização: `https://drive.google.com/file/d/FILE_ID/view`
- URL de preview: `https://drive.google.com/file/d/FILE_ID/preview`
- Iframe completo do Google Drive

**Exemplos:**

URL direta:
```
https://drive.google.com/file/d/1CIh6RG5uzPiCHE2NKjeUU4dRzugN0dwZ/view
```

Iframe completo (pode colar diretamente):
```html
<iframe src="https://drive.google.com/file/d/1CIh6RG5uzPiCHE2NKjeUU4dRzugN0dwZ/preview" width="640" height="480" allow="autoplay"></iframe>
```

**Como obter o link do Google Drive:**
1. Faça upload do vídeo para o Google Drive
2. Clique com botão direito no arquivo
3. Selecione "Compartilhar" > "Obter link"
4. Configure as permissões como "Qualquer pessoa com o link"
5. Copie a URL e cole no campo de vídeo da aula

### 3. Arquivos de Vídeo Diretos

**Formato aceito:**
- URL direta para arquivo MP4

**Exemplo:**
```
https://exemplo.com/videos/aula-01.mp4
```

## Como Adicionar Vídeos às Aulas

### No Painel Admin

1. Acesse **Admin > Cursos**
2. Selecione um curso e clique em "Gerenciar Conteúdo"
3. Selecione um módulo e adicione ou edite uma aula
4. No campo "URL do Vídeo", cole:
   - A URL do YouTube
   - A URL ou iframe completo do Google Drive
   - A URL direta de um arquivo MP4

### Processamento Automático

O sistema detecta automaticamente o tipo de vídeo e:
- Para YouTube: Converte para formato embed otimizado
- Para Google Drive: Extrai o FILE_ID e cria URL de preview
- Para vídeos diretos: Carrega usando player HTML5 nativo

## Recursos do Player

### YouTube
- Controles completos do YouTube
- Suporte a legendas
- Ajuste de qualidade
- Aceleração de reprodução

### Google Drive
- Autoplay configurável
- Fullscreen
- Controles nativos do Google Drive

### Vídeos Diretos
- Player HTML5 nativo
- Controles de reprodução padrão
- Suporte a múltiplos formatos

## Troubleshooting

### Vídeo do Google Drive não carrega?
- Certifique-se de que o vídeo está com permissão "Qualquer pessoa com o link"
- Verifique se o FILE_ID foi extraído corretamente
- Teste o link diretamente no navegador

### Vídeo do YouTube não aparece?
- Verifique se a URL está correta
- Alguns vídeos podem ter restrições de embed
- Teste se o vídeo carrega diretamente no YouTube

### Vídeo direto não reproduz?
- Certifique-se de que é um arquivo MP4
- Verifique se a URL está acessível publicamente
- Teste o link diretamente no navegador

## Recomendações

1. **Para vídeos grandes**: Use Google Drive ou YouTube
2. **Para conteúdo privado**: Use Google Drive com links de compartilhamento
3. **Para facilidade de gerenciamento**: YouTube é mais fácil de organizar
4. **Para múltiplos formatos**: Arquivos diretos dão mais controle

## Tecnologia

O sistema usa as seguintes funções utilitárias (em `src/lib/videoUtils.ts`):

- `isYouTubeUrl()`: Detecta URLs do YouTube
- `getYouTubeEmbedUrl()`: Converte para formato embed
- `isGoogleDriveUrl()`: Detecta URLs ou iframes do Google Drive
- `getGoogleDriveEmbedUrl()`: Extrai FILE_ID e cria URL de preview
- `extractIframeSrc()`: Extrai atributo src de tags iframe
