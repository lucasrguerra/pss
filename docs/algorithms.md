# 📐 Algoritmos de Escalonamento

*Also available in: [🇺🇸 English](./algorithms.en.md)*

Este documento descreve em detalhes os algoritmos de escalonamento implementados no PSS. Para cada algoritmo são apresentados o princípio de funcionamento, parâmetros, regras de desempate e exemplos didáticos.

---

## Regras Gerais

- **Unidade de tempo:** o simulador opera em *ticks* discretos. Cada tick representa 1 unidade de tempo de CPU.
- **Bursts:** cada processo possui uma sequência de bursts alternados: `CPU → I/O → CPU → ...`, sempre começando com CPU.
- **Desempate:** quando dois processos estão empatados no critério de seleção do algoritmo, a prioridade vai para o que chegou primeiro (`arrivalTime`). Em segundo desempate, usa-se o `id` em ordem lexicográfica.
- **Context Switch:** se configurado (≥ 1 tick), um overhead é inserido toda vez que a CPU troca de processo.

---

## FCFS (First Come, First Served)

**Tipo:** Não-preemptivo

### Como funciona

Talvez o algoritmo mais intuitivo: o processo que chegou primeiro é atendido primeiro. A fila Ready é ordenada por `arrivalTime`. Quando um processo ocupa a CPU, ele permanece lá até completar seu burst de CPU atual, sem interrupções.

### Exemplo

```
P1: chegada=0, CPU: 4 ticks
P2: chegada=1, CPU: 3 ticks
P3: chegada=2, CPU: 1 tick

Gantt: | P1 P1 P1 P1 | P2 P2 P2 | P3 |
Tick:    0  1  2  3    4  5  6    7
```

| Processo | Turnaround | Waiting |
|----------|:----------:|:-------:|
| P1 | 4 | 0 |
| P2 | 6 | 3 |
| P3 | 6 | 5 |

### Observação: Efeito de Comboio

Se um processo longo chega antes de vários processos curtos, estes ficam esperando por muito tempo, mesmo que a CPU esteja "disponível" para eles. Este fenômeno é chamado de **Convoy Effect** e é um dos principais problemas do FCFS. Experimente o preset `convoy_effect` para visualizá-lo.

---

## SJF (Shortest Job First - Não-Preemptivo)

**Tipo:** Não-preemptivo

### Como funciona

Ao selecionar o próximo processo, o SJF escolhe aquele com o **menor burst de CPU restante** na fila Ready. Uma vez na CPU, o processo não é interrompido até completar seu burst.

O SJF é ótimo para minimizar o tempo médio de espera, mas tem um problema prático: em sistemas reais, a duração dos bursts futuros é desconhecida. No simulador, você define os bursts explicitamente, então o SJF pode ser aplicado perfeitamente.

### Parâmetros

Nenhum parâmetro adicional.

---

## SRTF (Shortest Remaining Time First - SJF Preemptivo)

**Tipo:** Preemptivo

### Como funciona

Versão preemptiva do SJF. A cada tick, o escalonador verifica se algum processo na fila Ready possui tempo de burst restante **menor** que o processo atualmente em execução. Se sim, ocorre uma preempção: o processo atual é devolvido à fila Ready e o novo candidato assume a CPU.

### Exemplo

```
P1: chegada=0, CPU: 8 ticks
P2: chegada=1, CPU: 4 ticks

Tick 0: P1 começa (remaining=8)
Tick 1: P2 chega (remaining=4 < 7) → preempção!
Tick 5: P2 termina → P1 retoma (remaining=7)
Tick 12: P1 termina
```

---

## Round Robin (RR)

**Tipo:** Preemptivo  
**Parâmetro:** `quantum` (fatia de tempo, padrão: 2)

### Como funciona

A fila Ready é tratada como uma fila circular. Cada processo recebe no máximo `quantum` ticks de CPU consecutivos. Se ao final do quantum o processo ainda tiver burst restante, ele retorna ao **fim** da fila Ready e aguarda sua vez.

