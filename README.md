# Case Simulator

Simulador de abertura de caixas de CS2. **Não usa dinheiro real**: o saldo e os itens são fictícios e não podem ser sacados, vendidos ou trocados. Projeto de fã, sem vínculo com a Valve.

Esta é a versão 2, reescrita em React + TypeScript e pensada primeiro para celular. A versão original (JavaScript puro) continua no ramo `main`.

## O que tem

- **Caixas**: 221 caixas em 10 categorias, com preço, itens, desgaste e chance de cada item.
- **Roleta**: abre de 1 a 5 caixas por vez, com modo rápido.
- **Inventário**: venda de itens pelo valor de tabela e estatísticas.
- **Aprimoramento**: aposte até 4 itens (e saldo) por um item melhor.
- **Contrato**: troque de 3 a 10 itens por um.
- **Batalhas**: contra bots, em 1x1, 1x1x1, 1x1x1x1 e 2x2, com modo invertido.
- **Saldo fictício**: começa com 100 e pode ser recarregado de graça.

Tudo fica salvo no próprio aparelho (localStorage). Não há servidor nem contas.

## Como rodar

```bash
npm install
npm run dev
```

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run build` | Gera o site em `dist/` |
| `npm test` | Roda os testes das regras (sorteio, aprimoramento, contrato, batalha) |
| `npm run data` | Atualiza `public/catalog.json` com caixas, preços e chances |

## De onde vêm os dados

`scripts/fetch-data.mjs` gera `public/catalog.json` a partir de duas fontes:

- **Caixas, preços, itens e chances**: retrato do catálogo público do csgo.net no momento da coleta. Caixas com nome de pessoas reais (streamers, jogadores) ficam de fora.
- **Imagens e raridades**: [ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API). As imagens são carregadas dos servidores da Steam e pertencem à Valve.

As caixas sem arte oficial são desenhadas pelo próprio app, com o item mais valioso em destaque.

## Regras

- **Abertura**: o item é sorteado com as chances da tabela da caixa. As cartas que passam na roleta são só enfeite.
- **Aprimoramento**: chance = valor apostado ÷ valor do alvo × 0,95, com teto de 90%.
- **Contrato**: o multiplicador sobre o valor entregue segue a tabela coletada (de cerca de 30% a 381%); você recebe o item mais caro que cabe no valor sorteado.
- **Batalha**: todos abrem as mesmas caixas com as mesmas chances. A equipe com a maior soma (ou a menor, no modo invertido) recebe em saldo o valor de todos os itens, dividido entre os membros. Empates são decididos por sorteio.
