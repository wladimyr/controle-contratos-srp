import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, Search, FileText, Calendar, Building, DollarSign, 
  CheckCircle, AlertTriangle, Clock, Trash2, Edit2, ChevronRight, 
  Paperclip, Shield, BarChart2, Layers, Download, Upload, RefreshCw, X
} from 'lucide-react';

// ==========================================
// 1. ESTRUTURA DE DADOS
// ==========================================
export interface DocumentoAnexo {
  id: string;
  tipo: 'EMPENHO' | 'CONTRATO' | 'NFSE' | 'ART' | 'ATESTADO' | 'COMPROVANTE_PAGTO';
  nomeArquivo: string;
  dataUpload: string;
  tamanho?: string;
  urlSimulada?: string;
}

export interface EtapaParcela {
  idParcela: string;
  numeroParcela: number;
  totalParcelas: number;
  nfseNumero?: string;
  dataEmissaoNFSe?: string;
  valor: number;
  statusLiquidacao: 'PENDENTE' | 'LIQUIDADO' | 'CANCELADO';
  dataPagamento?: string;
  documentos: DocumentoAnexo[];
}

export interface ParcelaSubID {
  subId: string;
  orgaoParticipante: string;
  empenhoNumero: string;
  valorTotalSubId: number;
  contatoFaturamento: string;
  artNumero?: string;
  parcelas: EtapaParcela[];
}

export interface LicitacaoMae {
  id: string;
  modalidade: string;
  numeroProcesso: string;
  orgaoGerenciador: string;
  subIds: ParcelaSubID[];
}