I/O bursts **não** consomem quantum, pois o processo sai voluntariamente da CPU quando inicia I/O.

### Tradeoff

Quanto menor o quantum, mais justo o revezamento, mas maior o overhead de context switches. Quanto maior, o RR se aproxima do FCFS.

---

## Priority Scheduling (Não-Preemptivo e Preemptivo)

**Tipo:** Não-preemptivo ou Preemptivo (selecione no painel)  
**Parâmetros:** Aging (opcional) + intervalo de aging

### Como funciona

Cada processo tem uma prioridade de `1` (maior) a `10` (menor). O escalonador sempre seleciona o processo de maior prioridade na fila Ready.

- **Não-preemptivo:** uma vez na CPU, o processo termina seu burst sem ser interrompido.
- **Preemptivo:** se um processo de prioridade maior chegar, o atual é preemptado imediatamente.

### Starvation e Aging

O problema clássico do Priority Scheduling é o **starvation**: processos de baixa prioridade podem *nunca* receber a CPU se processos de alta prioridade chegam continuamente.

A solução é o **aging**: a cada `agingInterval` ticks que um processo permanece na fila Ready, sua prioridade é incrementada em 1 (ou seja, o valor numérico diminui), até o mínimo de `1`. Com o tempo, mesmo processos de baixa prioridade chegam à cabeça da fila.

Experimente os presets `starvation` e `aging_fix` para ver esta diferença.

---

## HRRN (Highest Response Ratio Next)

**Tipo:** Não-preemptivo

### Como funciona

O HRRN tenta ser mais justo que o SJF levando em conta o tempo de espera do processo. A cada seleção, calcula-se o **Response Ratio** de cada processo na fila:

```
ratio = (waitingTime + burstTime) / burstTime
```

O processo com o **maior ratio** é selecionado. Isso faz com que processos que esperam há muito tempo tenham sua prioridade aumentada naturalmente, evitando starvation.

| Situação | Efeito no ratio |
|----------|----------------|
| Processo com burst curto | ratio alto desde o início |
| Processo esperando há muito tempo | ratio cresce com o tempo |
| Processo com burst longo + pouco wait | ratio baixo |

---

## Multilevel Queue

**Tipo:** Preemptivo
**Parâmetros:** número de filas, quantum por fila

### Como funciona

Os processos são distribuídos em múltiplas filas com diferentes prioridades. Cada fila tem seu próprio quantum de Round Robin. Filas de maior prioridade sempre são servidas primeiro. Uma fila de menor prioridade só recebe CPU se todas as filas acima dela estiverem vazias.

Isso permite tratar diferentes classes de processos de forma distinta: por exemplo, processos interativos em filas de alta prioridade (quantum pequeno) e processos batch em filas de baixa prioridade (quantum maior).

---

## MLFQ (Multilevel Feedback Queue)

**Tipo:** Preemptivo
**Parâmetros:** número de filas, quantum por fila (padrão: [2, 4, 8]), intervalo de boost

### Como funciona

O MLFQ é uma extensão do Multilevel Queue que permite **mover processos entre filas** com base em seu comportamento observado em tempo de execução — eliminando a necessidade de conhecer os bursts antecipadamente.

#### Regras de movimentação

| Evento | Ação |
|--------|------|
| Processo recém-chegado | Entra na **fila 0** (maior prioridade) |
| Processo esgota o quantum da fila atual | **Rebaixado** para a fila seguinte (menor prioridade) |
| Processo retorna do I/O | Permanece na **mesma fila** (comportamento cooperativo é recompensado) |
| Tick de boost (intervalo configurável) | **Todos** os processos são movidos para a fila 0 |

#### Por que o MLFQ é eficiente?

- Processos interativos (I/O Bound) naturalmente ficam nas filas de alta prioridade porque abandonam a CPU antes de esgotar o quantum.
- Processos batch (CPU Bound) migram progressivamente para filas de baixa prioridade onde recebem quantuns maiores.
- O boost periódico evita starvation: mesmo processos que caíram para as filas inferiores eventual­mente retornam ao topo.

