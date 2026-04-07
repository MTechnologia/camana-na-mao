# Explicação da Implementação - Task 3 (Infraestrutura)

Este documento descreve detalhadamente cada parte do código modificado para a implementação da avaliação de infraestrutura no chatbot.

## 1. Orquestrador (Backend - Edge Functions)

### `index_ts.txt`
*   **Pergunta de Campo Faltante:** No arquivo `index.ts`, dentro da função `getNextMissingField`, adicionamos uma verificação para o campo `infraestrutura_score`. Se ele não estiver presente nos campos acumulados da conversa, o robô dispara a pergunta específica: *"Como você avalia a infraestrutura (instalações, limpeza e conservação)? De 1 a 5 estrelas."*.
*   **Marcador [DIMENSION_RATING_PICKER:infraestrutura]:** Esse marcador é enviado ao frontend para que o chat saiba que deve exibir o seletor de estrelas para a dimensão "infraestrutura".

### `lib_ts.txt`
*   **Replicação no Histórico:** Na função `accumulateFieldsFromHistory`, adicionamos a lógica para detectar o marcador de nota de infraestrutura. Sempre que a nota é capturada, ela é automaticamente replicada para o campo `limpeza_score`, garantindo que as duas dimensões fiquem sincronizadas conforme a RN.
*   **Persistência (create_service_rating):** No momento de salvar a avaliação no banco de dados, o código insere os valores de infraestrutura e limpeza dentro do objeto `dimensions` (coluna JSONB), permitindo o armazenamento estruturado de múltiplas notas.

## 2. Frontend (Interface do Usuário)

### `ChatMessageBubble_tsx.txt`
*   **Detecção Dinâmica:** O componente foi refatorado para usar um `regex` que identifica o marcador `[DIMENSION_RATING_PICKER:nome_da_dimensao]`. Isso torna o sistema flexível para qualquer nova categoria de avaliação que surja.
*   **Renderização do InlineRatingPicker:** Ao detectar o marcador de infraestrutura, o componente renderiza o seletor de estrelas configurado para essa dimensão específica.

### `App_tsx.txt`
*   **Rota de Teste:** Adicionamos a rota `/test-infra-rating` para facilitar o acesso à página de validação isolada, sem precisar passar por todo o fluxo de conversa do chatbot durante o desenvolvimento.

## 3. Validação

### `TestInfraRating_tsx.txt`
*   **Página de Teste:** Criamos um ambiente isolado onde o `InlineRatingPicker` pode ser testado diretamente. Ele valida se a nota selecionada gera o marcador correto (`[DIM_RATING:infraestrutura:N]`), que é o que o orquestrador espera receber para processar a nota.
