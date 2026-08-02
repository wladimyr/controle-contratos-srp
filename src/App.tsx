import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, Search, FileText, Calendar, Building, DollarSign, 
  CheckCircle, AlertTriangle, Clock, Trash2, Edit2, ChevronRight, 
  Paperclip, Shield, BarChart2, Layers, Download, Upload, RefreshCw, X
} from 'lucide-react';

// --- TIPOS ---
export interface Medicao {
  id: string;
  numeroParcela: number;
  mesCompetencia: string;
  valor: number;
  status: 'Pendente' | 'Medido' | 'Faturado' | 'Pago';
  dataVencimentoNf?: string;
  numeroNf?: string;
  observacoes?: string;
  anexos?: { nome: string; url: string }[];
}

export interface SubContrato {
  id: string;
  subId: string;
  secretariaOrgao: string;
  objetoEspecifico: string;
  numeroContratoMae: string;
  valorTotal: number;
  dataAssinatura: string;
  vigenciaMeses: number;
  dataInicioVigencia: string;
  dataFimVigencia: string;
  gestorContrato: string;
  fiscalContrato: string;
  medicoes: Medicao[];
}

export interface LicitacaoMae {
  id: string;
  numeroProcesso: string;
  modalidade: string;
  numeroLicitacao: string;
  ano: string;
  objetoGeral: string;
  orgaoGerenciador: string;
  ataRegistroPrecos: string;
  dataAssinaturaAta: string;
  validadeAta: string;
  subContratos: SubContrato[];
}

// --- DADOS INICIAIS (MOCK) ---
const MOCK_INICIAL: LicitacaoMae[] = [
  {
    id: '1',
    numeroProcesso: '027/2025',
    modalidade: 'Pregão Eletrônico - SRP',
    numeroLicitacao: '002/2025',
    ano: '2025',
    objetoGeral: 'Registro de preços visando eventual e futura contratação de empresa especializada em prestação de serviços contínuos.',
    orgaoGerenciador: 'Prefeitura Municipal',
    ataRegistroPrecos: 'ARP 012/2025',
    dataAssinaturaAta: '2025-12-10',
    validadeAta: '2026-12-10',
    subContratos: [
      {
        id: 'sub-1',
        subId: '01/2025',
        secretariaOrgao: 'Secretaria de Educação',
        objetoEspecifico: 'Prestação de serviços para unidades escolares da rede municipal.',
        numeroContratoMae: 'CT 045/2025',
        valorTotal: 120000.00,
        dataAssinatura: '2025-12-15',
        vigenciaMeses: 12,
        dataInicioVigencia: '2025-12-15',
        dataFimVigencia: '2026-12-15',
        gestorContrato: 'Carlos Silva',
        fiscalContrato: 'Maria Oliveira',
        medicoes: [
          {
            id: 'med-1',
            numeroParcela: 1,
            mesCompetencia: 'Janeiro/2026',
            valor: 10000.00,
            status: 'Pago',
            dataVencimentoNf: '2026-02-10',
            numeroNf: '1420',
            observacoes: 'Liquidado conforme medição.'
          },
          {
            id: 'med-2',
            numeroParcela: 2,
            mesCompetencia: 'Fevereiro/2026',
            valor: 10000.00,
            status: 'Faturado',
            dataVencimentoNf: '2026-03-10',
            numeroNf: '1435',
            observacoes: 'Aguardando compensação bancária.'
          }
        ]
      }
    ]
  }
];

