# Orquestração de Workflow

## 1. Planejamento por padrão
- Entre em modo de planejamento para qualquer tarefa com múltiplas etapas, risco de regressão ou decisão arquitetural.
- Se algo sair do esperado, pare, reavalie e ajuste o plano antes de continuar.
- Use planejamento também para validar e fechar tarefas, não apenas para construir.
- Escreva especificações claras antes de implementar quando houver ambiguidade.

## 2. Estratégia com subagentes
- Use subagentes quando isso ajudar a separar investigação, execução e validação.
- Delegue pesquisa, exploração e análise paralela em tarefas complexas.
- Para problemas grandes, distribua o trabalho em frentes bem definidas.
- Mantenha um objetivo claro por subagente para evitar sobreposição e confusão.

## 3. Loop de autoaperfeiçoamento
- Depois de correções relevantes, registre padrões, lições e prevenções em `tasks/lessons.md`.
- Escreva regras para evitar repetir o mesmo erro.
- Reutilize essas lições no início de sessões futuras quando forem relevantes.
- Prefira melhorar o processo, não apenas corrigir o sintoma.

## 4. Validação antes de concluir
- Nunca marque uma tarefa como concluída sem evidência adequada de que funciona.
- Compare o comportamento anterior e o comportamento novo quando isso for relevante.
- Execute testes, confira logs e valide o fluxo real quando aplicável.
- Pergunte a si mesmo: “Essa entrega passaria pelo crivo de um engenheiro sênior?”

## 5. Elegância com pragmatismo
- Em mudanças não triviais, pause e avalie se existe uma solução mais simples, robusta e elegante.
- Se a solução parecer improvisada, repense antes de seguir.
- Não superengenheire correções simples.
- Desafie a própria implementação antes de apresentá-la como pronta.

## 6. Correção autônoma de bugs
- Ao receber um bug reproduzível, investigue e corrija com autonomia.
- Use erros, logs, testes falhos e comportamento real como ponto de partida.
- Evite pedir instruções desnecessárias quando o caminho já estiver claro.
- Vá até a causa raiz sempre que possível, não apenas ao sintoma.

# Gestão de tarefas

1. **Planejar primeiro**  
   Escreva o plano em `tasks/todo.md` com itens verificáveis.

2. **Validar o plano**  
   Revise o plano antes de começar a implementação.

3. **Acompanhar progresso**  
   Marque itens concluídos conforme avançar.

4. **Explicar mudanças**  
   Registre resumos objetivos das decisões importantes.

5. **Documentar resultados**  
   Adicione uma seção de revisão em `tasks/todo.md` ao final.

6. **Capturar lições**  
   Atualize `tasks/lessons.md` quando houver aprendizados reutilizáveis.

# Princípios centrais

- **Simplicidade primeiro**: faça a menor mudança necessária com o maior impacto útil.
- **Sem preguiça técnica**: busque causa raiz; evite remendos frágeis.
- **Impacto mínimo**: altere apenas o que precisa ser alterado.
- **Sem regressão silenciosa**: preserve fluxos que já funcionam.
- **Prova antes de conclusão**: tarefa pronta é tarefa validada.

# Adaptação por tipo de projeto

## Se for interface/web app
- Validar no navegador real quando a mudança afetar UX, layout ou fluxo.
- Testar em zoom 100% e em viewports relevantes.
- Não concluir sem verificar estados de loading, erro e sucesso.

## Se for backend/API
- Validar endpoints, logs, tratamento de erro e impacto em contratos.
- Testar cenários felizes e falhas principais.

## Se for sistema com IA
- Avaliar não só funcionamento técnico, mas também qualidade da saída.
- Medir coerência, utilidade, diversidade e aderência ao objetivo do produto.

## Se for infraestrutura/deploy
- Validar build, ambiente, rollout e possibilidade de rollback.