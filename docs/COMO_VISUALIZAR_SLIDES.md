# Como Visualizar os Slides da Apresentação

**Arquivo:** `docs/APRESENTACAO_RAPIDA_REUNIAO.md`

---

## 🚀 Opções Rápidas (Recomendado para Reunião)

### Opção 1: VS Code / Cursor (Já está aberto!)

1. **Abra o arquivo**: `docs/APRESENTACAO_RAPIDA_REUNIAO.md`
2. **Pressione**: `Ctrl+Shift+V` (Windows) ou `Cmd+Shift+V` (Mac)
3. **Visualização**: Slides aparecem formatados no preview

**Vantagem**: Já está no seu editor, sem instalar nada!

---

### Opção 2: GitHub (Online)

1. **Faça commit e push** do arquivo
2. **Acesse no GitHub**: Navegue até o arquivo
3. **Visualização**: GitHub renderiza Markdown automaticamente

**URL exemplo**: `https://github.com/MTechnologia/camana-na-mao/blob/dev/docs/APRESENTACAO_RAPIDA_REUNIAO.md`

---

### Opção 3: Markdown Preview Plus (Chrome Extension)

1. **Instale**: [Markdown Preview Plus](https://chrome.google.com/webstore/detail/markdown-preview-plus/febilkbfcfhefneiifdeeagdogemloif)
2. **Abra o arquivo**: Arraste o `.md` para o Chrome
3. **Visualização**: Slides formatados no navegador

---

## 📊 Opções para Apresentação (Slides Reais)

### Opção 4: Marp (Apresentação de Slides)

1. **Instale Marp**: [Marp.app](https://marp.app/) (gratuito)
2. **Abra o arquivo** no Marp
3. **Apresente**: Modo apresentação (F5)

**Vantagem**: Transforma Markdown em slides reais (PowerPoint-like)

---

### Opção 5: Converter para PDF

#### Via VS Code:
1. Abra o preview (`Ctrl+Shift+V`)
2. Clique com botão direito → "Print" ou `Ctrl+P`
3. Salve como PDF

#### Via Pandoc (Terminal):
```bash
# Instalar pandoc (se não tiver)
# Windows: choco install pandoc
# Mac: brew install pandoc

# Converter para PDF
pandoc docs/APRESENTACAO_RAPIDA_REUNIAO.md -o apresentacao.pdf --pdf-engine=wkhtmltopdf

# Ou para HTML (mais fácil)
pandoc docs/APRESENTACAO_RAPIDA_REUNIAO.md -o apresentacao.html
```

---

### Opção 6: Online Markdown Viewer

1. **Acesse**: https://dillinger.io/ ou https://stackedit.io/
2. **Cole o conteúdo** do arquivo `.md`
3. **Visualize**: Slides formatados

---

## 🎯 Recomendação para Reunião

### Para Apresentação Rápida:
**Use VS Code/Cursor Preview** (`Ctrl+Shift+V`)
- ✅ Já está instalado
- ✅ Formatação automática
- ✅ Pode compartilhar tela diretamente

### Para Apresentação Formal:
**Use Marp** ou **Converta para PDF**
- ✅ Slides profissionais
- ✅ Pode imprimir/compartilhar
- ✅ Funciona offline

---

## 💡 Dica: Criar Versão HTML Interativa

Posso criar uma versão HTML que você pode abrir diretamente no navegador com navegação entre slides. Quer que eu gere?

---

**Arquivo principal:** `docs/APRESENTACAO_RAPIDA_REUNIAO.md`