export default function App() {
  const [licitacoes, setLicitacoes] = useState<LicitacaoMae[]>(MOCK_INICIAL);
  const [carregandoNuvem, setCarregandoNuvem] = useState(true);
  const [erroSincronizacao, setErroSincronizacao] = useState<string | null>(null);

  // Navegação e Filtros
  const [abaAtiva, setAbaAtiva] = useState<'dashboard' | 'licitacoes' | 'subcontratos' | 'medicoes'>('dashboard');
  const [busca, setBusca] = useState('');
  
  // Modais
  const [modalLicitacaoOpen, setModalLicitacaoOpen] = useState(false);
  const [licitacaoEmEdicao, setLicitacaoEmEdicao] = useState<LicitacaoMae | null>(null);

  const [modalSubContratoOpen, setModalSubContratoOpen] = useState(false);
  const [subContratoEmEdicao, setSubContratoEmEdicao] = useState<SubContrato | null>(null);
  const [licitacaoMaeIdParaSub, setLicitacaoMaeIdParaSub] = useState<string>('');

  const [modalMedicaoOpen, setModalMedicaoOpen] = useState(false);
  const [medicaoEmEdicao, setMedicaoEmEdicao] = useState<Medicao | null>(null);
  const [subContratoIdParaMedicao, setSubContratoIdParaMedicao] = useState<string>('');
  const [licitacaoMaeIdParaMedicao, setLicitacaoMaeIdParaMedicao] = useState<string>('');

  const evitaSalvarNoInicioDeCarregamento = useRef(true);

  // 1. Carregar dados do Supabase
  useEffect(() => {
    async function carregarDados() {
      try {
        setErroSincronizacao(null);
        const { data, error } = await supabase.from('processos').select('*');

        if (error) throw error;

        if (data && data.length > 0 && data[0].data) {
          setLicitacoes(data[0].data);
        } else {
          await supabase.from('processos').insert([{ data: MOCK_INICIAL }]);
        }
      } catch (err: any) {
        console.error('Erro ao carregar do Supabase:', err);
        setErroSincronizacao('Erro ao conectar com o banco de dados na nuvem.');
      } finally {
        setCarregandoNuvem(false);
      }
    }

    carregarDados();

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

  // 2. Salvar automaticamente no Supabase
  useEffect(() => {
    if (evitaSalvarNoInicioDeCarregamento.current) {
      evitaSalvarNoInicioDeCarregamento.current = false;
      return;
    }

    async function salvarNaNuvem() {
      try {
        const { data, error: selectError } = await supabase.from('processos').select('id').limit(1);
        if (selectError) throw selectError;

        if (data && data.length > 0) {
          const { error: updateError } = await supabase
            .from('processos')
            .update({ data: licitacoes })
            .eq('id', data[0].id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase.from('processos').insert([{ data: licitacoes }]);
          if (insertError) throw insertError;
        }
      } catch (err) {
        console.error('Erro ao salvar no Supabase:', err);
      }
    }

    if (!carregandoNuvem) {
      salvarNaNuvem();
    }
  }, [licitacoes, carregandoNuvem]);

  // Busca Filtrada
  const licitacoesFiltradas = licitacoes.filter(lic => {
    const termo = busca.toLowerCase();
    const termoEmMae = 
      lic.numeroProcesso?.toLowerCase().includes(termo) ||
      lic.modalidade?.toLowerCase().includes(termo) ||
      lic.objetoGeral?.toLowerCase().includes(termo) ||
      lic.ataRegistroPrecos?.toLowerCase().includes(termo) ||
      lic.orgaoGerenciador?.toLowerCase().includes(termo);

    const termoEmSub = lic.subContratos.some(sub => 
      sub.subId?.toLowerCase().includes(termo) ||
      sub.secretariaOrgao?.toLowerCase().includes(termo) ||
      sub.objetoEspecifico?.toLowerCase().includes(termo) ||
      sub.numeroContratoMae?.toLowerCase().includes(termo) ||
      sub.gestorContrato?.toLowerCase().includes(termo) ||
      sub.fiscalContrato?.toLowerCase().includes(termo)
    );

    const termoEmMedicao = lic.subContratos.some(sub =>
      sub.medicoes.some(med => 
        med.mesCompetencia?.toLowerCase().includes(termo) ||
        med.numeroNf?.toLowerCase().includes(termo) ||
        med.observacoes?.toLowerCase().includes(termo) ||
        med.status?.toLowerCase().includes(termo)
      )
    );

    return termoEmMae || termoEmSub || termoEmMedicao;
  });

  // Funções CRUD Licitação
  const handleSalvarLicitacao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const novaLicitacao: LicitacaoMae = {
      id: licitacaoEmEdicao ? licitacaoEmEdicao.id : Date.now().toString(),
      numeroProcesso: formData.get('numeroProcesso') as string,
      modalidade: formData.get('modalidade') as string,
      numeroLicitacao: formData.get('numeroLicitacao') as string,
      ano: formData.get('ano') as string,
      objetoGeral: formData.get('objetoGeral') as string,
      orgaoGerenciador: formData.get('orgaoGerenciador') as string,
      ataRegistroPrecos: formData.get('ataRegistroPrecos') as string,
      dataAssinaturaAta: formData.get('dataAssinaturaAta') as string,
      validadeAta: formData.get('validadeAta') as string,
      subContratos: licitacaoEmEdicao ? licitacaoEmEdicao.subContratos : []
    };

    if (licitacaoEmEdicao) {
      setLicitacoes(licitacoes.map(l => l.id === licitacaoEmEdicao.id ? novaLicitacao : l));
    } else {
      setLicitacoes([novaLicitacao, ...licitacoes]);
    }

    setModalLicitacaoOpen(false);
    setLicitacaoEmEdicao(null);
  };

  const excluirLicitacao = (id: string) => {
    if (confirm('Excluir esta licitação e seus subcontratos?')) {
      setLicitacoes(licitacoes.filter(l => l.id !== id));
    }
  };

  // Funções CRUD Subcontrato
  const handleSalvarSubContrato = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const novoSub: SubContrato = {
      id: subContratoEmEdicao ? subContratoEmEdicao.id : Date.now().toString(),
      subId: formData.get('subId') as string,
      secretariaOrgao: formData.get('secretariaOrgao') as string,
      objetoEspecifico: formData.get('objetoEspecifico') as string,
      numeroContratoMae: formData.get('numeroContratoMae') as string,
      valorTotal: parseFloat(formData.get('valorTotal') as string) || 0,
      dataAssinatura: formData.get('dataAssinatura') as string,
      vigenciaMeses: parseInt(formData.get('vigenciaMeses') as string) || 12,
      dataInicioVigencia: formData.get('dataInicioVigencia') as string,
      dataFimVigencia: formData.get('dataFimVigencia') as string,
      gestorContrato: formData.get('gestorContrato') as string,
      fiscalContrato: formData.get('fiscalContrato') as string,
      medicoes: subContratoEmEdicao ? subContratoEmEdicao.medicoes : []
    };

    setLicitacoes(licitacoes.map(lic => {
      if (lic.id === licitacaoMaeIdParaSub) {
        const subsAtualizados = subContratoEmEdicao
          ? lic.subContratos.map(s => s.id === subContratoEmEdicao.id ? novoSub : s)
          : [...lic.subContratos, novoSub];
        return { ...lic, subContratos: subsAtualizados };
      }
      return lic;
    }));

    setModalSubContratoOpen(false);
    setSubContratoEmEdicao(null);
  };

  const excluirSubContrato = (licId: string, subId: string) => {
    if (confirm('Excluir este subcontrato?')) {
      setLicitacoes(licitacoes.map(lic => {
        if (lic.id === licId) {
          return { ...lic, subContratos: lic.subContratos.filter(s => s.id !== subId) };
        }
        return lic;
      }));
    }
  };

  // Funções CRUD Medição
  const handleSalvarMedicao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const novaMedicao: Medicao = {
      id: medicaoEmEdicao ? medicaoEmEdicao.id : Date.now().toString(),
      numeroParcela: parseInt(formData.get('numeroParcela') as string) || 1,
      mesCompetencia: formData.get('mesCompetencia') as string,
      valor: parseFloat(formData.get('valor') as string) || 0,
      status: formData.get('status') as any,
      dataVencimentoNf: formData.get('dataVencimentoNf') as string,
      numeroNf: formData.get('numeroNf') as string,
      observacoes: formData.get('observacoes') as string,
      anexos: medicaoEmEdicao ? medicaoEmEdicao.anexos : []
    };

    setLicitacoes(licitacoes.map(lic => {
      if (lic.id === licitacaoMaeIdParaMedicao) {
        const subsAtualizados = lic.subContratos.map(sub => {
          if (sub.id === subContratoIdParaMedicao) {
            const medicoesAtualizadas = medicaoEmEdicao
              ? sub.medicoes.map(m => m.id === medicaoEmEdicao.id ? novaMedicao : m)
              : [...sub.medicoes, novaMedicao];
            return { ...sub, medicoes: medicoesAtualizadas };
          }
          return sub;
        });
        return { ...lic, subContratos: subsAtualizados };
      }
      return lic;
    }));

    setModalMedicaoOpen(false);
    setMedicaoEmEdicao(null);
  };

  const excluirMedicao = (licId: string, subId: string, medId: string) => {
    if (confirm('Excluir esta medição?')) {
      setLicitacoes(licitacoes.map(lic => {
        if (lic.id === licId) {
          const subsAtualizados = lic.subContratos.map(sub => {
            if (sub.id === subId) {
              return { ...sub, medicoes: sub.medicoes.filter(m => m.id !== medId) };
            }
            return sub;
          });
          return { ...lic, subContratos: subsAtualizados };
        }
        return lic;
      }));
    }
  };

  // Indicadores
  const totalLicitacoes = licitacoes.length;
  const totalSubContratos = licitacoes.reduce((acc, l) => acc + l.subContratos.length, 0);
  const valorTotalContratado = licitacoes.reduce((acc, l) => 
    acc + l.subContratos.reduce((sum, s) => sum + s.valorTotal, 0), 0
  );

  const todasMedicoes = licitacoes.flatMap(l => l.subContratos.flatMap(s => s.medicoes));
  const valorTotalFaturadoRecebido = todasMedicoes
    .filter(m => m.status === 'Faturado' || m.status === 'Pago')
    .reduce((acc, m) => acc + m.valor, 0);

  if (carregandoNuvem) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
        <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-lg font-medium">Sincronizando com o Supabase...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {erroSincronizacao && (
        <div className="bg-amber-500/10 border-l-4 border-amber-500 text-amber-200 px-4 py-3 m-4 rounded shadow">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-amber-400" />
            <span className="font-semibold">Aviso:</span> {erroSincronizacao}
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-600/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Gestão de Contratos e Licitações SRP
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-normal">
                Nuvem Ativa (Supabase)
              </span>
            </h1>
            <p className="text-xs text-slate-400">Controle integrado de atas, subcontratos, medições e prazos de NFS-e</p>
          </div>
        </div>

        {/* NAVEGAÇÃO / ABAS */}
        <nav className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setAbaAtiva('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              abaAtiva === 'dashboard' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => setAbaAtiva('licitacoes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              abaAtiva === 'licitacoes' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" /> Licitações / Atas
          </button>
          <button
            onClick={() => setAbaAtiva('subcontratos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              abaAtiva === 'subcontratos' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-4 h-4" /> Subcontratos
          </button>
          <button
            onClick={() => setAbaAtiva('medicoes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              abaAtiva === 'medicoes' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" /> Medições & NFS-e
          </button>
        </nav>
      </header>

      {/* BARRA DE PESQUISA */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por processo, ata, órgão, NF, subcontrato ou observação..."
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-slate-500"
          />
          {busca && (
            <button onClick={() => setBusca('')} className="text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* DASHBOARD */}
        {abaAtiva === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Licitações Mães / Atas</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{totalLicitacoes}</h3>
                  </div>
                  <div className="bg-blue-500/10 text-blue-400 p-3 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Subcontratos Ativos</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{totalSubContratos}</h3>
                  </div>
                  <div className="bg-indigo-500/10 text-indigo-400 p-3 rounded-xl">
                    <Building className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Valor Total Contratado</p>
                    <h3 className="text-2xl font-bold text-white mt-1">
                      {valorTotalContratado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Faturado / Recebido</p>
                    <h3 className="text-2xl font-bold text-white mt-1">
                      {valorTotalFaturadoRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                  </div>
                  <div className="bg-amber-500/10 text-amber-400 p-3 rounded-xl">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-500" /> Licitações Cadastradas Recentes
                </h3>
                <div className="space-y-3">
                  {licitacoesFiltradas.slice(0, 3).map(lic => (
                    <div key={lic.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">Proc. {lic.numeroProcesso}</span>
                        <h4 className="font-medium text-sm text-white mt-1">{lic.modalidade} - Ata: {lic.ataRegistroPrecos}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{lic.objetoGeral}</p>
                      </div>
                      <button 
                        onClick={() => setAbaAtiva('licitacoes')}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-500" /> Próximas Medições Pendentes
                </h3>
                <div className="space-y-3">
                  {todasMedicoes.filter(m => m.status === 'Pendente').length === 0 ? (
                    <p className="text-sm text-slate-400">Nenhuma medição pendente no momento.</p>
                  ) : (
                    todasMedicoes.filter(m => m.status === 'Pendente').slice(0, 3).map(med => (
                      <div key={med.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 flex justify-between items-center">
                        <div>
                          <span className="text-xs font-semibold px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">Parcela {med.numeroParcela}</span>
                          <h4 className="font-medium text-sm text-white mt-1">Competência: {med.mesCompetencia}</h4>
                          <p className="text-xs text-emerald-400 font-semibold mt-1">
                            {med.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                        <span className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                          Pendente
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LICITAÇÕES / ATAS */}
        {abaAtiva === 'licitacoes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Processos Licitatórios e Atas (SRP)</h2>
                <p className="text-xs text-slate-400">Gerencie as licitações mãe e atas de registro de preços vigentes.</p>
              </div>
              <button
                onClick={() => {
                  setLicitacaoEmEdicao(null);
                  setModalLicitacaoOpen(true);
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/30 transition"
              >
                <Plus className="w-4 h-4" /> Nova Licitação / Ata
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {licitacoesFiltradas.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
                  Nenhuma licitação encontrada.
                </div>
              ) : (
                licitacoesFiltradas.map(lic => (
                  <div key={lic.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-blue-500/20 text-blue-400 text-xs px-2.5 py-1 rounded font-semibold">
                            Processo nº {lic.numeroProcesso}
                          </span>
                          <span className="bg-purple-500/20 text-purple-400 text-xs px-2.5 py-1 rounded font-semibold">
                            {lic.modalidade}
                          </span>
                          <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded font-semibold">
                            Ata: {lic.ataRegistroPrecos}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mt-2">{lic.objetoGeral}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setLicitacaoMaeIdParaSub(lic.id);
                            setSubContratoEmEdicao(null);
                            setModalSubContratoOpen(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar Subcontrato
                        </button>
                        <button
                          onClick={() => {
                            setLicitacaoEmEdicao(lic);
                            setModalLicitacaoOpen(true);
                          }}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => excluirLicitacao(lic.id)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">Subcontratos Vinculados ({lic.subContratos.length})</h4>
                      {lic.subContratos.length === 0 ? (
                        <p className="text-xs text-slate-500 italic bg-slate-950 p-3 rounded-lg">Nenhum subcontrato cadastrado.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {lic.subContratos.map(sub => (
                            <div key={sub.id} className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-mono">
                                    Sub-ID: {sub.subId}
                                  </span>
                                  <h5 className="font-semibold text-sm text-white mt-1">{sub.secretariaOrgao}</h5>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      setLicitacaoMaeIdParaMedicao(lic.id);
                                      setSubContratoIdParaMedicao(sub.id);
                                      setMedicaoEmEdicao(null);
                                      setModalMedicaoOpen(true);
                                    }}
                                    className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded transition"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setLicitacaoMaeIdParaSub(lic.id);
                                      setSubContratoEmEdicao(sub);
                                      setModalSubContratoOpen(true);
                                    }}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => excluirSubContrato(lic.id, sub.id)}
                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-slate-400">{sub.objetoEspecifico}</p>
                              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-900">
                                <span className="text-emerald-400 font-bold">
                                  {sub.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                                <span className="text-slate-400">Medições: {sub.medicoes.length}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SUBCONTRATOS */}
        {abaAtiva === 'subcontratos' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Todos os Subcontratos</h2>
              <p className="text-xs text-slate-400">Visão geral e controle de vigência dos subcontratos.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Sub-ID / Contrato</th>
                      <th className="px-6 py-4">Órgão / Secretaria</th>
                      <th className="px-6 py-4">Objeto</th>
                      <th className="px-6 py-4">Valor Total</th>
                      <th className="px-6 py-4">Vigência Fim</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {licitacoesFiltradas.flatMap(l => l.subContratos.map(s => ({ ...s, licId: l.id }))).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-6 text-center text-slate-500">Nenhum subcontrato encontrado.</td>
                      </tr>
                    ) : (
                      licitacoesFiltradas.flatMap(l => l.subContratos.map(s => ({ ...s, licId: l.id }))).map(sub => (
                        <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-6 py-4 font-mono font-medium text-white">
                            {sub.subId} <br/>
                            <span className="text-xs text-slate-500">{sub.numeroContratoMae}</span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-white">{sub.secretariaOrgao}</td>
                          <td className="px-6 py-4 text-xs text-slate-400 max-w-xs truncate">{sub.objetoEspecifico}</td>
                          <td className="px-6 py-4 text-emerald-400 font-bold">
                            {sub.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="px-6 py-4">{sub.dataFimVigencia}</td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setLicitacaoMaeIdParaSub(sub.licId);
                                setSubContratoEmEdicao(sub);
                                setModalSubContratoOpen(true);
                              }}
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => excluirSubContrato(sub.licId, sub.id)}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MEDIÇÕES & NFS-E */}
        {abaAtiva === 'medicoes' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Controle de Medições & Prazos NFS-e</h2>
              <p className="text-xs text-slate-400">Acompanhe faturamentos e notas fiscais emitidas.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Parcela / Competência</th>
                      <th className="px-6 py-4">Nº NF & Vencimento</th>
                      <th className="px-6 py-4">Valor</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Observações</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {licitacoesFiltradas.flatMap(l => l.subContratos.flatMap(s => s.medicoes)).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-6 text-center text-slate-500">Nenhuma medição registrada.</td>
                      </tr>
                    ) : (
                      licitacoesFiltradas.flatMap(l => l.subContratos.flatMap(s => s.medicoes.map(m => ({ ...m, licId: l.id, subId: s.id })))).map(med => (
                        <tr key={med.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-6 py-4 font-medium text-white">
                            Parcela {med.numeroParcela} <br/>
                            <span className="text-xs text-slate-400">{med.mesCompetencia}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-white">NF: {med.numeroNf || 'N/D'}</span><br/>
                            <span className="text-xs text-slate-400">Venc: {med.dataVencimentoNf || 'N/D'}</span>
                          </td>
                          <td className="px-6 py-4 text-emerald-400 font-bold">
                            {med.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                              med.status === 'Pago' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              med.status === 'Faturado' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              med.status === 'Medido' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {med.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">{med.observacoes || '-'}</td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setLicitacaoMaeIdParaMedicao(med.licId);
                                setSubContratoIdParaMedicao(med.subId);
                                setMedicaoEmEdicao(med);
                                setModalMedicaoOpen(true);
                              }}
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => excluirMedicao(med.licId, med.subId, med.id)}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL LICITAÇÃO */}
      {modalLicitacaoOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {licitacaoEmEdicao ? 'Editar Licitação / Ata' : 'Nova Licitação / Ata'}
              </h3>
              <button onClick={() => setModalLicitacaoOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarLicitacao} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Número do Processo</label>
                  <input required name="numeroProcesso" defaultValue={licitacaoEmEdicao?.numeroProcesso} placeholder="Ex: 027/2025" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Modalidade</label>
                  <input required name="modalidade" defaultValue={licitacaoEmEdicao?.modalidade} placeholder="Ex: Pregão Eletrônico - SRP" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Número da Licitação</label>
                  <input name="numeroLicitacao" defaultValue={licitacaoEmEdicao?.numeroLicitacao} placeholder="Ex: 002/2025" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Ano</label>
                  <input name="ano" defaultValue={licitacaoEmEdicao?.ano} placeholder="Ex: 2025" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Objeto Geral</label>
                <textarea required name="objetoGeral" rows={2} defaultValue={licitacaoEmEdicao?.objetoGeral} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Ata de Registro de Preços</label>
                  <input name="ataRegistroPrecos" defaultValue={licitacaoEmEdicao?.ataRegistroPrecos} placeholder="Ex: ARP 012/2025" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assinatura da Ata</label>
                  <input type="date" name="dataAssinaturaAta" defaultValue={licitacaoEmEdicao?.dataAssinaturaAta} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Validade da Ata</label>
                  <input type="date" name="validadeAta" defaultValue={licitacaoEmEdicao?.validadeAta} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalLicitacaoOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow transition">Salvar Licitação</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUBCONTRATO */}
      {modalSubContratoOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {subContratoEmEdicao ? 'Editar Subcontrato' : 'Novo Subcontrato'}
              </h3>
              <button onClick={() => setModalSubContratoOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarSubContrato} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Sub-ID (Ex: 01/2026)</label>
                  <input required name="subId" defaultValue={subContratoEmEdicao?.subId} placeholder="Ex: 01/2026" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Órgão / Secretaria</label>
                  <input required name="secretariaOrgao" defaultValue={subContratoEmEdicao?.secretariaOrgao} placeholder="Ex: Secretaria de Educação" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nº do Contrato Vinculado</label>
                  <input name="numeroContratoMae" defaultValue={subContratoEmEdicao?.numeroContratoMae} placeholder="Ex: CT 045/2025" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Valor Total (R$)</label>
                  <input required type="number" step="0.01" name="valorTotal" defaultValue={subContratoEmEdicao?.valorTotal} placeholder="0.00" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Objeto Específico</label>
                <textarea required name="objetoEspecifico" rows={2} defaultValue={subContratoEmEdicao?.objetoEspecifico} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Início da Vigência</label>
                  <input type="date" name="dataInicioVigencia" defaultValue={subContratoEmEdicao?.dataInicioVigencia} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fim da Vigência</label>
                  <input type="date" name="dataFimVigencia" defaultValue={subContratoEmEdicao?.dataFimVigencia} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Meses de Vigência</label>
                  <input type="number" name="vigenciaMeses" defaultValue={subContratoEmEdicao?.vigenciaMeses || 12} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Gestor do Contrato</label>
                  <input name="gestorContrato" defaultValue={subContratoEmEdicao?.gestorContrato} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fiscal do Contrato</label>
                  <input name="fiscalContrato" defaultValue={subContratoEmEdicao?.fiscalContrato} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalSubContratoOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow transition">Salvar Subcontrato</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MEDIÇÃO */}
      {modalMedicaoOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {medicaoEmEdicao ? 'Editar Medição / Parcela' : 'Nova Medição / Parcela'}
              </h3>
              <button onClick={() => setModalMedicaoOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarMedicao} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Número da Parcela</label>
                  <input required type="number" name="numeroParcela" defaultValue={medicaoEmEdicao?.numeroParcela || 1} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Mês de Competência</label>
                  <input required name="mesCompetencia" defaultValue={medicaoEmEdicao?.mesCompetencia} placeholder="Ex: Março/2026" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Valor da Medição (R$)</label>
                  <input required type="number" step="0.01" name="valor" defaultValue={medicaoEmEdicao?.valor} placeholder="0.00" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select name="status" defaultValue={medicaoEmEdicao?.status || 'Pendente'} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                    <option value="Pendente">Pendente</option>
                    <option value="Medido">Medido</option>
                    <option value="Faturado">Faturado</option>
                    <option value="Pago">Pago</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Número da NFS-e</label>
                  <input name="numeroNf" defaultValue={medicaoEmEdicao?.numeroNf} placeholder="Ex: 1450" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Vencimento da NFS-e</label>
                  <input type="date" name="dataVencimentoNf" defaultValue={medicaoEmEdicao?.dataVencimentoNf} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Observações</label>
                <textarea name="observacoes" rows={2} defaultValue={medicaoEmEdicao?.observacoes} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalMedicaoOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow transition">Salvar Medição</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}