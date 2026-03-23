# 📏 Métricas

*Also available in: [🇺🇸 English](./metrics.en.md)*

O PSS calcula automaticamente um conjunto de métricas ao final (ou durante) a simulação. Este documento explica cada métrica, sua fórmula, o que ela representa e como lê-la nos gráficos.

---

## Métricas por Processo

Estas métricas são calculadas individualmente para cada processo simulado.

| Métrica | Fórmula | O que significa |
|---------|---------|----------------|
| **Arrival Time** | `arrivalTime` | Tick em que o processo entrou na fila Ready pela primeira vez |
| **First CPU Tick** | `startTick` | Tick em que o processo usou a CPU pela primeira vez |
| **Finish Time** | `finishTick` | Tick em que o processo encerrou sua execução |
| **Response Time** | `startTick − arrivalTime` | Quanto tempo o processo esperou antes de receber a CPU pela primeira vez |
| **Turnaround Time** | `finishTick − arrivalTime` | Tempo total de vida do processo (chegada → término) |
| **Waiting Time** | `turnaround − cpuTime − ioTime` | Tempo total na fila Ready (sem fazer nada útil) |
| **CPU Time** | Σ ticks em estado Running | Total de CPU efetivamente consumido |
| **I/O Time** | Σ ticks em estado Waiting | Total de tempo aguardando dispositivos de I/O |
| **CPU Utilization** | `cpuTime / turnaround × 100` | Percentual do turnaround em que o processo estava de fato usando CPU |
| **Bound Type** | ver abaixo | Classificação do processo como CPU Bound, I/O Bound ou Balanced |

### Visualização na tabela

Na aba **Por Processo**, cada linha exibe mini barras de progresso horizontais inline ao lado dos valores numéricos. As barras são proporcionais ao **maior valor da mesma métrica entre todos os processos**, permitindo comparação visual imediata:

| Coluna | Cor da barra |
|--------|-------------|
| Response Time | Âmbar |
| Turnaround Time | Azul |
| Waiting Time | Laranja |
| CPU Time | Esmeralda |
| I/O Time | Ciano |
| CPU Utilization | Gradiente violeta → azul |

---

## Métricas Globais

Calculadas sobre o conjunto completo de processos da simulação.

| Métrica | Fórmula |
|---------|---------|
| **Avg Response Time** | Média dos response times de todos os processos |
| **Avg Turnaround Time** | Média dos turnaround times |
| **Avg Waiting Time** | Média dos waiting times |
| **CPU Throughput** | `processos concluídos / tempo total de simulação` |
| **CPU Utilization (global)** | `Σ ticks em Running / tempo total × 100` |
| **Total Simulation Time** | Tick do último evento de término |

Na aba **Global**, cada card de tempo (Response, Turnaround, Waiting) exibe uma barra proporcional ao **tempo total de simulação**, indicando "quanto desse tempo total o processo médio passa nesse estado". A barra de CPU Utilization usa um gradiente âmbar → verde para indicar saúde da utilização.

---

## Classificação CPU Bound vs. I/O Bound

Ao final da simulação, cada processo é classificado automaticamente com base na proporção de tempo gasto em CPU e I/O:

```
cpuRatio = cpuTime / (cpuTime + ioTime)
ioRatio  = ioTime  / (cpuTime + ioTime)

cpuRatio ≥ 0.65  → CPU Bound
ioRatio  ≥ 0.65  → I/O Bound
caso contrário   → Balanced
```

- **CPU Bound:** o processo passa a maior parte do tempo usando o processador.
- **I/O Bound:** o processo passa a maior parte do tempo esperando dispositivos de entrada/saída.
- **Balanced:** o processo usa CPU e I/O de forma equilibrada.

> **Na lista de processos:** estimativa calculada sobre os bursts declarados (antes da simulação).  
> **Na tabela de métricas:** classificação calculada sobre os tempos reais registrados.

---

## Gráficos (aba "Gráfico")

### Perfil Comparativo — Radar Chart

Exibido quando há **2 ou mais processos**. Cada eixo representa uma dimensão de tempo, normalizada de 0–100% em relação ao maior valor dessa dimensão entre todos os processos:

| Eixo | Significado |
|------|------------|
| **Turnaround** | Tempo total de vida relativo |
| **Response** | Tempo até a primeira CPU relativo |
| **Waiting** | Tempo na fila Ready relativo |
| **CPU Time** | Uso de CPU relativo |
| **I/O Time** | Uso de I/O relativo |

Cada processo é desenhado como um polígono colorido (a cor configurada no processo). Polígonos mais "amplos" indicam processos com tempos maiores nas dimensões correspondentes. O radar é ideal para identificar **diferenças de perfil** entre processos — por exemplo, um processo CPU Bound terá o eixo CPU Time muito maior que o eixo I/O Time.

### Breakdown por Processo — Stacked Bar Chart

Sempre exibido. Cada barra representa um processo, com os segmentos empilhados:

- **Âmbar** — Waiting Time
- **Verde** — CPU Time
- **Ciano** — I/O Time

A altura total de cada barra equivale ao **Turnaround Time** do processo.

---

## Exemplo

Considere três processos com os seguintes bursts:

| Processo | Bursts | cpuTime | ioTime | cpuRatio | Classificação |
|----------|--------|:-------:|:------:|:--------:|:-------------:|
| P1 | CPU:8, IO:1, CPU:1 | 9 | 1 | 90% | CPU Bound |
| P2 | CPU:1, IO:8, CPU:1 | 2 | 8 | 20% | I/O Bound |
| P3 | CPU:4, IO:2, CPU:4 | 8 | 2 | 80% | CPU Bound |
