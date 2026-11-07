// Ícone de categoria escolhido pelo nome, porque a categoria é criada pelo usuário com nome
// livre e o backend não guarda ícone. Compara palavras inteiras, sem acento e sem caixa,
// na ordem da lista: a primeira regra que bate decide. Sem regra, ícone genérico.

export type CategoryIconKey =
  | "home"
  | "food"
  | "transport"
  | "health"
  | "leisure"
  | "education"
  | "shopping"
  | "bills"
  | "income"
  | "generic";

const RULES: readonly (readonly [CategoryIconKey, readonly string[]])[] = [
  ["home", ["moradia", "casa", "aluguel", "condominio", "imovel", "lar"]],
  ["food", ["alimentacao", "comida", "mercado", "supermercado", "restaurante", "padaria", "lanche", "lanchonete", "feira", "delivery"]],
  ["transport", ["transporte", "combustivel", "gasolina", "uber", "taxi", "onibus", "metro", "estacionamento", "carro", "veiculo"]],
  ["health", ["saude", "farmacia", "medico", "consulta", "exame", "hospital", "dentista", "remedio", "academia"]],
  ["leisure", ["lazer", "entretenimento", "cinema", "streaming", "viagem", "viagens", "passeio", "show", "jogos"]],
  ["education", ["educacao", "curso", "cursos", "escola", "faculdade", "livro", "livros", "estudo", "estudos"]],
  ["shopping", ["compras", "compra", "roupa", "roupas", "vestuario", "presente", "presentes"]],
  ["bills", ["contas", "conta", "luz", "energia", "agua", "internet", "telefone", "celular", "gas", "servicos"]],
  ["income", ["renda", "salario", "receita", "receitas", "rendimento", "freela", "freelance"]],
];

function words(name: string): Set<string> {
  return new Set(
    name
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
}

export function categoryIconKey(name: string | null | undefined): CategoryIconKey {
  if (!name) return "generic";
  const tokens = words(name);
  return RULES.find(([, keywords]) => keywords.some((word) => tokens.has(word)))?.[0] ?? "generic";
}