#### Exemplo com 3 filas (quantuns: 2, 4, 8)

```
Processo A (CPU Bound, burst=12):
  Fila 0 → usa 2 ticks, rebaixado → Fila 1
  Fila 1 → usa 4 ticks, rebaixado → Fila 2
  Fila 2 → usa 6 ticks restantes (quantum=8, não esgota)

Processo B (I/O Bound, burst=1 CPU + I/O + burst=1 CPU):
  Fila 0 → usa 1 tick → vai para I/O → retorna à Fila 0
  → sempre permanece na fila de maior prioridade
```

### Parâmetros

| Parâmetro | Padrão | Descrição |
|-----------|--------|-----------|
| Número de filas | 3 | Quantidade de filas de prioridade |
| Quantuns por fila | [2, 4, 8] | Fatia de tempo de cada fila |
| Intervalo de boost | 20 ticks | A cada N ticks, todos os processos sobem para a fila 0 |

---

## Modelos de Threads

O PSS suporta simulação de **threads** dentro de processos, implementando os três modelos clássicos descritos em Sistemas Operacionais.

### Conceitos Gerais

- Um processo pode ter **N threads de usuário**, cada uma com sua própria sequência de bursts (CPU e I/O).
- A política de escalonamento entre threads de um mesmo processo é configurável: **FCFS**, **Round Robin** ou **Prioridade**.
- O modelo de thread determina como threads de usuário se mapeiam para threads de kernel.

### MANY_TO_ONE (N:1)

**N threads de usuário → 1 thread de kernel**

- Apenas uma thread pode usar a CPU por vez dentro do processo.
- Se qualquer thread iniciar I/O, **todo o processo bloqueia** (a thread de kernel fica presa).
- Sem paralelismo real; muito simples de implementar.
- Simulado pelos presets `many_to_one`.

### ONE_TO_ONE (1:1)

**Cada thread de usuário → 1 thread de kernel dedicada**

- Threads bloqueiam **independentemente**: se a Thread A faz I/O, as Threads B e C continuam na fila Ready.
- Processo só termina quando **todas** as threads terminam.
- Processo bloqueia somente quando todas as threads estão simultâneamente em I/O.
- Simulado pelos presets `one_to_one`.

### MANY_TO_MANY (N:M)

**N threads de usuário → M threads de kernel (M ≤ N)**

- O número de threads de kernel (`kernelThreadCount`) é configurável.
- Se todas as M slots de kernel estiverem ocupadas, threads de usuário adicionais ficam em **fila de espera de kernel** (`KernelWait`).
- Combina flexibilidade com controle de recursos: mais threads ativas que N:1 mas menos overhead que 1:1.
- Simulado pelos presets `many_to_many`.

### Política Intra-Processo

Define como o escalonador seleciona a próxima thread quando há múltiplas threads Ready no mesmo processo:

| Política | Comportamento |
|----------|--------------|
| **FCFS** | Thread mais antiga na fila Ready é selecionada |
| **Round Robin (RR)** | Cada thread recebe `threadQuantum` ticks; ao esgotar, vai para o fim da fila |
| **Priority** | Thread de maior prioridade é selecionada; preempção imediata se nova thread de maior prioridade chegar |

### Diagrama de Gantt com Threads

Quando um processo possui threads, o Gantt exibe **sub-linhas** abaixo da linha do processo, uma por thread, com cores derivadas da cor do processo (deslocamento de matiz de 40° por thread). O estado de cada thread (New, Ready, Running, Waiting, Terminated) é colorido com as mesmas variáveis CSS dos processos.

---

## Referências

- Silberschatz, A., Galvin, P. B., & Gagne, G., *Operating System Concepts*, 10ª edição.
- Tanenbaum, A. S., *Modern Operating Systems*, 4ª edição.
