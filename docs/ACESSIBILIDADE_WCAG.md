# Diretrizes de Acessibilidade WCAG 2.1 AA - CMSP Connect

> **Versão**: 1.0  
> **Última atualização**: Janeiro 2026  
> **Nível de conformidade**: WCAG 2.1 AA

---

## 📋 Índice

1. [Introdução e Declaração de Conformidade](#1-introdução-e-declaração-de-conformidade)
2. [Princípios WCAG Implementados](#2-princípios-wcag-implementados)
3. [Componentes de Acessibilidade](#3-componentes-de-acessibilidade)
4. [Estilos CSS de Acessibilidade](#4-estilos-css-de-acessibilidade)
5. [Componentes UI Acessíveis](#5-componentes-ui-acessíveis)
6. [Atributos ARIA Utilizados](#6-atributos-aria-utilizados)
7. [Página de Configurações de Acessibilidade](#7-página-de-configurações-de-acessibilidade)
8. [Checklist de Testes](#8-checklist-de-testes)
9. [Glossário de Termos](#9-glossário-de-termos)
10. [Contato e Suporte](#10-contato-e-suporte)

---

## 1. Introdução e Declaração de Conformidade

### 1.1 Declaração de Acessibilidade

O CMSP Connect está comprometido em garantir a acessibilidade digital para todas as pessoas, incluindo aquelas com deficiências. Seguimos as Diretrizes de Acessibilidade para Conteúdo Web (WCAG) 2.1 nível AA como padrão mínimo de conformidade.

### 1.2 Escopo

Esta documentação abrange:
- Todas as páginas públicas do aplicativo
- Interfaces de administração
- Componentes de chat com IA
- Formulários de relatos e avaliações
- Mapas e visualizações de dados

### 1.3 Base Legal

- **Lei Brasileira de Inclusão (LBI)** - Lei nº 13.146/2015
- **eMAG** - Modelo de Acessibilidade em Governo Eletrônico
- **WCAG 2.1** - Web Content Accessibility Guidelines

---

## 2. Princípios WCAG Implementados

### 2.1 Perceptível

Os usuários devem ser capazes de perceber a informação apresentada.

| Critério | Descrição | Status | Implementação |
|----------|-----------|--------|---------------|
| **1.1.1** Conteúdo Não Textual | Alternativas em texto para conteúdo não textual | ✅ Implementado | `aria-label` em 205+ elementos, `alt` em imagens |
| **1.3.1** Informações e Relações | Estrutura e relações podem ser determinadas programaticamente | ✅ Implementado | HTML semântico com `<main>`, `<nav>`, `<header>`, `<section>` |
| **1.3.2** Sequência Significativa | Ordem de leitura correta pode ser determinada | ✅ Implementado | DOM ordenado logicamente |
| **1.4.1** Uso de Cor | Cor não é o único meio visual de transmitir informação | ✅ Implementado | Ícones e texto acompanham indicadores de cor |
| **1.4.3** Contraste Mínimo | Ratio de contraste de pelo menos 4.5:1 para texto | ✅ Implementado | Variáveis CSS com contraste validado |
| **1.4.4** Redimensionar Texto | Texto pode ser redimensionado até 200% | ✅ Implementado | Layout responsivo com `rem` e `em` |
| **1.4.11** Contraste Não-Textual | Componentes UI têm ratio de 3:1 | ✅ Implementado | Bordas e ícones com contraste adequado |

### 2.2 Operável

Os usuários devem ser capazes de operar a interface.

| Critério | Descrição | Status | Implementação |
|----------|-----------|--------|---------------|
| **2.1.1** Teclado | Toda funcionalidade operável via teclado | ✅ Implementado | Tab, Enter, Escape, Arrow keys |
| **2.1.2** Sem Bloqueio de Teclado | Foco não fica preso | ✅ Implementado | Focus traps apenas em modais com Escape |
| **2.4.1** Ignorar Blocos | Mecanismo para pular conteúdo repetido | ✅ Implementado | `SkipLink` component |
| **2.4.2** Página com Título | Páginas têm títulos descritivos | ✅ Implementado | `<title>` dinâmico por rota |
| **2.4.3** Ordem de Foco | Foco segue ordem significativa | ✅ Implementado | `tabindex` sequencial |
| **2.4.6** Cabeçalhos e Rótulos | Cabeçalhos descrevem tópico ou propósito | ✅ Implementado | Hierarquia H1-H6 semântica |
| **2.4.7** Foco Visível | Indicador de foco visível | ✅ Implementado | `focus-visible:ring-2` |

### 2.3 Compreensível

O conteúdo deve ser compreensível.

| Critério | Descrição | Status | Implementação |
|----------|-----------|--------|---------------|
| **3.1.1** Idioma da Página | Idioma pode ser determinado | ✅ Implementado | `lang="pt-BR"` no `<html>` |
| **3.2.1** Em Foco | Mudança de foco não causa mudança de contexto | ✅ Implementado | Ações requerem interação explícita |
| **3.3.1** Identificação de Erro | Erros são identificados e descritos | ✅ Implementado | `role="alert"` em mensagens de erro |
| **3.3.2** Rótulos ou Instruções | Labels para inputs que requerem entrada | ✅ Implementado | `<Label>` associado via `htmlFor` |

### 2.4 Robusto

O conteúdo deve ser robusto o suficiente para ser interpretado por tecnologias assistivas.

| Critério | Descrição | Status | Implementação |
|----------|-----------|--------|---------------|
| **4.1.1** Análise | HTML bem formado | ✅ Implementado | React + TypeScript garantem estrutura válida |
| **4.1.2** Nome, Função, Valor | Componentes têm nome e função acessíveis | ✅ Implementado | ARIA attributes em todos os componentes interativos |

---

## 3. Componentes de Acessibilidade

### 3.1 Skip Link (Pular Navegação)

Permite que usuários de teclado pulem diretamente para o conteúdo principal.

**Arquivo**: `src/components/accessibility/SkipLink.tsx`

```tsx
import { cn } from "@/lib/utils";

interface SkipLinkProps {
  targetId?: string;
  className?: string;
}

const SkipLink = ({ targetId = "main-content", className }: SkipLinkProps) => {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only",
        "focus:absolute focus:top-2 focus:left-2 focus:z-[9999]",
        "focus:px-4 focus:py-2 focus:rounded-md",
        "focus:bg-primary focus:text-primary-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "font-medium text-sm transition-all",
        className
      )}
    >
      Pular para o conteúdo principal
    </a>
  );
};

export default SkipLink;
```

**Uso no AppLayout**:
```tsx
<SkipLink />
<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

### 3.2 Hook useAccessibility

Gerencia preferências de acessibilidade do usuário com persistência.

**Arquivo**: `src/hooks/useAccessibility.ts`

#### Funcionalidades

| Recurso | Descrição | Valores |
|---------|-----------|---------|
| **Tamanho de Fonte** | Ajusta o tamanho base do texto | `small` (14px), `medium` (16px), `large` (18px) |
| **Modo de Leitura** | Alto contraste para melhor visibilidade | `true` / `false` |
| **Espaçamento de Texto** | Mais espaço entre linhas e letras | `true` / `false` |

#### API

```typescript
const {
  fontSize,           // 'small' | 'medium' | 'large'
  readingMode,        // boolean
  textSpacing,        // boolean
  isLoading,          // boolean
  setFontSize,        // (size: FontSize) => void
  toggleReadingMode,  // () => void
  toggleTextSpacing,  // () => void
} = useAccessibility();
```

#### Persistência

- **Usuários autenticados**: Salvo na tabela `user_preferences` do banco de dados
- **Usuários anônimos**: Salvo no `localStorage`
- **Sincronização**: Configurações do banco são prioritárias quando disponíveis

### 3.3 Mensagens de Erro Acessíveis

**Arquivo**: `src/components/ui/form.tsx`

```tsx
const FormMessage = React.forwardRef<HTMLParagraphElement, Props>(
  ({ className, children, ...props }, ref) => {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error?.message) : children;

    if (!body) return null;

    return (
      <p 
        ref={ref} 
        id={formMessageId} 
        role="alert"
        aria-live="assertive"
        className={cn("text-sm font-medium text-destructive", className)} 
        {...props}
      >
        {body}
      </p>
    );
  }
);
```

**Atributos de acessibilidade**:
- `role="alert"`: Anuncia imediatamente para leitores de tela
- `aria-live="assertive"`: Interrompe leitura atual para anunciar erro

---

## 4. Estilos CSS de Acessibilidade

### 4.1 Modo de Leitura (Alto Contraste)

**Arquivo**: `src/index.css`

```css
.reading-mode {
  --background: 0 0% 0%;
  --foreground: 0 0% 100%;
  --card: 0 0% 5%;
  --card-foreground: 0 0% 100%;
  --popover: 0 0% 5%;
  --popover-foreground: 0 0% 100%;
  --primary: 0 0% 100%;
  --primary-foreground: 0 0% 0%;
  --secondary: 0 0% 15%;
  --secondary-foreground: 0 0% 100%;
  --muted: 0 0% 15%;
  --muted-foreground: 0 0% 70%;
  --accent: 0 0% 20%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 80% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 30%;
  --input: 0 0% 20%;
  --ring: 0 0% 100%;
}
```

### 4.2 Espaçamento de Texto

```css
.text-spacing,
.text-spacing * {
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
  line-height: 1.8 !important;
}
```

**Benefícios**:
- Melhora leiturabilidade para dislexia
- Facilita tracking visual de linhas
- Reduz fadiga ocular

### 4.3 Focus Visible

Todos os componentes interativos utilizam:

```css
focus-visible:outline-none 
focus-visible:ring-2 
focus-visible:ring-ring 
focus-visible:ring-offset-2
```

**Características**:
- Visível apenas em navegação por teclado (não em cliques)
- Anel de 2px com cor do tema
- Offset de 2px para separação visual

---

## 5. Componentes UI Acessíveis

### 5.1 Tabela de Componentes

| Componente | Recursos de Acessibilidade | Arquivo |
|------------|---------------------------|---------|
| **Button** | `focus-visible:ring-2`, estados disabled distintos, `aria-disabled` | `src/components/ui/button.tsx` |
| **Input** | `aria-describedby`, `aria-invalid`, placeholder acessível | `src/components/ui/input.tsx` |
| **Switch** | `focus-visible:ring-2`, `aria-checked` automático | `src/components/ui/switch.tsx` |
| **Checkbox** | Estados `aria-checked`, label associado | `src/components/ui/checkbox.tsx` |
| **Select** | Navegação por teclado, `aria-expanded`, `aria-selected` | `src/components/ui/select.tsx` |
| **Dialog** | Focus trap, `aria-modal`, Escape para fechar | `src/components/ui/dialog.tsx` |
| **Alert Dialog** | `role="alertdialog"`, foco automático em ação primária | `src/components/ui/alert-dialog.tsx` |
| **Accordion** | `aria-expanded`, navegação por setas | `src/components/ui/accordion.tsx` |
| **Tabs** | `role="tablist"`, `aria-selected`, Arrow keys | `src/components/ui/tabs.tsx` |
| **Carousel** | `role="region"`, `aria-roledescription="carousel"` | `src/components/ui/carousel.tsx` |
| **Toast** | `role="status"`, `aria-live="polite"` | `src/components/ui/toast.tsx` |
| **Form** | `role="alert"` para erros, `aria-describedby` | `src/components/ui/form.tsx` |

### 5.2 Navegação por Teclado

| Tecla | Ação |
|-------|------|
| `Tab` | Move foco para próximo elemento focável |
| `Shift + Tab` | Move foco para elemento anterior |
| `Enter` / `Space` | Ativa botões e links |
| `Escape` | Fecha modais e dropdowns |
| `Arrow Up/Down` | Navega em listas e selects |
| `Arrow Left/Right` | Navega em tabs e sliders |
| `Home` / `End` | Vai para primeiro/último item |

---

## 6. Atributos ARIA Utilizados

### 6.1 Inventário de Atributos

| Atributo | Ocorrências | Uso Principal |
|----------|-------------|---------------|
| `aria-label` | 205+ | Rótulos descritivos para elementos sem texto visível |
| `aria-labelledby` | 50+ | Associação com elementos de rótulo existentes |
| `aria-describedby` | 40+ | Descrições adicionais para inputs |
| `aria-live` | 15+ | Regiões que anunciam mudanças |
| `aria-checked` | Automático | Estado de checkboxes e switches |
| `aria-expanded` | Automático | Estado de accordions e dropdowns |
| `aria-selected` | Automático | Item selecionado em listas |
| `aria-invalid` | Automático | Campos com erro de validação |
| `aria-modal` | Automático | Dialogs modais |
| `aria-hidden` | 30+ | Elementos decorativos |
| `aria-disabled` | Automático | Elementos desabilitados |

### 6.2 Roles Utilizados

| Role | Uso |
|------|-----|
| `role="alert"` | Mensagens de erro e avisos urgentes |
| `role="alertdialog"` | Dialogs de confirmação |
| `role="button"` | Elementos clicáveis não-nativos |
| `role="dialog"` | Modais e drawers |
| `role="group"` | Agrupamento lógico de controles |
| `role="radiogroup"` | Grupos de radio buttons |
| `role="region"` | Áreas significativas da página |
| `role="status"` | Atualizações de status não urgentes |
| `role="tablist"` | Container de tabs |
| `role="tab"` | Tab individual |
| `role="tabpanel"` | Conteúdo de tab |

---

## 7. Página de Configurações de Acessibilidade

### 7.1 Rota

**URL**: `/configuracoes/acessibilidade`  
**Arquivo**: `src/pages/settings/AccessibilityPage.tsx`

### 7.2 Funcionalidades

#### Tamanho de Fonte

```tsx
<div className="flex gap-2" role="radiogroup" aria-label="Selecione o tamanho da fonte">
  <button
    role="radio"
    aria-checked={fontSize === "small"}
    onClick={() => setFontSize("small")}
  >
    <span className="text-sm">A</span>
    <p>Pequeno</p>
  </button>
  {/* medium e large similares */}
</div>
```

#### Modo de Leitura

```tsx
<Switch 
  checked={readingMode} 
  onCheckedChange={toggleReadingMode}
  aria-label="Ativar modo de leitura de alto contraste"
/>
```

#### Espaçamento de Texto

```tsx
<Switch 
  checked={textSpacing} 
  onCheckedChange={toggleTextSpacing}
  aria-label="Ativar espaçamento aumentado de texto"
/>
```

### 7.3 Persistência

| Cenário | Armazenamento | Prioridade |
|---------|---------------|------------|
| Usuário autenticado | `user_preferences` (banco) | Alta |
| Cache local | `localStorage` | Média |
| Padrão | Configurações medium/off/off | Baixa |

---

## 8. Checklist de Testes

### 8.1 Testes Manuais

#### Navegação por Teclado
- [ ] Todas as funcionalidades acessíveis via Tab
- [ ] Ordem de foco lógica e previsível
- [ ] Indicador de foco sempre visível
- [ ] Skip Link funcional (Tab na página inicial)
- [ ] Escape fecha modais e dropdowns
- [ ] Enter/Space ativa botões e links

#### Leitor de Tela
- [ ] Página tem título descritivo
- [ ] Imagens têm texto alternativo
- [ ] Formulários têm labels associados
- [ ] Erros são anunciados imediatamente
- [ ] Landmarks semânticos presentes (main, nav, header)
- [ ] Tabelas têm cabeçalhos associados

#### Contraste e Cores
- [ ] Texto normal: ratio ≥ 4.5:1
- [ ] Texto grande (18px+): ratio ≥ 3:1
- [ ] Componentes UI: ratio ≥ 3:1
- [ ] Cor não é único indicador de informação

#### Redimensionamento
- [ ] Zoom 200% sem perda de conteúdo
- [ ] Texto não sobrepõe outros elementos
- [ ] Scroll horizontal não necessário
- [ ] Funcionalidades mantidas em zoom

### 8.2 Ferramentas Automatizadas

| Ferramenta | Propósito | URL |
|------------|-----------|-----|
| **axe DevTools** | Auditoria automatizada | [axe](https://www.deque.com/axe/) |
| **WAVE** | Verificação visual | [WAVE](https://wave.webaim.org/) |
| **Lighthouse** | Auditoria integrada Chrome | DevTools > Lighthouse |
| **Color Contrast Analyzer** | Verificação de contraste | [CCA](https://www.tpgi.com/color-contrast-checker/) |

### 8.3 Testes com Leitores de Tela

| Leitor | Navegador | Sistema |
|--------|-----------|---------|
| **NVDA** | Firefox, Chrome | Windows |
| **JAWS** | Chrome, Edge | Windows |
| **VoiceOver** | Safari | macOS, iOS |
| **TalkBack** | Chrome | Android |

### 8.4 Comandos Essenciais NVDA

| Comando | Ação |
|---------|------|
| `Insert + Down` | Ler tudo |
| `Insert + F7` | Lista de links |
| `H` | Próximo cabeçalho |
| `D` | Próximo landmark |
| `F` | Próximo formulário |
| `B` | Próximo botão |
| `Tab` | Próximo elemento focável |

---

## 9. Glossário de Termos

| Termo | Definição |
|-------|-----------|
| **ARIA** | Accessible Rich Internet Applications - especificação W3C para acessibilidade |
| **Focus Trap** | Técnica que mantém o foco dentro de um componente (ex: modal) |
| **Landmark** | Região semântica da página (main, nav, header, footer) |
| **Screen Reader** | Software que lê conteúdo da tela para usuários com deficiência visual |
| **Skip Link** | Link oculto que permite pular para o conteúdo principal |
| **WCAG** | Web Content Accessibility Guidelines - diretrizes de acessibilidade |
| **Focus Visible** | Estado de foco visível apenas em navegação por teclado |
| **Ratio de Contraste** | Proporção entre cores de primeiro plano e fundo |
| **Tecnologia Assistiva** | Software ou hardware que auxilia pessoas com deficiências |

---

## 10. Contato e Suporte

### 10.1 Reportar Problemas de Acessibilidade

Se você encontrar barreiras de acessibilidade no CMSP Connect:

1. **E-mail**: acessibilidade@camarasp.sp.gov.br
2. **Formulário**: Utilize o chat com IA para relatar problemas
3. **Telefone**: 156 (Central de Atendimento)

### 10.2 Prazo de Resposta

- **Problemas críticos** (impossibilidade de uso): 24 horas
- **Problemas moderados** (dificuldade de uso): 7 dias
- **Melhorias sugeridas**: Análise na próxima sprint

### 10.3 Recursos Adicionais

- [WCAG 2.1 (W3C)](https://www.w3.org/WAI/WCAG21/quickref/)
- [eMAG - Governo Federal](https://emag.governoeletronico.gov.br/)
- [WebAIM - Resources](https://webaim.org/resources/)
- [MDN - Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

---

## Histórico de Versões

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | Janeiro 2026 | Documento inicial com diretrizes WCAG 2.1 AA |

---

*Este documento é mantido pela equipe de desenvolvimento do CMSP Connect e revisado a cada sprint de desenvolvimento.*