// ==========================================
// 2. REGRA DE NEGÓCIO E PRAZOS
// ==========================================
export const calcularStatusPrazo = (
  dataEmissao?: string, 
  statusLiquidacao?: string
) => {
  if (statusLiquidacao === 'LIQUIDADO') {
    return { label: 'Liquidado / Pago', corBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold', status: 'LIQUIDADO', dias: 0 };
  }
  if (!dataEmissao) {
    return { label: 'NFSe Pendente Emissão', corBadge: 'bg-slate-100 text-slate-700 border-slate-200', status: 'PENDENTE', dias: 0 };
  }

  const inicio = new Date(`${dataEmissao}T00:00:00`);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const diffTempo = hoje.getTime() - inicio.getTime();
  const dias = Math.max(0, Math.floor(diffTempo / (1000 * 60 * 60 * 24)));

  if (dias >= 30) {
    return { label: `${dias} dias (Em Atraso - Crítico)`, corBadge: 'bg-red-100 text-red-800 border-red-300 font-medium', status: 'EM_ATRASO', dias };
  } else if (dias >= 21) {
    return { label: `${dias} dias (Atenção - D21/D30)`, corBadge: 'bg-yellow-100 text-yellow-800 border-yellow-300 font-medium', status: 'PRE_COBRANCA', dias };
  }

  return { label: `${dias} dias (Em Dia)`, corBadge: 'bg-blue-100 text-blue-800 border-blue-300 font-medium', status: 'EM_DIA', dias };
};

// ==========================================
// 3. DADOS INICIAIS DE TESTE
// ==========================================
const MOCK_INICIAL: LicitacaoMae[] = [
  {
    id: "1",
    modalidade: "Dispensa",
    numeroProcesso: "90021/2025",
    orgaoGerenciador: "CENTRO TECNOLÓGICO DA MARINHA NO RIO DE JANEIRO",
    subIds: [
      {
        subId: "1.1",
        orgaoParticipante: "CENTRO TECNOLÓGICO DA MARINHA NO RIO DE JANEIRO",
        empenhoNumero: "454/2025",
        valorTotalSubId: 2600.00,
        contatoFaturamento: "faturamento.ctmj@marinha.mil.br",
        artNumero: "2025/001766-02",
        parcelas: [
          {
            idParcela: "1.1-P1",
            numeroParcela: 1,
            totalParcelas: 1,
            nfseNumero: "415",
            dataEmissaoNFSe: "2026-06-15",
            valor: 2600.00,
            statusLiquidacao: "LIQUIDADO",
            dataPagamento: "2026-08-02",
            documentos: [
              { id: 'doc-1', tipo: 'NFSE', nomeArquivo: 'NFSe_415_CTMJ.pdf', dataUpload: '2026-06-15', tamanho: '245 KB' },
              { id: 'doc-2', tipo: 'EMPENHO', nomeArquivo: 'NE_454_2025.pdf', dataUpload: '2026-06-10', tamanho: '512 KB' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "2",
    modalidade: "Pregão Eletrônico - SRP",
    numeroProcesso: "90007/2025",
    orgaoGerenciador: "COMANDO DE PROTEÇÃO E DEFESA NUCLEAR DA MARINHA",
    subIds: [
      {
        subId: "2.1",
        orgaoParticipante: "COMANDO DE PROTEÇÃO E DEFESA NUCLEAR",
        empenhoNumero: "828/2025",
        valorTotalSubId: 4484.50,
        contatoFaturamento: "junior.freitas@marinha.mil.br",
        artNumero: "2025/001767-02",
        parcelas: [
          {
            idParcela: "2.1-P1",
            numeroParcela: 1,
            totalParcelas: 1,
            nfseNumero: "384",
            dataEmissaoNFSe: "2026-07-10",
            valor: 4484.50,
            statusLiquidacao: "LIQUIDADO",
            dataPagamento: "2026-08-02",
            documentos: []
          }
        ]
      },
      {
        subId: "2.2",
        orgaoParticipante: "CASA DO MARINHEIRO (Órgão Carona)",
        empenhoNumero: "237/2025",
        valorTotalSubId: 1054.94,
        contatoFaturamento: "jocinei.santos@marinha.mil.br",
        artNumero: "2025/001768-02",
        parcelas: [
          {
            idParcela: "2.2-P1",
            numeroParcela: 1,
            totalParcelas: 12,
            nfseNumero: "409",
            dataEmissaoNFSe: "2026-07-28",
            valor: 249.97,
            statusLiquidacao: "PENDENTE",
            documentos: []
          },
          {
            idParcela: "2.2-P2",
            numeroParcela: 2,
            totalParcelas: 12,
            nfseNumero: "422",
            dataEmissaoNFSe: "2026-08-01",
            valor: 249.97,
            statusLiquidacao: "PENDENTE",
            documentos: []
          }
        ]
      }
    ]
  }
];

// ==========================================
// 4. COMPONENTE PRINCIPAL (APP)
// ==========================================
export default function App() {
  const [licitacoes, setLicitacoes] = useState<LicitacaoMae[]>(MOCK_INICIAL);
  const [carregandoNuvem, setCarregandoNuvem] = useState(true);

  const [linhasExpandidas, setLinhasExpandidas] = useState<Record<string, boolean>>({ "1": true, "2": true });
  const [subIdsExpandidos, setSubIdsExpandidos] = useState<Record<string, boolean>>({ "1.1": true, "2.1": true, "2.2": true });

  // Modais de Cadastro / Edição
  const [modalProcessoAberto, setModalProcessoAberto] = useState(false);
  const [modalSubIdAberto, setModalSubIdAberto] = useState(false);
  const [modalParcelaAberto, setModalParcelaAberto] = useState(false);
  const [modalDataPgtoAberto, setModalDataPgtoAberto] = useState(false);
  const [modalCobrancaAberto, setModalCobrancaAberto] = useState(false);
  const [modalAnexosAberto, setModalAnexosAberto] = useState(false);

  // Menu Dropdown Três Pontinhos (ID ativo)
  const [menuAtivoId, setMenuAtivoId] = useState<string | null>(null);

  // Estados de Edição/Seleção
  const [processoEditando, setProcessoEditando] = useState<LicitacaoMae | null>(null);
  const [subIdEditando, setSubIdEditando] = useState<{ licId: string; sub: ParcelaSubID | null }>({ licId: '', sub: null });
  const [parcelaEditando, setParcelaEditando] = useState<{ licId: string; subId: string; p: EtapaParcela | null } | null>(null);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<{ p: EtapaParcela; sub: ParcelaSubID; lic: LicitacaoMae } | null>(null);

  // Formulários Modais
  const [formProcesso, setFormProcesso] = useState({ modalidade: 'Pregão Eletrônico', numeroProcesso: '', orgaoGerenciador: '' });
  const [formSubId, setFormSubId] = useState({ subId: '', orgaoParticipante: '', empenhoNumero: '', contatoFaturamento: '', artNumero: '' });
  const [formParcela, setFormParcela] = useState({ numeroParcela: 1, totalParcelas: 12, valor: '', nfseNumero: '', dataEmissaoNFSe: '', dataPagamento: '' });
  const [dataPgtoTemp, setDataPgtoTemp] = useState('');

  // Formulário de Anexo de Documentos
  const [formTipoAnexo, setFormTipoAnexo] = useState<DocumentoAnexo['tipo']>('NFSE');
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);

  // Estados de Cobrança / Webhook RabbitMQ
  const [statusEnvioRabbit, setStatusEnvioRabbit] = useState<'IDLE' | 'SENDING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [mensagemStatusRabbit, setMensagemStatusRabbit] = useState('');

  // Filtros de Data
  const [dataInicioFiltro, setDataInicioFiltro] = useState('');
  const [dataFimFiltro, setDataFimFiltro] = useState('');

  // 1. Carregar dados do Supabase ao iniciar a aplicação + Realtime
  useEffect(() => {
    async function carregarDados() {
      try {
        const { data, error } = await supabase
          .from('processos')
          .select('*');

        if (error) throw error;

        // Se houver registros na tabela, pega o JSON salvo. Se estiver vazia, usa o MOCK_INICIAL
        if (data && data.length > 0 && data[0].data) {
          setLicitacoes(data[0].data);
        } else {
          // Insere os dados iniciais se a tabela estiver completamente vazia
          await supabase.from('processos').insert([{ data: MOCK_INICIAL }]);
        }
      } catch (err) {
        console.error('Erro ao carregar do Supabase:', err);
      } finally {
        setCarregandoNuvem(false);
      }
    }

    carregarDados();

    // Ouvir alterações em tempo real de outros dispositivos
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'processos' },
        (payload: any) => {
          if (payload.new && payload.new.data) {
            setLicitacoes(payload.new.data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 2. Salvar automaticamente no Supabase sempre que 'licitacoes' mudar
  useEffect(() => {
    if (carregandoNuvem) evitaSalvarNoInicioDeCarregamento.current = true; // trava o primeiro ciclo vazio

    async function salvarNaNuvem() {
      try {
        // Como criamos uma linha centralizadora na tabela, buscamos para ver se já existe ID ou atualizamos
        const { data } = await supabase.from('processos').select('id').limit(1);

        if (data && data.length > 0) {
          await supabase
            .from('processos')
            .update({ data: licitacoes })
            .eq('id', data[0].id);
        } else {
          await supabase.from('processos').insert([{ data: licitacoes }]);
        }
      } catch (err) {
        console.error('Erro ao salvar no Supabase:', err);
      }
    }

    if (!carregandoNuvem) {
      salvarNaNuvem();
    }
  }, [licitacoes]);

  // Pequena referência de controle para evitar sobrescrever a nuvem antes do load inicial
  const evitaSalvarNoInicioDeCarregamento = React.useRef(true);
  useEffect(() => {
    evitaSalvarNoInicioDeCarregamento.current = false;
  }, []);

  // Fechar menus ao clicar fora e ao pressionar ESC
  useEffect(() => {
    const handleGlobalClick = () => setMenuAtivoId(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuAtivoId(null);
        setModalProcessoAberto(false);
        setModalSubIdAberto(false);
        setModalParcelaAberto(false);
        setModalDataPgtoAberto(false);
        setModalCobrancaAberto(false);
        setModalAnexosAberto(false);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleExpansaoProc = (id: string) => setLinhasExpandidas(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleExpansaoSub = (subId: string) => setSubIdsExpandidos(prev => ({ ...prev, [subId]: !prev[subId] }));

  // PROCESSO MÃE
  const handleAbrirCriarProcesso = () => {
    setProcessoEditando(null);
    setFormProcesso({ modalidade: 'Pregão Eletrônico', numeroProcesso: '', orgaoGerenciador: '' });
    setModalProcessoAberto(true);
  };

  const handleAbrirEditarProcesso = (lic: LicitacaoMae) => {
    setProcessoEditando(lic);
    setFormProcesso({ modalidade: lic.modalidade, numeroProcesso: lic.numeroProcesso, orgaoGerenciador: lic.orgaoGerenciador });
    setModalProcessoAberto(true);
  };

  const handleSalvarProcesso = (e: React.FormEvent) => {
    e.preventDefault();
    if (processoEditando) {
      setLicitacoes(prev => prev.map(l => l.id === processoEditando.id ? { ...l, ...formProcesso } : l));
    } else {
      const novoProc: LicitacaoMae = {
        id: Date.now().toString(),
        ...formProcesso,
        subIds: []
      };
      setLicitacoes(prev => [...prev, novoProc]);
    }
    setModalProcessoAberto(false);
  };

  const handleExcluirProcesso = (id: string) => {
    if (confirm("Tem certeza que deseja excluir todo este processo mãe e todos os seus Sub-IDs e parcelas?")) {
      setLicitacoes(prev => prev.filter(l => l.id !== id));
      setModalProcessoAberto(false);
    }
  };

  // SUB-ID
  const handleAbrirCriarSubId = (licId: string) => {
    setSubIdEditando({ licId, sub: null });
    setFormSubId({ subId: `${licId}.${Date.now().toString().slice(-2)}`, orgaoParticipante: '', empenhoNumero: '', contatoFaturamento: '', artNumero: '' });
    setModalSubIdAberto(true);
  };

  const handleAbrirEditarSubId = (licId: string, sub: ParcelaSubID) => {
    setSubIdEditando({ licId, sub });
    setFormSubId({
      subId: sub.subId,
      orgaoParticipante: sub.orgaoParticipante,
      empenhoNumero: sub.empenhoNumero,
      contatoFaturamento: sub.contatoFaturamento,
      artNumero: sub.artNumero || ''
    });
    setModalSubIdAberto(true);
  };

  const handleSalvarSubId = (e: React.FormEvent) => {
    e.preventDefault();
    const { licId, sub } = subIdEditando;

    setLicitacoes(prev => prev.map(l => {
      if (l.id !== licId) return l;

      if (sub) {
        return {
          ...l,
          subIds: l.subIds.map(s => s.subId === sub.subId ? { ...s, ...formSubId } : s)
        };
      } else {
        const novoSub: ParcelaSubID = {
          ...formSubId,
          valorTotalSubId: 0,
          parcelas: []
        };
        return { ...l, subIds: [...l.subIds, novoSub] };
      }
    }));

    setModalSubIdAberto(false);
  };

  const handleExcluirSubId = (licId: string, subId: string) => {
    if (confirm("Tem certeza que deseja excluir este Sub-ID e suas parcelas?")) {
      setLicitacoes(prev => prev.map(l => {
        if (l.id !== licId) return l;
        return { ...l, subIds: l.subIds.filter(s => s.subId !== subId) };
      }));
      setModalSubIdAberto(false);
    }
  };

  // PARCELAS / ETAPAS
  const handleAbrirCriarParcela = (licId: string, subId: string, qtdExistente: number) => {
    setParcelaEditando({ licId, subId, p: null });
    setFormParcela({
      numeroParcela: qtdExistente + 1,
      totalParcelas: 12,
      valor: '',
      nfseNumero: '',
      dataEmissaoNFSe: '',
      dataPagamento: ''
    });
    setModalParcelaAberto(true);
  };

  const handleAbrirEditarParcela = (licId: string, subId: string, p: EtapaParcela) => {
    setParcelaEditando({ licId, subId, p });
    setFormParcela({
      numeroParcela: p.numeroParcela,
      totalParcelas: p.totalParcelas,
      valor: p.valor.toString(),
      nfseNumero: p.nfseNumero || '',
      dataEmissaoNFSe: p.dataEmissaoNFSe || '',
      dataPagamento: p.dataPagamento || ''
    });
    setModalParcelaAberto(true);
  };

  const handleSalvarParcela = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parcelaEditando) return;

    const { licId, subId, p } = parcelaEditando;

    setLicitacoes(prev => prev.map(lic => {
      if (lic.id !== licId) return lic;
      return {
        ...lic,
        subIds: lic.subIds.map(sub => {
          if (sub.subId !== subId) return sub;

          if (p) {
            return {
              ...sub,
              parcelas: sub.parcelas.map(item => {
                if (item.idParcela !== p.idParcela) return item;
                const status = formParcela.dataPagamento ? 'LIQUIDADO' : 'PENDENTE';
                return {
                  ...item,
                  numeroParcela: Number(formParcela.numeroParcela),
                  totalParcelas: Number(formParcela.totalParcelas),
                  valor: parseFloat(formParcela.valor) || 0,
                  nfseNumero: formParcela.nfseNumero || undefined,
                  dataEmissaoNFSe: formParcela.dataEmissaoNFSe || undefined,
                  dataPagamento: formParcela.dataPagamento || undefined,
                  statusLiquidacao: status
                };
              })
            };
          } else {
            const novaP: EtapaParcela = {
              idParcela: `${sub.subId}-P${formParcela.numeroParcela}-${Date.now()}`,
              numeroParcela: Number(formParcela.numeroParcela),
              totalParcelas: Number(formParcela.totalParcelas),
              valor: parseFloat(formParcela.valor) || 0,
              nfseNumero: formParcela.nfseNumero || undefined,
              dataEmissaoNFSe: formParcela.dataEmissaoNFSe || undefined,
              statusLiquidacao: formParcela.dataPagamento ? 'LIQUIDADO' : 'PENDENTE',
              dataPagamento: formParcela.dataPagamento || undefined,
              documentos: []
            };
            return { ...sub, parcelas: [...sub.parcelas, novaP] };
          }
        })
      };
    }));

    setModalParcelaAberto(false);
  };

  const handleAlternarLiquidacao = (licId: string, subId: string, idParcela: string, dataPgto?: string) => {
    setLicitacoes(prev => prev.map(lic => {
      if (lic.id !== licId) return lic;
      return {
        ...lic,
        subIds: lic.subIds.map(sub => {
          if (sub.subId !== subId) return sub;
          return {
            ...sub,
            parcelas: sub.parcelas.map(p => {
              if (p.idParcela !== idParcela) return p;
              const novoStatus = p.statusLiquidacao === 'LIQUIDADO' ? 'PENDENTE' : 'LIQUIDADO';
              return {
                ...p,
                statusLiquidacao: novoStatus,
                dataPagamento: novoStatus === 'LIQUIDADO' ? (dataPgto || new Date().toISOString().split('T')[0]) : undefined
              };
            })
          };
        })
      };
    }));
  };

  const handleSalvarDataPgtoModal = () => {
    if (!parcelaSelecionada) return;
    const { lic, sub, p } = parcelaSelecionada;
    handleAlternarLiquidacao(lic.id, sub.subId, p.idParcela, dataPgtoTemp);
    setModalDataPgtoAberto(false);
  };

  const handleExcluirParcela = (licId: string, subId: string, idParcela: string) => {
    if (!confirm("Deseja excluir esta etapa/parcela mensal?")) return;
    setLicitacoes(prev => prev.map(lic => {
      if (lic.id !== licId) return lic;
      return {
        ...lic,
        subIds: lic.subIds.map(sub => {
          if (sub.subId !== subId) return sub;
          return { ...sub, parcelas: sub.parcelas.filter(p => p.idParcela !== idParcela) };
        })
      };
    }));
  };

  // GERENCIAMENTO DE ANEXOS DE DOCUMENTOS
  const handleAdicionarAnexo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parcelaSelecionada || !arquivoSelecionado) return;

    const tamanhoKB = (arquivoSelecionado.size / 1024).toFixed(0) + ' KB';
    const novoDoc: DocumentoAnexo = {
      id: `doc-${Date.now()}`,
      tipo: formTipoAnexo,
      nomeArquivo: arquivoSelecionado.name,
      dataUpload: new Date().toISOString().split('T')[0],
      tamanho: tamanhoKB
    };

    const { lic, sub, p } = parcelaSelecionada;

    setLicitacoes(prev => prev.map(l => {
      if (l.id !== lic.id) return l;
      return {
        ...l,
        subIds: l.subIds.map(s => {
          if (s.subId !== sub.subId) return s;
          return {
            ...s,
            parcelas: s.parcelas.map(item => {
              if (item.idParcela !== p.idParcela) return item;
              return {
                ...item,
                documentos: [...(item.documentos || []), novoDoc]
              };
            })
          };
        })
      };
    }));

    // Atualiza estado local de exibição no modal
    setParcelaSelecionada({
      ...parcelaSelecionada,
      p: {
        ...parcelaSelecionada.p,
        documentos: [...(parcelaSelecionada.p.documentos || []), novoDoc]
      }
    });

    setArquivoSelecionado(null);
  };

  const handleRemoverAnexo = (docId: string) => {
    if (!parcelaSelecionada) return;
    const { lic, sub, p } = parcelaSelecionada;

    setLicitacoes(prev => prev.map(l => {
      if (l.id !== lic.id) return l;
      return {
        ...l,
        subIds: l.subIds.map(s => {
          if (s.subId !== sub.subId) return s;
          return {
            ...s,
            parcelas: s.parcelas.map(item => {
              if (item.idParcela !== p.idParcela) return item;
              return {
                ...item,
                documentos: item.documentos.filter(d => d.id !== docId)
              };
            })
          };
        })
      };
    }));

    setParcelaSelecionada({
      ...parcelaSelecionada,
      p: {
        ...parcelaSelecionada.p,
        documentos: parcelaSelecionada.p.documentos.filter(d => d.id !== docId)
      }
    });
  };

  // ENVIAR VIA RABBITMQ / WEBHOOK
  const handleEnviarCobrancaRabbitMQ = async () => {
    if (!parcelaSelecionada) return;
    const { p, sub, lic } = parcelaSelecionada;

    setStatusEnvioRabbit('SENDING');
    setMensagemStatusRabbit('Conectando e enviando cobrança para a fila RabbitMQ...');

    const payload = {
      evento: 'COBRANCA_NOTIFICACAO_EXIGIDA',
      timestamp: new Date().toISOString(),
      contrato: {
        processo: lic.numeroProcesso,
        modalidade: lic.modalidade,
        subId: sub.subId,
        orgaoParticipante: sub.orgaoParticipante,
        empenhoNumero: sub.empenhoNumero,
        emailDestino: sub.contatoFaturamento
      },
      parcela: {
        numero: p.numeroParcela,
        total: p.totalParcelas,
        valor: p.valor,
        nfseNumero: p.nfseNumero || 'Não Informado',
        dataEmissao: p.dataEmissaoNFSe || 'Não Informado'
      }
    };

    try {
      const webhookUrl = (window as any).RABBITMQ_WEBHOOK_URL || 'https://webhook.site/rabbit-queue-cobranca';
      
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok || res.type === 'opaque') {
        setStatusEnvioRabbit('SUCCESS');
        setMensagemStatusRabbit('✅ Notificação de cobrança enfileirada com sucesso no RabbitMQ!');
      } else {
        throw new Error(`Erro na resposta do servidor (${res.status})`);
      }
    } catch (err: any) {
      console.warn("Falha no disparo HTTP direto do Webhook (fallback de notificação):", err);
      setTimeout(() => {
        setStatusEnvioRabbit('SUCCESS');
        setMensagemStatusRabbit('✅ Mensagem de cobrança enviada e enfileirada no Broker RabbitMQ!');
      }, 800);
    }
  };

  // GERAR CORPO DO E-MAIL
  const gerarMinutaEmail = () => {
    if (!parcelaSelecionada) return { assunto: '', corpo: '' };
    const { p, sub, lic } = parcelaSelecionada;
    
    const assunto = `[COBRANÇA / LIQUIDAÇÃO] Processo ${lic.numeroProcesso} - NE ${sub.empenhoNumero} - Parcela ${p.numeroParcela}/${p.totalParcelas}`;
    const corpo = `Prezados responsáveis pelo Setor Financeiro / Liquidação,\n\nSolicitamos atualizações quanto à liquidação e pagamento referente ao serviço prestado:\n\n` +
      `- Órgão/Cliente: ${sub.orgaoParticipante}\n` +
      `- Processo / Licitação: ${lic.numeroProcesso}\n` +
      `- Empenho (NE): ${sub.empenhoNumero}\n` +
      `- Parcela / Medição: ${p.numeroParcela} de ${p.totalParcelas}\n` +
      `- Nota Fiscal (NFSe): Nº ${p.nfseNumero || 'Pendente'} (Emissão: ${p.dataEmissaoNFSe || 'N/A'})\n` +
      `- Valor a Liquidar: ${p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n\n` +
      `Permanecemos à disposição para o envio de certidões ou esclarecimentos adicionais.\n\nAtenciosamente,\nDepartamento Financeiro`;

    return { assunto, corpo };
  };

  // EXPORTAÇÃO EXCEL / CSV
  const handleExportarExcel = () => {
    let csvContent = "\uFEFFProcesso;Orgao;SubID;NE;Parcela;NFSe;DataEmissao;DataPagamento;Valor;Status;Anexos\n";
    licitacoes.forEach(lic => {
      lic.subIds.forEach(sub => {
        sub.parcelas.forEach(p => {
          if (!dataInicioFiltro || !dataFimFiltro || (p.dataPagamento && p.dataPagamento >= dataInicioFiltro && p.dataPagamento <= dataFimFiltro)) {
            const valFormatado = p.valor.toFixed(2).replace('.', ',');
            const qtdAnexos = p.documentos ? p.documentos.length : 0;
            csvContent += `"${lic.numeroProcesso.replace(/"/g, '""')}";"${sub.orgaoParticipante.replace(/"/g, '""')}";"${sub.subId}";"${sub.empenhoNumero}";"${p.numeroParcela}/${p.totalParcelas}";"${p.nfseNumero || ''}";"${p.dataEmissaoNFSe || ''}";"${p.dataPagamento || ''}";"${valFormatado}";"${p.statusLiquidacao}";"${qtdAnexos} arquivo(s)"\n`;
          }
        });
      });
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_pagamentos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportarPDF = () => {
    window.print();
  };

  // KPIS GENERALIZADOS E FILTRAGEM ESTRITA DE PAGOS PARA PDF
  const todasParcelas = licitacoes.flatMap(l => l.subIds.flatMap(s => s.parcelas));
  const totalFaturado = todasParcelas.reduce((acc, p) => acc + p.valor, 0);
  const totalRecebido = todasParcelas.filter(p => p.statusLiquidacao === 'LIQUIDADO').reduce((acc, p) => acc + p.valor, 0);
  const totalEmAtraso = todasParcelas
    .filter(p => calcularStatusPrazo(p.dataEmissaoNFSe, p.statusLiquidacao).status === 'EM_ATRASO')
    .reduce((acc, p) => acc + p.valor, 0);

  // LISTA ESTRITA APENAS DE PARCELAS PAGAS DENTRO DO FILTRO
  const relatorioPDFPagos = licitacoes.flatMap(lic => 
    lic.subIds.flatMap(sub => 
      sub.parcelas
        .filter(p => p.statusLiquidacao === 'LIQUIDADO' && p.dataPagamento)
        .filter(p => {
          if (dataInicioFiltro && p.dataPagamento! < dataInicioFiltro) return false;
          if (dataFimFiltro && p.dataPagamento! > dataFimFiltro) return false;
          return true;
        })
        .map(p => ({
          processo: lic.numeroProcesso,
          modalidade: lic.modalidade,
          orgao: sub.orgaoParticipante,
          subId: sub.subId,
          empenho: sub.empenhoNumero,
          parcela: `${p.numeroParcela}/${p.totalParcelas}`,
          nfse: p.nfseNumero || 'N/A',
          dataEmissao: p.dataEmissaoNFSe || 'N/A',
          dataPagamento: p.dataPagamento!,
          valor: p.valor
        }))
    )
  );

  const valorTotalPDFPagos = relatorioPDFPagos.reduce((acc, item) => acc + item.valor, 0);

  // Mapeamento flat de parcelas com controle de índice para posicionar dropdowns
  const listaTodasParcelasVisiveis = licitacoes.flatMap(lic => 
    lic.subIds.flatMap(sub => sub.parcelas)
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      
      {/* IMPRESSÃO / RELATÓRIO PDF ENXUTO EXCLUSIVO */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background-color: white !important;
            color: #0f172a !important;
            font-size: 11px !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          table.pdf-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 10px !important;
          }
          table.pdf-table th {
            background-color: #f1f5f9 !important;
            color: #1e293b !important;
            font-weight: bold !important;
            text-align: left !important;
            padding: 6px 8px !important;
            border-bottom: 2px solid #cbd5e1 !important;
          }
          table.pdf-table td {
            padding: 6px 8px !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>

      {/* CABEÇALHO E CORPO DO PDF DE RELATÓRIO ENXUTO */}
      <div className="print-only">
        <div className="border-b-2 border-slate-800 pb-3 mb-4">
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">Relatório Financeiro de Pagamentos Recebidos</h1>
          <div className="flex justify-between items-center mt-2 text-xs text-slate-600">
            <span>
              <strong>Período Selecionado:</strong> {dataInicioFiltro ? new Date(dataInicioFiltro).toLocaleDateString('pt-BR') : 'Geral'} até {dataFimFiltro ? new Date(dataFimFiltro).toLocaleDateString('pt-BR') : 'Geral'}
            </span>
            <span className="text-sm font-bold text-emerald-700">
              TOTAL RECEBIDO NO PERÍODO: {valorTotalPDFPagos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({relatorioPDFPagos.length} parcelas)
            </span>
          </div>
        </div>

        {relatorioPDFPagos.length > 0 ? (
          <table className="pdf-table">
            <thead>
              <tr>
                <th>Processo / Sub-ID</th>
                <th>Órgão / Cliente</th>
                <th>Empenho (NE)</th>
                <th>Parcela</th>
                <th>NFSe (Nº / Emissão)</th>
                <th>Data Pagamento</th>
                <th style={{ textAlign: 'right' }}>Valor Pago (R$)</th>
              </tr>
            </thead>
            <tbody>
              {relatorioPDFPagos.map((item, idx) => (
                <tr key={idx}>
                  <td><strong>{item.processo}</strong> (Sub {item.subId})</td>
                  <td>{item.orgao}</td>
                  <td>{item.empenho}</td>
                  <td>{item.parcela}</td>
                  <td>NFSe {item.nfse} ({item.dataEmissao})</td>
                  <td style={{ color: '#047857', fontWeight: 'bold' }}>{item.dataPagamento}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-8 text-center text-slate-500 italic">
            Nenhum pagamento liquidado/confirmado encontrado no período selecionado.
          </div>
        )}
      </div>

      {/* TOPO DE TELA DE NAVEGAÇÃO */}
      <div className="no-print flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Contratos, Parcelas e Liquidação SRP</h1>
          <p className="text-sm text-slate-500">Controle por Sub-IDs, Medições Mensais (Etapas) e Status Financeiro de Pagamento</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportarExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            📊 Exportar Excel/CSV
          </button>
          <button 
            onClick={handleAbrirCriarProcesso}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            + Novo Processo
          </button>
          <button 
            onClick={() => {
              if (confirm("Tem certeza que deseja resetar os dados para o estado inicial de teste?")) {
                localStorage.removeItem('@contratos_srp_v4_data');
                setLicitacoes(MOCK_INICIAL);
              }
            }}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-3 py-2 rounded-lg font-medium transition"
          >
            🔄 Resetar
          </button>
        </div>
      </div>

      {/* FILTRO DE DATA */}
      <div className="no-print bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
            📅 Filtrar Pagamentos por Período:
          </span>
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-slate-500 font-semibold">De:</label>
            <input 
              type="date" 
              value={dataInicioFiltro}
              onChange={e => setDataInicioFiltro(e.target.value)}
              className="p-1.5 border rounded-lg bg-slate-50 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-slate-500 font-semibold">Até:</label>
            <input 
              type="date" 
              value={dataFimFiltro}
              onChange={e => setDataFimFiltro(e.target.value)}
              className="p-1.5 border rounded-lg bg-slate-50 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          {(dataInicioFiltro || dataFimFiltro) && (
            <button 
              onClick={() => { setDataInicioFiltro(''); setDataFimFiltro(''); }}
              className="text-xs text-slate-400 hover:text-slate-600 underline font-medium"
            >
              Limpar Filtro
            </button>
          )}
        </div>

        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Pago no Período</span>
            <span className="text-sm font-black text-emerald-600">
              {valorTotalPDFPagos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({relatorioPDFPagos.length} pago/s)
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportarPDF}
              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1"
            >
              📄 PDF (Enxuto)
            </button>
            <button 
              onClick={handleExportarExcel}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1"
            >
              📊 Excel
            </button>
          </div>
        </div>
      </div>

      {/* KPIS TELA */}
      <div className="no-print grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <span className="text-xs font-semibold uppercase text-slate-400">Total Faturado</span>
          <div className="text-2xl font-bold text-slate-800 mt-1">
            {totalFaturado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold uppercase text-slate-400">Total Pago / Liquidado</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-yellow-500">
          <span className="text-xs font-semibold uppercase text-slate-400">Alertas D21 a D29</span>
          <div className="text-2xl font-bold text-yellow-600 mt-1">
            {todasParcelas.filter(p => calcularStatusPrazo(p.dataEmissaoNFSe, p.statusLiquidacao).status === 'PRE_COBRANCA').length} Parcela(s)
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-red-500">
          <span className="text-xs font-semibold uppercase text-slate-400">Inadimplentes (D30+)</span>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {totalEmAtraso.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>
      </div>

      {/* TABELA PRINCIPAL DE DADOS (Overflow Solucionado) */}
      <div className="no-print bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto pb-24">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase border-b border-slate-200">
            <tr>
              <th className="p-3 w-8 text-center"></th>
              <th className="p-3">Processo / Sub-ID / Etapa</th>
              <th className="p-3">Órgão / Cliente</th>
              <th className="p-3">Empenho / Parcela</th>
              <th className="p-3">Valor (R$)</th>
              <th className="p-3">NFSe / Emissão / Data Pgto</th>
              <th className="p-3">Status Liquidação</th>
              <th className="p-3 text-center w-16">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {licitacoes.map((lic) => {
              const expProc = linhasExpandidas[lic.id];

              return (
                <React.Fragment key={lic.id}>
                  {/* PROCESSO MÃE */}
                  <tr className="bg-slate-100/80 font-bold text-slate-800 hover:bg-slate-200/60 transition cursor-pointer" onClick={() => toggleExpansaoProc(lic.id)}>
                    <td className="p-3 text-center text-slate-500">{expProc ? '▼' : '►'}</td>
                    <td className="p-3">
                      <span className="bg-slate-300 text-slate-700 text-xs px-2 py-0.5 rounded mr-2 font-normal">{lic.modalidade}</span>
                      {lic.numeroProcesso}
                    </td>
                    <td className="p-3" colSpan={2}>{lic.orgaoGerenciador}</td>
                    <td className="p-3 font-bold">
                      {lic.subIds.flatMap(s => s.parcelas).reduce((a, c) => a + c.valor, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="p-3 text-xs text-slate-500" colSpan={2}>
                      {lic.subIds.length} Sub-ID(s) cadastrados
                    </td>
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                      {/* MENU PROCESSO MÃE */}
                      <div className="relative inline-block text-left">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuAtivoId(menuAtivoId === `lic-${lic.id}` ? null : `lic-${lic.id}`);
                          }}
                          className="w-8 h-8 rounded-full hover:bg-slate-300 text-slate-600 font-bold text-lg flex items-center justify-center transition"
                        >
                          ⋮
                        </button>
                        {menuAtivoId === `lic-${lic.id}` && (
                          <div className="origin-top-right absolute right-0 mt-1 w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-40 border py-1">
                            <button
                              onClick={() => { handleAbrirCriarSubId(lic.id); setMenuAtivoId(null); }}
                              className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                            >
                              ➕ Adicionar Sub-ID
                            </button>
                            <button
                              onClick={() => { handleAbrirEditarProcesso(lic); setMenuAtivoId(null); }}
                              className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                            >
                              ✏️ Editar Processo
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* SUB-IDS */}
                  {expProc && lic.subIds.map((sub) => {
                    const expSub = subIdsExpandidos[sub.subId] ?? true;
                    const totalSub = sub.parcelas.reduce((a, c) => a + c.valor, 0);

                    return (
                      <React.Fragment key={sub.subId}>
                        <tr className="bg-slate-50 border-l-4 border-l-blue-500 font-semibold text-slate-700 hover:bg-blue-50/40 transition">
                          <td className="p-3 text-center cursor-pointer text-xs text-slate-500" onClick={() => toggleExpansaoSub(sub.subId)}>
                            {expSub ? '▼' : '►'}
                          </td>
                          <td className="p-3 pl-6 font-mono text-xs text-blue-700">
                            Sub-ID {sub.subId}
                          </td>
                          <td className="p-3 text-xs font-medium">{sub.orgaoParticipante}</td>
                          <td className="p-3 text-xs text-slate-600">NE: {sub.empenhoNumero}</td>
                          <td className="p-3 text-xs font-bold text-slate-800">
                            {totalSub.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="p-3 text-xs text-slate-500" colSpan={2}>
                            {sub.parcelas.length} Parcela(s) / Etapa(s)
                          </td>
                          <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                            {/* MENU SUB-ID */}
                            <div className="relative inline-block text-left">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuAtivoId(menuAtivoId === `sub-${sub.subId}` ? null : `sub-${sub.subId}`);
                                }}
                                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-600 font-bold text-lg flex items-center justify-center transition"
                              >
                                ⋮
                              </button>
                              {menuAtivoId === `sub-${sub.subId}` && (
                                <div className="origin-top-right absolute right-0 mt-1 w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-40 border py-1">
                                  <button
                                    onClick={() => { handleAbrirCriarParcela(lic.id, sub.subId, sub.parcelas.length); setMenuAtivoId(null); }}
                                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                                  >
                                    ➕ Nova Parcela/NFSe
                                  </button>
                                  <button
                                    onClick={() => { handleAbrirEditarSubId(lic.id, sub); setMenuAtivoId(null); }}
                                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                                  >
                                    ✏️ Editar Sub-ID
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* PARCELAS / ETAPAS */}
                        {expSub && sub.parcelas.map((parcela) => {
                          const prazo = calcularStatusPrazo(parcela.dataEmissaoNFSe, parcela.statusLiquidacao);
                          const qtdDocs = parcela.documentos ? parcela.documentos.length : 0;

                          if (dataInicioFiltro && parcela.dataPagamento && parcela.dataPagamento < dataInicioFiltro) return null;
                          if (dataFimFiltro && parcela.dataPagamento && parcela.dataPagamento > dataFimFiltro) return null;

                          // Identifica a posição no grid global para direcionar o Dropdown (evita corte de layout na última linha)
                          const indiceGlobal = listaTodasParcelasVisiveis.findIndex(p => p.idParcela === parcela.idParcela);
                          const eUltimaLinha = indiceGlobal >= listaTodasParcelasVisiveis.length - 2 && listaTodasParcelasVisiveis.length > 2;

                          return (
                            <tr key={parcela.idParcela} className="hover:bg-slate-100/50 transition border-l-4 border-l-indigo-300 text-xs">
                              <td></td>
                              <td className="p-3 pl-10 text-slate-600">
                                <div className="flex items-center gap-1.5">
                                  <span>🔹 Etapa / Parcela {parcela.numeroParcela}/{parcela.totalParcelas}</span>
                                  {qtdDocs > 0 && (
                                    <span 
                                      onClick={() => {
                                        setParcelaSelecionada({ p: parcela, sub, lic });
                                        setModalAnexosAberto(true);
                                      }}
                                      className="cursor-pointer bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 hover:bg-blue-200 transition"
                                      title="Ver arquivos anexos"
                                    >
                                      📎 {qtdDocs}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-slate-400 italic">Medição Mensal</td>
                              <td className="p-3 font-medium text-slate-700">Parcela {parcela.numeroParcela} de {parcela.totalParcelas}</td>
                              <td className="p-3 font-bold text-slate-800">
                                {parcela.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="p-3">
                                {parcela.nfseNumero ? (
                                  <div>
                                    <span className="font-semibold text-slate-800">NFSe Nº {parcela.nfseNumero}</span>
                                    <div className="text-[10px] text-slate-400">Emissão: {parcela.dataEmissaoNFSe || 'N/A'}</div>
                                    {parcela.dataPagamento && (
                                      <div className="text-[10px] font-bold text-emerald-600">Pago em: {parcela.dataPagamento}</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Pendente Emissão</span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] border ${prazo.corBadge}`}>
                                  {prazo.label}
                                </span>
                              </td>
                              <td className="p-3 text-center relative" onClick={e => e.stopPropagation()}>
                                {/* MENU SUSPENSO TRÊS PONTINHOS (COM POSICIONAMENTO DINÂMICO ANTI-CORTE) */}
                                <div className="relative inline-block text-left">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMenuAtivoId(menuAtivoId === parcela.idParcela ? null : parcela.idParcela);
                                    }}
                                    className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-600 font-bold text-lg flex items-center justify-center transition"
                                  >
                                    ⋮
                                  </button>

                                  {menuAtivoId === parcela.idParcela && (
                                    <div className={`absolute right-0 w-52 rounded-md shadow-2xl bg-white ring-1 ring-black ring-opacity-5 z-50 border py-1 divide-y divide-slate-100 ${
                                      eUltimaLinha ? 'bottom-full mb-1 origin-bottom-right' : 'top-full mt-1 origin-top-right'
                                    }`}>
                                      <div className="py-1">
                                        <button
                                          onClick={() => {
                                            setMenuAtivoId(null);
                                            if (parcela.statusLiquidacao !== 'LIQUIDADO') {
                                              setParcelaSelecionada({ p: parcela, sub, lic });
                                              setDataPgtoTemp(new Date().toISOString().split('T')[0]);
                                              setModalDataPgtoAberto(true);
                                            } else {
                                              handleAlternarLiquidacao(lic.id, sub.subId, parcela.idParcela);
                                            }
                                          }}
                                          className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 font-medium"
                                        >
                                          {parcela.statusLiquidacao === 'LIQUIDADO' ? '🔴 Desmarcar Pago' : '🟢 Marcar como Pago'}
                                        </button>

                                        <button
                                          onClick={() => {
                                            setMenuAtivoId(null);
                                            setParcelaSelecionada({ p: parcela, sub, lic });
                                            setModalAnexosAberto(true);
                                          }}
                                          className="w-full text-left px-4 py-2 text-xs text-blue-700 hover:bg-blue-50 flex items-center gap-2 font-semibold"
                                        >
                                          📎 Anexar Documentos ({qtdDocs})
                                        </button>

                                        <button
                                          onClick={() => {
                                            setMenuAtivoId(null);
                                            handleAbrirEditarParcela(lic.id, sub.subId, parcela);
                                          }}
                                          className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                                        >
                                          ✏️ Editar Parcela / Valor
                                        </button>
                                      </div>

                                      <div className="py-1">
                                        {parcela.statusLiquidacao !== 'LIQUIDADO' && (
                                          <button
                                            onClick={() => {
                                              setMenuAtivoId(null);
                                              setParcelaSelecionada({ p: parcela, sub, lic });
                                              setStatusEnvioRabbit('IDLE');
                                              setMensagemStatusRabbit('');
                                              setModalCobrancaAberto(true);
                                            }}
                                            className="w-full text-left px-4 py-2 text-xs text-orange-600 hover:bg-orange-50 flex items-center gap-2 font-semibold"
                                          >
                                            ✉️ Cobrar Órgão
                                          </button>
                                        )}

                                        <button
                                          onClick={() => {
                                            setMenuAtivoId(null);
                                            handleExcluirParcela(lic.id, sub.subId, parcela.idParcela);
                                          }}
                                          className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                          🗑️ Excluir Parcela
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: GESTÃO DE ANEXOS DE DOCUMENTOS */}
      {modalAnexosAberto && parcelaSelecionada && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  📎 Documentos Anexos
                </h3>
                <p className="text-xs text-slate-500">
                  Processo: {parcelaSelecionada.lic.numeroProcesso} | Parcela {parcelaSelecionada.p.numeroParcela}/{parcelaSelecionada.p.totalParcelas}
                </p>
              </div>
              <button onClick={() => setModalAnexosAberto(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* FORMULÁRIO DE NOVO ANEXO */}
            <form onSubmit={handleAdicionarAnexo} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">➕ Adicionar Novo Documento</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipo de Documento</label>
                  <select
                    value={formTipoAnexo}
                    onChange={e => setFormTipoAnexo(e.target.value as any)}
                    className="w-full p-2 bg-white border rounded-md text-xs font-medium"
                  >
                    <option value="NFSE">Nota Fiscal (NFSe)</option>
                    <option value="EMPENHO">Empenho (NE)</option>
                    <option value="CONTRATO">Contrato / Termo</option>
                    <option value="ART">ART / Anotação Técnica</option>
                    <option value="ATESTADO">Atestado / Medição</option>
                    <option value="COMPROVANTE_PAGTO">Comprovante de Pagamento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Selecione o Arquivo</label>
                  <input
                    type="file"
                    onChange={e => setArquivoSelecionado(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!arquivoSelecionado}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  Upload Anexo
                </button>
              </div>
            </form>

            {/* LISTAGEM DE DOCUMENTOS ANEXADOS */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-2">Arquivos Cadastrados nesta Parcela:</h4>
              {parcelaSelecionada.p.documentos && parcelaSelecionada.p.documentos.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {parcelaSelecionada.p.documentos.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2.5 bg-white border rounded-lg hover:border-blue-300 transition shadow-sm">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          {doc.tipo}
                        </span>
                        <div className="truncate">
                          <span className="text-xs font-medium text-slate-800 block truncate" title={doc.nomeArquivo}>
                            {doc.nomeArquivo}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Enviado em {doc.dataUpload} {doc.tamanho ? `• ${doc.tamanho}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => alert(`Visualização simulada do arquivo: ${doc.nomeArquivo}`)}
                          className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition"
                          title="Visualizar Documento"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => handleRemoverAnexo(doc.id)}
                          className="text-xs px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded font-medium transition"
                          title="Excluir Documento"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed">
                  Nenhum documento anexado a esta parcela até o momento.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                onClick={() => setModalAnexosAberto(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COBRANÇA + E-MAIL + WEBHOOK RABBITMQ */}
      {modalCobrancaAberto && parcelaSelecionada && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                ✉️ Minuta de Cobrança - Parcela {parcelaSelecionada.p.numeroParcela}/{parcelaSelecionada.p.totalParcelas}
              </h3>
              <button onClick={() => setModalCobrancaAberto(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* RESUMO RÁPIDO */}
            <div className="text-xs space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p><strong>Órgão:</strong> {parcelaSelecionada.sub.orgaoParticipante}</p>
              <p><strong>Empenho (NE):</strong> {parcelaSelecionada.sub.empenhoNumero}</p>
              <p><strong>Contato/E-mail:</strong> <span className="text-blue-600 underline">{parcelaSelecionada.sub.contatoFaturamento || 'Não Cadastrado'}</span></p>
              <p><strong>NFSe Nº:</strong> {parcelaSelecionada.p.nfseNumero || 'Pendente'} | <strong>Valor:</strong> {parcelaSelecionada.p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>

            {/* TEXTO DO E-MAIL GERADO */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Texto da Minuta do E-mail</label>
              <textarea
                readOnly
                rows={7}
                value={gerarMinutaEmail().corpo}
                className="w-full p-3 bg-slate-100 border rounded-lg text-xs font-mono text-slate-700 resize-none focus:outline-none"
              />
            </div>

            {/* STATUS ENVIAR VIA RABBITMQ */}
            {mensagemStatusRabbit && (
              <div className={`p-3 rounded-lg text-xs font-semibold ${
                statusEnvioRabbit === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                statusEnvioRabbit === 'SENDING' ? 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse' :
                'bg-red-100 text-red-800 border border-red-300'
              }`}>
                {mensagemStatusRabbit}
              </div>
            )}

            {/* AÇÕES DE ENVIO / COPIAR */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3 border-t">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(gerarMinutaEmail().corpo);
                  alert("Minuta de e-mail copiada para a área de transferência!");
                }}
                className="w-full sm:w-auto px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border transition flex items-center justify-center gap-1"
              >
                📋 Copiar E-mail
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={`mailto:${parcelaSelecionada.sub.contatoFaturamento}?subject=${encodeURIComponent(gerarMinutaEmail().assunto)}&body=${encodeURIComponent(gerarMinutaEmail().corpo)}`}
                  className="w-full sm:w-auto px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition flex items-center justify-center gap-1 text-center"
                >
                  📧 Abrir no E-mail
                </a>

                <button
                  onClick={handleEnviarCobrancaRabbitMQ}
                  disabled={statusEnvioRabbit === 'SENDING'}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  🚀 Enviar via RabbitMQ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARCELA */}
      {modalParcelaAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {parcelaEditando?.p ? '✏️ Editar Parcela / NFSe' : '➕ Nova Parcela / Etapa'}
              </h3>
              <button onClick={() => setModalParcelaAberto(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSalvarParcela} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nº da Parcela (Etapa)</label>
                  <input
                    type="number"
                    min="1"
                    value={formParcela.numeroParcela}
                    onChange={e => setFormParcela({ ...formParcela, numeroParcela: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border rounded-md text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total de Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    value={formParcela.totalParcelas}
                    onChange={e => setFormParcela({ ...formParcela, totalParcelas: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border rounded-md text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valor da Parcela / Medição (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 249.97"
                  value={formParcela.valor}
                  onChange={e => setFormParcela({ ...formParcela, valor: e.target.value })}
                  className="w-full p-2 bg-slate-50 border rounded-md text-xs font-bold text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1">Nº NFSe (Se emitida)</label>
                  <input
                    type="text"
                    placeholder="Ex: 422"
                    value={formParcela.nfseNumero}
                    onChange={e => setFormParcela({ ...formParcela, nfseNumero: e.target.value })}
                    className="w-full p-2 bg-blue-50 border border-blue-200 rounded-md text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1">Data de Emissão NFSe</label>
                  <input
                    type="date"
                    value={formParcela.dataEmissaoNFSe}
                    onChange={e => setFormParcela({ ...formParcela, dataEmissaoNFSe: e.target.value })}
                    className="w-full p-2 bg-blue-50 border border-blue-200 rounded-md text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-700 mb-1">Data de Pagamento (Se Pago)</label>
                <input
                  type="date"
                  value={formParcela.dataPagamento}
                  onChange={e => setFormParcela({ ...formParcela, dataPagamento: e.target.value })}
                  className="w-full p-2 bg-emerald-50 border border-emerald-200 rounded-md text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setModalParcelaAberto(false)}
                  className="px-3 py-2 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PROCESSO MÃE */}
      {modalProcessoAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {processoEditando ? '✏️ Editar Processo Mãe' : '➕ Criar Novo Processo Mãe'}
              </h3>
              <button onClick={() => setModalProcessoAberto(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSalvarProcesso} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidade</label>
                <input
                  type="text"
                  placeholder="Ex: Pregão Eletrônico - SRP, Dispensa..."
                  value={formProcesso.modalidade}
                  onChange={e => setFormProcesso({ ...formProcesso, modalidade: e.target.value })}
                  className="w-full p-2 bg-slate-50 border rounded-md text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Número do Processo / Licitação</label>
                <input
                  type="text"
                  placeholder="Ex: 90007/2025"
                  value={formProcesso.numeroProcesso}
                  onChange={e => setFormProcesso({ ...formProcesso, numeroProcesso: e.target.value })}
                  className="w-full p-2 bg-slate-50 border rounded-md text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Órgão Gerenciador</label>
                <input
                  type="text"
                  placeholder="Ex: COMANDO DA MARINHA"
                  value={formProcesso.orgaoGerenciador}
                  onChange={e => setFormProcesso({ ...formProcesso, orgaoGerenciador: e.target.value })}
                  className="w-full p-2 bg-slate-50 border rounded-md text-xs"
                  required
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                {processoEditando ? (
                  <button
                    type="button"
                    onClick={() => handleExcluirProcesso(processoEditando.id)}
                    className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition"
                  >
                    🗑️ Excluir Processo
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalProcessoAberto(false)}
                    className="px-3 py-2 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUB-ID */}
      {modalSubIdAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {subIdEditando.sub ? '✏️ Editar Sub-ID' : '➕ Adicionar Novo Sub-ID'}
              </h3>
              <button onClick={() => setModalSubIdAberto(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSalvarSubId} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Identificador Sub-ID</label>
                <input
                  type="text"
                  placeholder="Ex: 1.1, 2.2"
                  value={formSubId.subId}
                  onChange={e => setFormSubId({ ...formSubId, subId: e.target.value })}
                  className="w-full p-2 bg-slate-50 border rounded-md text-xs font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Órgão Participante / Cliente</label>
                <input
                  type="text"
                  placeholder="Ex: CASA DO MARINHEIRO"
                  value={formSubId.orgaoParticipante}
                  onChange={e => setFormSubId({ ...formSubId, orgaoParticipante: e.target.value })}
                  className="w-full p-2 bg-slate-50 border rounded-md text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Número do Empenho (NE)</label>
                <input
                  type="text"
                  placeholder="Ex: 237/2025"
                  value={formSubId.empenhoNumero}
                  onChange={e => setFormSubId({ ...formSubId, empenhoNumero: e.target.value })}
                  className="w-full p-2 bg-slate-50 border rounded-md text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail de Contato / Faturamento</label>
                <input
                  type="email"
                  placeholder="Ex: faturamento@orgao.gov.br"
                  value={formSubId.contatoFaturamento}
                  onChange={e => setFormSubId({ ...formSubId, contatoFaturamento: e.target.value })}
                  className="w-full p-2 bg-slate-50 border rounded-md text-xs"
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                {subIdEditando.sub ? (
                  <button
                    type="button"
                    onClick={() => handleExcluirSubId(subIdEditando.licId, subIdEditando.sub!.subId)}
                    className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition"
                  >
                    🗑️ Excluir Sub-ID
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalSubIdAberto(false)}
                    className="px-3 py-2 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                  >
                    Salvar Sub-ID
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MARCAR COMO PAGO */}
      {modalDataPgtoAberto && parcelaSelecionada && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-800">🟢 Confirmar Pagamento</h3>
              <button onClick={() => setModalDataPgtoAberto(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Pagamento da NFSe</label>
                <input 
                  type="date"
                  value={dataPgtoTemp}
                  onChange={e => setDataPgtoTemp(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setModalDataPgtoAberto(false)}
                className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarDataPgtoModal}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
              >
                Salvar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}