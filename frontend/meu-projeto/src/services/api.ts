const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.erro ?? `Erro ${res.status}`);
  }
  return res.json();
}

// ── Doações ───────────────────────────────────────────────────────────────────

export interface Doacao {
  id:           number;
  e2e_id:       string | null;
  doador_nome:  string;
  doador_email: string | null;
  valor:        number;
  tipo:         "pix" | "transferencia" | "dinheiro" | "item";
  origem:       "webhook" | "manual";
  descricao:    string | null;
  categoria:    string | null;
  quantidade:   number | null;
  status:       "pendente" | "confirmado" | "cancelado";
  data_doacao:  string;
  data_criacao: string;
}

export interface ListagemDoacao {
  items:         Doacao[];
  total:         number;
  pagina:        number;
  total_paginas: number;
}

export interface Resumo {
  total_dinheiro: number;
  total_itens:    number;
  do_mes:         number;
  pendentes:      number;
}

export interface PixGerado {
  payment_id:     string;
  status:         string;
  valor:          number;
  qr_code:        string;
  qr_code_base64: string;
  expiracao:      string;
}

export const doacoesApi = {
  listar: (params?: { tipo?: string; status?: string; pagina?: number; por_pagina?: number }) => {
    const qs = new URLSearchParams();
    if (params?.tipo)       qs.set("tipo",       params.tipo);
    if (params?.status)     qs.set("status",     params.status);
    if (params?.pagina)     qs.set("pagina",     String(params.pagina));
    if (params?.por_pagina) qs.set("por_pagina", String(params.por_pagina));
    return request<ListagemDoacao>(`/api/doacoes?${qs}`);
  },

  resumo: () =>
    request<Resumo>("/api/doacoes/resumo"),

  criar: (dados: Partial<Doacao>) =>
    request<Doacao>("/api/doacoes", { method: "POST", body: JSON.stringify(dados) }),

  atualizarStatus: (id: number, status: string) =>
    request<Doacao>(`/api/doacoes/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  gerarPix: (dados: { valor: number; nome: string; email: string }) =>
    request<PixGerado>("/api/doacoes/gerar-pix", {
      method: "POST",
      body: JSON.stringify(dados),
    }),

  statusPix: (paymentId: string) =>
    request<{ payment_id: string; status: string }>(`/api/doacoes/pix/${paymentId}/status`),
};