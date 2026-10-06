import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Alert, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Switch, RefreshControl, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './supabase';
import Auth from './Auth';

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [abaAtual, setAbaAtual] = useState('dashboard'); 
  
  const dataHoje = new Date();
  const mesAtualHoje = `${(dataHoje.getMonth() + 1).toString().padStart(2, '0')}/${dataHoje.getFullYear()}`;
  
  const [mesSelecionado, setMesSelecionado] = useState(mesAtualHoje);
  const [menuAberto, setMenuAberto] = useState(false);
  const [temNotificacao, setTemNotificacao] = useState(false);
  const [menuAdicionarVisivel, setMenuAdicionarVisivel] = useState(false);
  const [modalMesVisivel, setModalMesVisivel] = useState(false);
  const [anoTemp, setAnoTemp] = useState(dataHoje.getFullYear());

  const [refreshing, setRefreshing] = useState(false);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});

  const [perfilNome, setPerfilNome] = useState('Dinho');
  const [perfilEmail, setPerfilEmail] = useState('');
  const [modalEditarPerfilVisivel, setModalEditarPerfilVisivel] = useState(false);
  const [modalSegurancaVisivel, setModalSegurancaVisivel] = useState(false);
  const [biometriaAtiva, setBiometriaAtiva] = useState(false);
  const [anoVisaoAnual, setAnoVisaoAnual] = useState(dataHoje.getFullYear());
  const [metas, setMetas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [transacoes, setTransacoes] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) { setPerfilEmail(session.user.email || ''); carregarDadosNuvem(session.user.id); }
      setLoadingSession(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) { setPerfilEmail(session.user.email || ''); carregarDadosNuvem(session.user.id); }
    });

    carregarConfiguracoesLocais();
    return () => authListener?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const corFundo = isDarkMode ? '#0F172A' : '#FAFAFA';
      document.body.style.backgroundColor = corFundo;
      let metaThemeColor = document.querySelector("meta[name=theme-color]");
      if (!metaThemeColor) {
        metaThemeColor = document.createElement("meta");
        metaThemeColor.name = "theme-color";
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute("content", isDarkMode ? '#1E293B' : '#FFFFFF');
    }
  }, [isDarkMode]);

  const carregarConfiguracoesLocais = async () => {
    try {
      const temaSalvo = await AsyncStorage.getItem('@temaEscuro');
      const nomeSalvo = await AsyncStorage.getItem('@perfilNome');
      const categoriasSalvas = await AsyncStorage.getItem('@categorias');
      const metasSalvas = await AsyncStorage.getItem('@metas');

      if (temaSalvo !== null) setIsDarkMode(JSON.parse(temaSalvo));
      if (nomeSalvo) setPerfilNome(nomeSalvo);
      if (metasSalvas) setMetas(JSON.parse(metasSalvas));

      if (categoriasSalvas) { setCategorias(JSON.parse(categoriasSalvas)); } 
      else {
        setCategorias([
          { id: '1', nome: 'Alimentação', cor: '#F59E0B' }, { id: '2', nome: 'Moradia', cor: '#3B82F6' },
          { id: '3', nome: 'Cartão de Crédito', cor: '#8B5CF6' }, { id: '4', nome: 'Família', cor: '#10B981' },
          { id: '5', nome: 'Namorada', cor: '#EC4899' }, { id: '6', nome: 'Amigos', cor: '#14B8A6' },
          { id: '7', nome: 'Lazer', cor: '#F43F5E' }, { id: '8', nome: 'Saúde', cor: '#06B6D4' },
          { id: '9', nome: 'Renda', cor: '#10B981' }, { id: '10', nome: 'Outros', cor: '#64748B' }
        ]);
      }
    } catch (e) { console.log(e); }
  };

  const carregarDadosNuvem = async (userId) => {
    try {
      const { data, error } = await supabase.from('transacoes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (data && !error) {
        setTransacoes(data.map(t => ({ id: t.id, descricao: t.descricao, valor: Number(t.valor), tipo: t.tipo, categoria: t.categoria, modalidade: t.modalidade, dataCompra: t.data_compra, dataVencimento: t.data_vencimento, fixado: t.fixado })));
      }
    } catch (e) { console.log(e); }
  };

  const toggleTema = async () => { const novoTema = !isDarkMode; setIsDarkMode(novoTema); try { await AsyncStorage.setItem('@temaEscuro', JSON.stringify(novoTema)); } catch (e) { } };
  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); setTransacoes([]); };
  const atualizarCategorias = async (novas) => { setCategorias(novas); try { await AsyncStorage.setItem('@categorias', JSON.stringify(novas)); } catch (e) { } };
  const atualizarMetas = async (novas) => { setMetas(novas); try { await AsyncStorage.setItem('@metas', JSON.stringify(novas)); } catch (e) { } };

  const [modalNovaMetaVisivel, setModalNovaMetaVisivel] = useState(false);
  const [idEditandoMeta, setIdEditandoMeta] = useState(null);
  const [novaMetaTitulo, setNovaMetaTitulo] = useState('');
  const [novaMetaAlvo, setNovaMetaAlvo] = useState('');
  const [novaMetaValorAtual, setNovaMetaValorAtual] = useState('');
  const [novaMetaCategoria, setNovaMetaCategoria] = useState('Outros');
  const [novaMetaModalidade, setNovaMetaModalidade] = useState('a_vista');
  const [novaMetaMeioPagamento, setNovaMetaMeioPagamento] = useState('Pix');
  const [novaMetaQtdParcelas, setNovaMetaQtdParcelas] = useState('2');
  const [novaMetaOrigemConta, setNovaMetaOrigemConta] = useState('Conta Corrente');
  const [novaMetaDataAlvo, setNovaMetaDataAlvo] = useState('');
  const meiosPagamento = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Boleto'];
  const contasOrigem = ['Conta Corrente', 'Nubank', 'Itaú', 'Inter', 'Outros'];

  const [modalDepositarVisivel, setModalDepositarVisivel] = useState(false);
  const [metaSelecionada, setMetaSelecionada] = useState(null);
  const [valorDeposito, setValorDeposito] = useState('');
  const [origemDeposito, setOrigemDeposito] = useState('carteira');

  const [modalCategoriasVisivel, setModalCategoriasVisivel] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [novaCategoriaCor, setNovaCategoriaCor] = useState('#3B82F6');
  const coresDisponiveis = ['#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#EC4899', '#14B8A6', '#F43F5E', '#06B6D4', '#EAB308', '#64748B', '#000000'];

  const [modalVisivel, setModalVisivel] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [novoTipo, setNovoTipo] = useState('saida');
  const [novaModalidade, setNovaModalidade] = useState('a_vista');
  const [qtdParcelas, setQtdParcelas] = useState('2');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaCategoriaForm, setNovaCategoriaForm] = useState('Alimentação'); 
  const [novoValor, setNovoValor] = useState('');
  const [novaDataCompra, setNovaDataCompra] = useState('');
  const [novaDataVencimento, setNovaDataVencimento] = useState('');

  const [calendarioVisivel, setCalendarioVisivel] = useState(false);
  const [campoDataAtivo, setCampoDataAtivo] = useState('compra'); 
  const [calMes, setCalMes] = useState(dataHoje.getMonth() + 1);
  const [calAno, setCalAno] = useState(dataHoje.getFullYear());

  const nomesMeses = { '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril', '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto', '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro' };
  const mesesAbreviados = [{ num: 1, nome: 'Jan' }, { num: 2, nome: 'Fev' }, { num: 3, nome: 'Mar' }, { num: 4, nome: 'Abr' }, { num: 5, nome: 'Mai' }, { num: 6, nome: 'Jun' }, { num: 7, nome: 'Jul' }, { num: 8, nome: 'Ago' }, { num: 9, nome: 'Set' }, { num: 10, nome: 'Out' }, { num: 11, nome: 'Nov' }, { num: 12, nome: 'Dez' }];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (session?.user) { carregarDadosNuvem(session.user.id).then(() => setRefreshing(false)); } else { setRefreshing(false); }
  }, [session]);

  const styles = dynamicStyles(isDarkMode);
  const iconColor = isDarkMode ? "#F8FAFC" : "#1E293B";

  const transacoesDoMes = transacoes.filter(t => {
    const dataAlvo = t.dataVencimento || t.dataCompra;
    if (!dataAlvo) return true;
    const partes = dataAlvo.split('/');
    if (partes.length === 3) return `${partes[1]}/${partes[2]}` === mesSelecionado;
    return true;
  });

  const transacoesOrdenadasDoMes = [...transacoesDoMes].sort((a, b) => { if (a.fixado && !b.fixado) return -1; if (!a.fixado && b.fixado) return 1; return 0; });
  const receitas = transacoesDoMes.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + t.valor, 0);
  const despesas = transacoesDoMes.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + t.valor, 0);
  const saldo = receitas - despesas;
  const porcentagemDespesa = receitas > 0 ? (despesas / receitas) * 100 : (despesas > 0 ? 100 : 0);
  const porcentagemLimitada = Math.min(porcentagemDespesa, 100);
  const mesAtualNome = nomesMeses[mesSelecionado.split('/')[0]];
  const anoAtual = mesSelecionado.split('/')[1];

  const calcularDespesasPorCategoria = () => {
    let mapaCategorias = {};
    transacoesDoMes.forEach(t => {
      if (t.tipo === 'saida') {
        if (!mapaCategorias[t.categoria]) mapaCategorias[t.categoria] = 0;
        mapaCategorias[t.categoria] += t.valor;
      }
    });
    return Object.keys(mapaCategorias).map(cat => ({ nome: cat, total: mapaCategorias[cat], porcentagem: despesas > 0 ? ((mapaCategorias[cat] / despesas) * 100) : 0 })).sort((a, b) => b.total - a.total);
  };
  const despesasAgrupadas = calcularDespesasPorCategoria();

  const gerarDadosAnuais = (ano) => {
    let dados = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map(m => ({ mes: m, receitas: 0, despesas: 0 }));
    transacoes.forEach(t => {
      const dataAlvo = t.dataVencimento || t.dataCompra;
      if (!dataAlvo) return;
      const partes = dataAlvo.split('/');
      if (partes.length === 3 && parseInt(partes[2], 10) === ano) {
        const mesIndex = parseInt(partes[1], 10) - 1;
        if (t.tipo === 'entrada') dados[mesIndex].receitas += t.valor;
        else if (t.tipo === 'saida') dados[mesIndex].despesas += t.valor;
      }
    });
    return dados;
  };

  const mudarMes = (direcao) => {
    let [mes, ano] = mesSelecionado.split('/'); let mesNum = parseInt(mes, 10); let anoNum = parseInt(ano, 10);
    if (direcao === 'voltar') { mesNum -= 1; if (mesNum === 0) { mesNum = 12; anoNum -= 1; } } 
    else { mesNum += 1; if (mesNum === 13) { mesNum = 1; anoNum += 1; } }
    setMesSelecionado(`${mesNum.toString().padStart(2, '0')}/${anoNum}`);
  };

  const abrirSeletorMes = () => { setAnoTemp(parseInt(anoAtual)); setModalMesVisivel(true); };
  const escolherMes = (mesNum) => { setMesSelecionado(`${mesNum.toString().padStart(2, '0')}/${anoTemp}`); setModalMesVisivel(false); };
  const abrirCalendario = (campo) => { 
    setCampoDataAtivo(campo); let dataReferencia = campo === 'meta_alvo' ? novaMetaDataAlvo : novaDataCompra;
    const partes = dataReferencia.split('/');
    if (partes.length === 3) { setCalMes(parseInt(partes[1], 10)); setCalAno(parseInt(partes[2], 10)); }
    setCalendarioVisivel(true); 
  };
  const selecionarDia = (dia) => {
    const dataFormatada = `${dia.toString().padStart(2, '0')}/${calMes.toString().padStart(2, '0')}/${calAno}`;
    if (campoDataAtivo === 'meta_alvo') setNovaMetaDataAlvo(dataFormatada);
    else if (campoDataAtivo === 'compra') { setNovaDataCompra(dataFormatada); if (!novaDataVencimento || novoTipo === 'entrada') setNovaDataVencimento(dataFormatada); } 
    else setNovaDataVencimento(dataFormatada); 
    setCalendarioVisivel(false);
  };
  const arrayDias = Array.from({ length: new Date(calAno, calMes, 0).getDate() }, (_, i) => i + 1);

  const escolherTipoTransacao = (tipo) => {
    const hoje = new Date(); const df = `${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;
    setNovoTipo(tipo); setNovaCategoriaForm(tipo === 'entrada' ? 'Renda' : 'Cartão de Crédito'); setNovaDataCompra(df); setNovaDataVencimento(df); 
    setMenuAdicionarVisivel(false); setTimeout(() => { setModalVisivel(true); }, 150);
  };
  const fecharModal = () => { setModalVisivel(false); setIdEditando(null); setNovaDescricao(''); setNovoValor(''); setNovaModalidade('a_vista'); setQtdParcelas('2'); setNovoTipo('saida'); setNovaCategoriaForm('Cartão de Crédito'); setCalendarioVisivel(false); };
  const abrirEdicao = (item) => {
    setIdEditando(item.id); setNovoTipo(item.tipo); setNovaModalidade(item.modalidade || 'a_vista'); setNovaDescricao(item.descricao); setNovaCategoriaForm(item.categoria); setNovoValor(item.valor.toString()); setNovaDataCompra(item.dataCompra); setNovaDataVencimento(item.dataVencimento); setModalVisivel(true);
  };

  const salvarTransacao = async () => {
    if (!novaDescricao || !novoValor) { Platform.OS === 'web' ? window.alert("Preencha a descrição e o valor.") : Alert.alert("Erro", "Preencha."); return; }
    const valorTotal = parseFloat(novoValor.replace(',', '.'));
    let dataBaseCompra = novaDataCompra; let vencimentoBase = novoTipo === 'entrada' ? novaDataCompra : (novaDataVencimento || novaDataCompra);
    if (novoTipo === 'saida' && novaModalidade === 'fixa') { dataBaseCompra = `01/${mesSelecionado}`; vencimentoBase = `01/${mesSelecionado}`; }
    const somarMesesData = (dataStr, qtd) => { const p = dataStr.split('/'); let d = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1 + qtd, parseInt(p[0], 10)); return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`; };

    if (idEditando) {
      const atualizada = { descricao: novaDescricao, valor: valorTotal, tipo: novoTipo, categoria: novaCategoriaForm, modalidade: novaModalidade, data_compra: dataBaseCompra, data_vencimento: vencimentoBase };
      const { error } = await supabase.from('transacoes').update(atualizada).eq('id', idEditando);
      if (!error) setTransacoes(transacoes.map(t => t.id === idEditando ? { ...t, ...atualizada, dataCompra: dataBaseCompra, dataVencimento: vencimentoBase } : t));
    } else {
      let novas = [];
      if (novoTipo === 'saida' && novaModalidade === 'parcelada') {
        const nParcelas = Math.max(parseInt(qtdParcelas, 10) || 2, 2); const vParc = parseFloat((valorTotal / nParcelas).toFixed(2));
        for (let i = 0; i < nParcelas; i++) { novas.push({ id: `${Date.now()}_${i}`, user_id: session.user.id, descricao: `${novaDescricao} [${i + 1}/${nParcelas}]`, valor: vParc, tipo: 'saida', modalidade: 'parcelada', categoria: novaCategoriaForm, data_compra: dataBaseCompra, data_vencimento: somarMesesData(vencimentoBase, i), fixado: false }); }
      } else if (novoTipo === 'saida' && novaModalidade === 'fixa') {
        for (let i = 0; i < 12; i++) { novas.push({ id: `${Date.now()}_fixa_${i}`, user_id: session.user.id, descricao: `${novaDescricao} (Fixa)`, valor: valorTotal, tipo: 'saida', modalidade: 'fixa', categoria: novaCategoriaForm, data_compra: dataBaseCompra, data_vencimento: somarMesesData(vencimentoBase, i), fixado: false }); }
      } else {
        novas.push({ id: Date.now().toString(), user_id: session.user.id, descricao: novaDescricao, valor: valorTotal, tipo: novoTipo, modalidade: novoTipo === 'entrada' ? 'a_vista' : novaModalidade, categoria: novaCategoriaForm, data_compra: dataBaseCompra, data_vencimento: vencimentoBase, fixado: false });
      }
      const { error } = await supabase.from('transacoes').insert(novas);
      if (!error) { const form = novas.map(n => ({...n, dataCompra: n.data_compra, dataVencimento: n.data_vencimento})); setTransacoes([...form, ...transacoes]); }
    }
    fecharModal();
  };

  const excluirTransacao = async (id) => { 
    const deletar = async () => { const { error } = await supabase.from('transacoes').delete().eq('id', id); if (!error) setTransacoes(transacoes.filter(t => t.id !== id)); };
    if (Platform.OS === 'web') { if (window.confirm("Apagar?")) deletar(); } else { Alert.alert("Excluir", "Apagar?", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: deletar }]); }
  };
  const alternarFixar = async (id) => { 
    const item = transacoes.find(t => t.id === id); if (!item) return; const novo = !item.fixado;
    const { error } = await supabase.from('transacoes').update({ fixado: novo }).eq('id', id);
    if (!error) setTransacoes(transacoes.map(t => t.id === id ? { ...t, fixado: novo } : t));
  };
  const adicionarCategoria = () => { if (!novaCategoriaNome.trim()) return; atualizarCategorias([{ id: Date.now().toString(), nome: novaCategoriaNome.trim(), cor: novaCategoriaCor }, ...categorias]); setNovaCategoriaNome(''); };
  const excluirCategoria = (id, nome) => { if (nome === 'Renda' || nome === 'Outros') return; const deletar = () => { atualizarCategorias(categorias.filter(c => c.id !== id)); if (novaCategoriaForm === nome) setNovaCategoriaForm('Outros'); }; if (Platform.OS === 'web') { if (window.confirm(`Apagar "${nome}"?`)) deletar(); } else { Alert.alert('Apagar', `Apagar "${nome}"?`, [{ text: 'Cancelar' }, { text: 'Apagar', onPress: deletar }]); } };
  const mostrarDetalhes = (item) => { let msg = `Descrição: ${item.descricao}\nCategoria: ${item.categoria}\nData: ${item.dataCompra}\nValor: R$ ${item.valor.toFixed(2)}`; if (Platform.OS === 'web') window.alert(msg); else Alert.alert("Detalhes", msg); };
  const fecharModalMeta = () => { setModalNovaMetaVisivel(false); setIdEditandoMeta(null); setNovaMetaTitulo(''); setNovaMetaAlvo(''); setNovaMetaValorAtual(''); setNovaMetaCategoria('Outros'); setNovaMetaModalidade('a_vista'); setNovaMetaMeioPagamento('Pix'); setNovaMetaQtdParcelas('2'); setNovaMetaOrigemConta('Conta Corrente'); setNovaMetaDataAlvo(''); setCalendarioVisivel(false); };
  const abrirEdicaoMeta = (meta) => { setIdEditandoMeta(meta.id); setNovaMetaTitulo(meta.titulo); setNovaMetaAlvo(meta.valorAlvo.toString()); setNovaMetaValorAtual(meta.valorAtual ? meta.valorAtual.toString() : '0'); setNovaMetaCategoria(meta.categoria || 'Outros'); setNovaMetaModalidade(meta.modalidade || 'a_vista'); setNovaMetaMeioPagamento(meta.meioPagamento || 'Pix'); setNovaMetaQtdParcelas(meta.qtdParcelas || '2'); setNovaMetaOrigemConta(meta.origemConta || 'Conta Corrente'); setNovaMetaDataAlvo(meta.dataAlvo || ''); setModalNovaMetaVisivel(true); };
  const excluirMeta = (id) => { const deletar = () => atualizarMetas(metas.filter(m => m.id !== id)); if (Platform.OS === 'web') { if (window.confirm("Apagar meta?")) deletar(); } else { Alert.alert("Excluir", "Apagar meta?", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: deletar }]); } };
  const alternarFixarMeta = (id) => { atualizarMetas(metas.map(m => m.id === id ? { ...m, fixado: !m.fixado } : m)); };
  const salvarMeta = () => {
    if (!novaMetaTitulo || !novaMetaAlvo || !novaMetaDataAlvo) return;
    const cat = categorias.find(c => c.nome === novaMetaCategoria); const objMeta = { titulo: novaMetaTitulo, valorAlvo: parseFloat(novaMetaAlvo.replace(',', '.')), categoria: novaMetaCategoria, modalidade: novaMetaModalidade, meioPagamento: novaMetaMeioPagamento, qtdParcelas: novaMetaModalidade === 'parcelada' ? novaMetaQtdParcelas : null, origemConta: novaMetaOrigemConta, dataAlvo: novaMetaDataAlvo, cor: cat ? cat.cor : '#3B82F6' };
    if (idEditandoMeta) { atualizarMetas(metas.map(m => m.id === idEditandoMeta ? { ...m, ...objMeta, valorAtual: parseFloat((novaMetaValorAtual || '0').replace(',', '.')) } : m)); } else { atualizarMetas([{ id: Date.now().toString(), ...objMeta, valorAtual: 0, fixado: false }, ...metas]); }
    fecharModalMeta();
  };
  const depositarNaMeta = async () => {
    if (!valorDeposito) return; const valorNum = parseFloat(valorDeposito.replace(',', '.'));
    atualizarMetas(metas.map(m => m.id === metaSelecionada.id ? { ...m, valorAtual: m.valorAtual + valorNum } : m));
    if (origemDeposito === 'carteira') {
      const hoje = new Date(); const df = `${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;
      const novaDep = { id: Date.now().toString() + '_dep', user_id: session.user.id, descricao: `Depósito: ${metaSelecionada.titulo}`, valor: valorNum, tipo: 'saida', modalidade: 'a_vista', categoria: metaSelecionada.categoria || 'Outros', data_compra: df, data_vencimento: df, fixado: false };
      const { error } = await supabase.from('transacoes').insert([novaDep]);
      if (!error) setTransacoes([{...novaDep, dataCompra: df, dataVencimento: df}, ...transacoes]);
    }
    setModalDepositarVisivel(false); setValorDeposito(''); setMetaSelecionada(null); setOrigemDeposito('carteira');
  };
  const abrirDepositarMeta = (meta) => { setMetaSelecionada(meta); setOrigemDeposito('carteira'); setModalDepositarVisivel(true); };
  const lerNotificacao = () => { if (temNotificacao) { Platform.OS === 'web' ? window.alert("Tudo atualizado!") : Alert.alert("Sucesso", "Tudo atualizado!"); setTemNotificacao(false); } else { Platform.OS === 'web' ? window.alert("Sem notificações.") : Alert.alert("Notificações", "Sem notificações."); } };
  const salvarEdicaoPerfil = async () => { try { await AsyncStorage.setItem('@perfilNome', perfilNome); setModalEditarPerfilVisivel(false); } catch (e) { } };
  const getTopBarTitle = () => { if (abaAtual === 'dashboard') return 'Dashboard'; if (abaAtual === 'extrato') return 'Extrato Agrupado'; if (abaAtual === 'perfil') return 'Meu Perfil'; if (abaAtual === 'visao_anual') return 'Relatórios'; if (abaAtual === 'metas') return 'Minhas Metas'; return 'Dashboard'; };

  if (loadingSession) { return (<View 'center' 'center', alignItems: justifyContent: style="{[styles.container," { }]}><ActivityIndicator color="#3B82F6" size="large"/></View>); }
  if (!session) { return <Auth onLoginSuccess="{(user)"> setSession({ user })} />; }

  const renderDashboard = () => (
    <ScrollView onRefresh="{onRefresh}" refreshControl="{<RefreshControl" refreshing="{refreshing}" showsVerticalScrollIndicator="{false}" style="{styles.scrollContent}"/>}>
      <View style="{styles.monthSelectorContainer}"><TouchableOpacity onPress="{abrirSeletorMes}" style="{styles.monthPill}"><Text style="{styles.monthPillText}">{mesAtualNome} / {anoAtual}</Text><Feather 5 color="{iconColor}" marginLeft: name="chevron-down" size="{16}" style="{{" }}/></TouchableOpacity></View>
      <View style="{styles.cardsContainer}">
        <View '#064E3B' '#F0FDF4' : ? backgroundColor: isDarkMode style="{[styles.summaryCard," { }]}><View><Text '#15803D' '#34D399' : ? color: isDarkMode style="{[styles.summaryLabel," { }]}>Receitas</Text><Text '#15803D' '#34D399' : ? color: isDarkMode style="{[styles.summaryValue," { }]}>R$ {receitas.toFixed(2).replace('.', ',')}</Text></View><Feather '#15803D'} '#34D399' : ? color="{isDarkMode" name="arrow-up-circle" size="{28}"/></View>
        <View '#7F1D1D' '#FEF2F2' : ? backgroundColor: isDarkMode style="{[styles.summaryCard," { }]}><View><Text '#B91C1C' '#F87171' : ? color: isDarkMode style="{[styles.summaryLabel," { }]}>Despesas</Text><Text '#B91C1C' '#F87171' : ? color: isDarkMode style="{[styles.summaryValue," { }]}>R$ {despesas.toFixed(2).replace('.', ',')}</Text></View><Feather '#B91C1C'} '#F87171' : ? color="{isDarkMode" name="arrow-down-circle" size="{28}"/></View>
        <View '#1E3A8A' '#EFF6FF' : ? backgroundColor: isDarkMode style="{[styles.summaryCard," { }]}><View><Text '#1D4ED8' '#60A5FA' : ? color: isDarkMode style="{[styles.summaryLabel," { }]}>Saldo do Mês</Text><Text '#1D4ED8' '#60A5FA' : ? color: isDarkMode style="{[styles.summaryValue," { }]}>R$ {saldo.toFixed(2).replace('.', ',')}</Text></View><Feather '#1D4ED8'} '#60A5FA' : ? color="{isDarkMode" name="credit-card" size="{28}"/></View>
      </View>
      <View style="{styles.chartSection}"><Text style="{styles.sectionTitle}">Progresso do Orçamento</Text><View style="{styles.chartBox}"><Text style="{styles.chartLabel}">Você comprometeu <Text '#B91C1C'}} '#F87171' 'bold', : ? color: isDarkMode style="{{fontWeight:">{porcentagemLimitada.toFixed(0)}%</Text> das receitas.</Text><View style="{styles.barraFundo}"><View `${porcentagemLimitada}%` style="{[styles.barraProgresso," width: { }]}/></View></View></View>
      <View style="{styles.categoriasSection}"><Text style="{styles.sectionTitle}">Despesas por Categoria</Text><View style="{styles.categoriasListContainer}">{despesasAgrupadas.length === 0 ? (<Text style="{styles.textoVazio}">Nenhum gasto neste mês.</Text>) : (despesasAgrupadas.map((item, index) => { const catObj = categorias.find(c => c.nome === item.nome); const cor = catObj ? catObj.cor : '#94A3B8'; return (<View key="{index}" style="{styles.catRow}"><View style="{styles.catLeft}"><View backgroundColor: cor style="{[styles.catBolinha," { }]}/><Text style="{styles.catNome}">{item.nome}</Text></View><View style="{styles.catRight}"><Text style="{styles.catValor}">R$ {item.total.toFixed(2)}</Text><Text style="{styles.catPercent}">{item.porcentagem.toFixed(0)}%</Text></View></View>) }))}</View></View>
      <View 100}} style="{{height:"/> 
    </ScrollView>
  );

const renderExtrato = () => {
    let mapaGrupos = {};
    transacoesOrdenadasDoMes.forEach(t => { if (!mapaGrupos[t.categoria]) { const catObj = categorias.find(c => c.nome === t.categoria); mapaGrupos[t.categoria] = { nome: t.categoria, cor: catObj ? catObj.cor : '#94A3B8', transacoes: [], totalEntrada: 0, totalSaida: 0 }; } mapaGrupos[t.categoria].transacoes.push(t); if (t.tipo === 'entrada') mapaGrupos[t.categoria].totalEntrada += t.valor; else mapaGrupos[t.categoria].totalSaida += t.valor; });
    const gruposArray = Object.values(mapaGrupos).sort((a,b) => (b.totalSaida + b.totalEntrada) - (a.totalSaida + a.totalEntrada));
    const alternarCategoria = (catNome) => { setCategoriasExpandidas(prev => ({ ...prev, [catNome]: !prev[catNome] })); };
    
    // NOVO CARD SEM SWIPEABLE - BOTÕES INTEGRADOS NO RODAPÉ DO CARD
    const renderCardTransacao = (item) => (
      <View key={item.id} style={styles.cardContainerGrouped}>
        <View style={[styles.listCardGrouped, item.fixado && styles.cardFixado, { flexDirection: 'column', alignItems: 'stretch' }]}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => mostrarDetalhes(item)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={styles.listCardInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {item.fixado && <Text style={{ marginRight: 5 }}>📌</Text>}
                <Text style={styles.listCardTitle}>{item.descricao}</Text>
              </View>
              <Text style={styles.dataVencimentoText}>{item.dataCompra}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.listCardValue, item.tipo === 'entrada' ? styles.verde : styles.vermelho]}>
                {item.tipo === 'entrada' ? '+ ' : '- '}R$ {item.valor.toFixed(2)}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, borderTopWidth: 1, borderTopColor: isDarkMode ? '#334155' : '#F1F5F9', paddingTop: 12 }}>
            <TouchableOpacity onPress={() => alternarFixar(item.id)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
              <Feather name="pin" size={14} color={isDarkMode ? '#94A3B8' : '#64748B'} />
              <Text style={{ fontSize: 12, color: isDarkMode ? '#94A3B8' : '#64748B', marginLeft: 6, fontWeight: '600' }}>Fixar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => abrirEdicao(item)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
              <Feather name="edit-2" size={14} color="#3B82F6" />
              <Text style={{ fontSize: 12, color: "#3B82F6", marginLeft: 6, fontWeight: '600' }}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => excluirTransacao(item.id)} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="trash-2" size={14} color="#EF4444" />
              <Text style={{ fontSize: 12, color: "#EF4444", marginLeft: 6, fontWeight: '600' }}>Apagar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );

    return (
      <ScrollView style={styles.extratoContainer} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.extratoHeader}><View><Text style={styles.extratoTitle}>Extrato Agrupado</Text><Text style={styles.extratoSubtitle}>Movimentações organizadas</Text></View><TouchableOpacity style={styles.btnExportar} onPress={() => Platform.OS === 'web' ? window.alert('Gerando PDF...') : Alert.alert('Exportar Extrato', `Gerando PDF...`)}><Feather name="file-text" size={18} color="#FFF" /><Text style={styles.btnExportarText}>Gerar PDF</Text></TouchableOpacity></View>
        <View style={styles.extratoMonthSelector}><TouchableOpacity style={styles.monthPill} onPress={abrirSeletorMes}><Text style={styles.monthPillText}>{mesAtualNome} / {anoAtual}</Text><Feather name="chevron-down" size={16} color={iconColor} style={{ marginLeft: 5 }} /></TouchableOpacity></View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 120, marginTop: 10 }}>
           {gruposArray.length === 0 ? (<Text style={styles.textoVazio}>Nenhuma movimentação neste mês.</Text>) : (gruposArray.map(grupo => {
                 const isExpandido = categoriasExpandidas[grupo.nome]; const saldoFinalCategoria = grupo.totalEntrada - grupo.totalSaida;
                 return (
                    <View key={grupo.nome} style={styles.grupoContainer}>
                       <TouchableOpacity style={styles.grupoHeader} onPress={() => alternarCategoria(grupo.nome)} activeOpacity={0.8}><View style={{flexDirection: 'row', alignItems: 'center'}}><View style={[styles.catBolinha, { backgroundColor: grupo.cor }]} /><Text style={styles.grupoTitulo}>{grupo.nome}</Text><Text style={styles.grupoQtd}>({grupo.transacoes.length})</Text></View><View style={{flexDirection: 'row', alignItems: 'center'}}><Text style={[styles.grupoTotal, saldoFinalCategoria >= 0 ? styles.verde : styles.vermelho]}>R$ {Math.abs(saldoFinalCategoria).toFixed(2)}</Text><Feather name={isExpandido ? "chevron-up" : "chevron-down"} size={20} color={isDarkMode ? '#64748B' : '#94A3B8'} style={{marginLeft: 10}} /></View></TouchableOpacity>
                       {isExpandido && (<View style={styles.grupoConteudo}>{grupo.transacoes.map(t => renderCardTransacao(t))}</View>)}
                    </View>
                 )
              })
           )}
        </View>
      </ScrollView>
    );
  };
  };const renderPerfil = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.perfilHeader}>
        <View style={styles.perfilAvatarGiga}><Feather name="user" size={45} color="#FFF" /></View>
        <Text style={styles.perfilNomeGiga}>{perfilNome}</Text>
        <Text style={styles.perfilEmailGiga}>{perfilEmail || 'Sem e-mail conectado'}</Text>
      </View>
      <View style={styles.perfilSectionContainer}>
        <Text style={styles.perfilSectionTitle}>Minha Conta</Text>
        <TouchableOpacity style={styles.perfilOpcaoBtn} onPress={() => setModalEditarPerfilVisivel(true)}>
          <View style={styles.perfilOpcaoLeft}>
            <View style={[styles.perfilIconBox, { backgroundColor: isDarkMode ? '#1E3A8A' : '#EFF6FF' }]}><Feather name="edit-2" size={20} color={isDarkMode ? '#60A5FA' : '#3B82F6'} /></View>
            <Text style={styles.perfilOpcaoTexto}>Editar Perfil</Text>
          </View>
          <Feather name="chevron-right" size={20} color={isDarkMode ? '#475569' : '#CBD5E1'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.perfilOpcaoBtn} onPress={() => setModalSegurancaVisivel(true)}>
          <View style={styles.perfilOpcaoLeft}>
            <View style={[styles.perfilIconBox, { backgroundColor: isDarkMode ? '#7F1D1D' : '#FEF2F2' }]}><Feather name="shield" size={20} color={isDarkMode ? '#F87171' : '#EF4444'} /></View>
            <Text style={styles.perfilOpcaoTexto}>Segurança e Senhas</Text>
          </View>
          <Feather name="chevron-right" size={20} color={isDarkMode ? '#475569' : '#CBD5E1'} />
        </TouchableOpacity>
      </View>
      <View style={styles.perfilSectionContainer}>
        <Text style={styles.perfilSectionTitle}>Aplicativo</Text>
        <TouchableOpacity style={styles.perfilOpcaoBtn} onPress={toggleTema}>
          <View style={styles.perfilOpcaoLeft}>
            <View style={[styles.perfilIconBox, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]}><Feather name="moon" size={20} color={iconColor} /></View>
            <Text style={styles.perfilOpcaoTexto}>Modo Escuro</Text>
          </View>
          <Switch trackColor={{ false: "#CBD5E1", true: "#3B82F6" }} thumbColor="#FFFFFF" onValueChange={toggleTema} value={isDarkMode} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.btnSair} onPress={handleLogout}>
        <Feather name="log-out" size={20} color="#EF4444" />
        <Text style={styles.btnSairTexto}>Sair do Aplicativo</Text>
      </TouchableOpacity>
      <View style={{height: 100}} />
    </ScrollView>
  );

  const renderVisaoAnual = () => {
    const dados = gerarDadosAnuais(anoVisaoAnual); const totalReceitasAno = dados.reduce((acc, curr) => acc + curr.receitas, 0); const totalDespesasAno = dados.reduce((acc, curr) => acc + curr.despesas, 0); const saldoAno = totalReceitasAno - totalDespesasAno; const maxValorGrafico = Math.max(...dados.map(d => Math.max(d.receitas, d.despesas)), 1);
    return (
      <View style={styles.extratoContainer}>
        <View style={styles.extratoHeader}>
          <View><Text style={styles.extratoTitle}>Visão Anual</Text><Text style={styles.extratoSubtitle}>Evolução financeira em {anoVisaoAnual}</Text></View>
        </View>
        <View style={styles.extratoMonthSelector}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={{ padding: 10 }} onPress={() => setAnoVisaoAnual(anoVisaoAnual - 1)}><Feather name="chevron-left" size={24} color={iconColor} /></TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginHorizontal: 15, color: isDarkMode ? '#F8FAFC' : '#1E293B' }}>{anoVisaoAnual}</Text>
            <TouchableOpacity style={{ padding: 10 }} onPress={() => setAnoVisaoAnual(anoVisaoAnual + 1)}><Feather name="chevron-right" size={24} color={iconColor} /></TouchableOpacity>
          </View>
        </View>
        <View style={styles.extratoResumoBoxes}>
          <View style={styles.extratoResumoItem}><Text style={styles.extratoResumoLabel}>Entradas Anuais</Text><Text style={[styles.extratoResumoValor, styles.verde]}>R$ {totalReceitasAno.toFixed(0)}</Text></View>
          <View style={styles.extratoResumoItem}><Text style={styles.extratoResumoLabel}>Saídas Anuais</Text><Text style={[styles.extratoResumoValor, styles.vermelho]}>R$ {totalDespesasAno.toFixed(0)}</Text></View>
        </View>
        <View style={{ paddingHorizontal: 20, marginBottom: 15 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: isDarkMode ? '#F8FAFC' : '#1E293B', marginBottom: 5 }}>Balanço do Ano</Text>
          <Text style={{ fontSize: 14, color: saldoAno >= 0 ? (isDarkMode ? '#34D399' : '#15803D') : (isDarkMode ? '#F87171' : '#B91C1C') }}>
            {saldoAno >= 0 ? 'Você economizou ' : 'Você gastou a mais '}R$ {Math.abs(saldoAno).toFixed(2)}
          </Text>
        </View>
        <View style={styles.graficoAnualContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, alignItems: 'flex-end', height: 220 }}>
            {dados.map((item, index) => { 
              const heightRec = (item.receitas / maxValorGrafico) * 150; const heightDesp = (item.despesas / maxValorGrafico) * 150; 
              return (
                <View key={index} style={styles.graficoMesColuna}>
                  <View style={styles.graficoBarrasContainer}>
                    <View style={[styles.graficoBarra, styles.bgVerde, { height: heightRec > 0 ? heightRec : 4 }]} />
                    <View style={[styles.graficoBarra, styles.bgVermelho, { height: heightDesp > 0 ? heightDesp : 4 }]} />
                  </View>
                  <Text style={styles.graficoMesLabel}>{item.mes}</Text>
                </View>
              ); 
            })}
          </ScrollView>
        </View>
        <View style={styles.graficoLegenda}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}><View style={[styles.catBolinha, styles.bgVerde]} /><Text style={{fontSize: 12, color: isDarkMode ? '#94A3B8' : '#64748B'}}>Receitas</Text></View>
          <View style={{flexDirection: 'row', alignItems: 'center'}}><View style={[styles.catBolinha, styles.bgVermelho]} /><Text style={{fontSize: 12, color: isDarkMode ? '#94A3B8' : '#64748B'}}>Despesas</Text></View>
        </View>
      </View>
    );
  };

  const renderMetas = () => {
    const totalGuardadoGeral = metas.reduce((acc, m) => acc + (m.valorAtual || 0), 0);
    const metasOrdenadas = [...metas].sort((a, b) => { if (a.fixado && !b.fixado) return -1; if (!a.fixado && b.fixado) return 1; return 0; });
    return (
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.metasHeader}>
          <Text style={styles.metasHeaderLabel}>Total Guardado</Text>
          <Text style={styles.metasHeaderValor}>R$ {totalGuardadoGeral.toFixed(2)}</Text>
          <TouchableOpacity style={styles.btnNovaMeta} onPress={() => setModalNovaMetaVisivel(true)}><Feather name="plus-circle" size={20} color="#FFF" /><Text style={styles.btnNovaMetaTexto}>Criar Nova Meta</Text></TouchableOpacity>
        </View>
        {metasOrdenadas.map((meta) => { 
          const porcentagem = Math.min(((meta.valorAtual || 0) / (meta.valorAlvo || 1)) * 100, 100); 
          return (
            <View key={meta.id} style={styles.metaCardWrapper}>
              <View style={[styles.metaCard, meta.fixado && styles.cardFixado]}>
                <View style={styles.metaCardHeader}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>{meta.fixado && <Text style={{ marginRight: 5 }}>📌</Text>}<View style={{width: 14, height: 14, borderRadius: 7, backgroundColor: meta.cor, marginRight: 8}} /><Text style={styles.metaCardTitle}>{meta.titulo}</Text></View>
                  <Text style={[styles.metaCardPercent, {color: meta.cor}]}>{porcentagem.toFixed(0)}%</Text>
                </View>
                <View style={styles.metaTagsRow}>
                  <Text style={styles.metaTag}>{meta.categoria || 'Sem categoria'}</Text>
                  {meta.dataAlvo && <Text style={styles.metaTagCalendario}>📅 {meta.dataAlvo}</Text>}
                  <Text style={styles.metaTagPagamento}>{meta.origemConta || 'Conta'}</Text>
                  <Text style={styles.metaTag}>{meta.modalidade === 'parcelada' ? `Parcelado (${meta.qtdParcelas}x)` : 'À Vista'}</Text>
                  <Text style={styles.metaTag}>{meta.meioPagamento || 'Não definido'}</Text>
                </View>
                <View style={styles.metaValores}>
                  <Text style={styles.metaValorAtual}>R$ {(meta.valorAtual || 0).toFixed(2)}</Text>
                  <Text style={styles.metaValorAlvo}>de R$ {(meta.valorAlvo || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.metaBarraFundo}>
                  <View style={[styles.metaBarraProgresso, { width: `${porcentagem}%`, backgroundColor: meta.cor }]} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: isDarkMode ? '#334155' : '#F1F5F9', paddingTop: 15 }}>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => alternarFixarMeta(meta.id)} style={{ paddingRight: 15 }}><Feather name="pin" size={16} color={isDarkMode ? '#94A3B8' : '#64748B'} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => abrirEdicaoMeta(meta)} style={{ paddingRight: 15 }}><Feather name="edit-2" size={16} color="#3B82F6" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => excluirMeta(meta.id)}><Feather name="trash-2" size={16} color="#EF4444" /></TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.btnDepositarMeta} onPress={() => abrirDepositarMeta(meta)}><Text style={styles.btnDepositarMetaTexto}>Guardar Dinheiro</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          ); 
        })}
        <View style={{height: 120}} />
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF' }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} backgroundColor={isDarkMode ? '#1E293B' : '#FFFFFF'} />
      <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF' }]}>
        
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setMenuAberto(true)} style={styles.topBarIcon}><Feather name="menu" size={28} color={iconColor} /></TouchableOpacity>
          <Text style={styles.topBarTitle}>{getTopBarTitle()}</Text>
          <TouchableOpacity onPress={lerNotificacao} style={styles.topBarIcon}><View><Feather name="bell" size={24} color={iconColor} />{temNotificacao && <View style={styles.notificationBadge} />}</View></TouchableOpacity>
        </View>

        {abaAtual === 'dashboard' && renderDashboard()}
        {abaAtual === 'extrato' && renderExtrato()}
        {abaAtual === 'perfil' && renderPerfil()}
        {abaAtual === 'visao_anual' && renderVisaoAnual()}
        {abaAtual === 'metas' && renderMetas()}

        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => setAbaAtual('dashboard')}><Feather name="home" size={24} color={abaAtual === 'dashboard' ? '#3B82F6' : (isDarkMode ? '#64748B' : '#94A3B8')} /><Text style={[styles.navText, abaAtual === 'dashboard' && styles.navTextAtivo]}>Início</Text></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setAbaAtual('extrato')}><Feather name="list" size={24} color={abaAtual === 'extrato' ? '#3B82F6' : (isDarkMode ? '#64748B' : '#94A3B8')} /><Text style={[styles.navText, abaAtual === 'extrato' && styles.navTextAtivo]}>Extrato</Text></TouchableOpacity>
          <View style={styles.fabWrapper}><TouchableOpacity style={styles.fabBtn} onPress={() => setMenuAdicionarVisivel(true)}><Feather name="plus" size={32} color="#FFF" /></TouchableOpacity></View>
          <TouchableOpacity style={styles.navItem} onPress={() => setAbaAtual('metas')}><Feather name="target" size={24} color={abaAtual === 'metas' ? '#3B82F6' : (isDarkMode ? '#64748B' : '#94A3B8')} /><Text style={[styles.navText, abaAtual === 'metas' && styles.navTextAtivo]}>Metas</Text></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setAbaAtual('perfil')}><Feather name="user" size={24} color={abaAtual === 'perfil' ? '#3B82F6' : (isDarkMode ? '#64748B' : '#94A3B8')} /><Text style={[styles.navText, abaAtual === 'perfil' && styles.navTextAtivo]}>Perfil</Text></TouchableOpacity>
        </View>

        <Modal animationType="slide" transparent={true} visible={modalNovaMetaVisivel} onRequestClose={fecharModalMeta}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalFundo}>
            <View style={styles.modalConteudo}>
              <View style={styles.modalCabecalho}><Text style={styles.modalTitulo}>{idEditandoMeta ? 'Editar Meta' : 'Planejar Compra'}</Text><TouchableOpacity onPress={fecharModalMeta}><Text style={styles.modalFechar}>X</Text></TouchableOpacity></View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>O que você quer alcançar/comprar?</Text>
                <TextInput style={styles.input} placeholder="Ex: Tênis de Corrida, Viagem..." placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'} value={novaMetaTitulo} onChangeText={setNovaMetaTitulo} />
                
                <Text style={styles.label}>Categoria do Objetivo</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listaCategorias}>
                  {categorias.map((cat) => (
                    <TouchableOpacity key={cat.id} style={[styles.pillCategoria, novaMetaCategoria === cat.nome && styles.pillCategoriaAtiva]} onPress={() => setNovaMetaCategoria(cat.nome)}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}><View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: cat.cor, marginRight: 6}} /><Text style={[styles.textoPill, novaMetaCategoria === cat.nome && styles.textoBranco]}>{cat.nome}</Text></View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.linhaDupla}>
                  <View style={{width: '48%'}}>
                    <Text style={styles.label}>Como pretende pagar?</Text>
                    <View style={styles.linhaBotoesOpcao}>
                      <TouchableOpacity style={[styles.opcaoBtn, novaMetaModalidade === 'a_vista' && styles.opcaoBtnAtivo]} onPress={() => setNovaMetaModalidade('a_vista')}><Text style={[styles.textoOpcao, novaMetaModalidade === 'a_vista' && styles.textoBranco]}>À Vista</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.opcaoBtn, novaMetaModalidade === 'parcelada' && styles.opcaoBtnAtivo]} onPress={() => setNovaMetaModalidade('parcelada')}><Text style={[styles.textoOpcao, novaMetaModalidade === 'parcelada' && styles.textoBranco]}>Parcelado</Text></TouchableOpacity>
                    </View>
                  </View>
                  <View style={{width: '48%'}}>
                    <Text style={styles.label}>Data Planejada 📅</Text>
                    <TouchableOpacity style={styles.inputDataBtn} onPress={() => abrirCalendario('meta_alvo')}><Text style={styles.inputDataTexto}>{novaMetaDataAlvo || 'Selecione'}</Text></TouchableOpacity>
                  </View>
                </View>

                {novaMetaModalidade === 'parcelada' && (
                  <View style={{marginTop: 10}}><Text style={styles.label}>Em quantas vezes?</Text><TextInput style={styles.input} placeholder="Ex: 12" placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'} keyboardType="numeric" value={novaMetaQtdParcelas} onChangeText={setNovaMetaQtdParcelas} /></View>
                )}

                <Text style={styles.label}>Origem do Dinheiro (De onde vai sair?)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listaCategorias}>
                  {contasOrigem.map((conta) => (<TouchableOpacity key={conta} style={[styles.pillCategoria, novaMetaOrigemConta === conta && {backgroundColor: '#3B82F6'}]} onPress={() => setNovaMetaOrigemConta(conta)}><Text style={[styles.textoPill, novaMetaOrigemConta === conta && styles.textoBranco]}>{conta}</Text></TouchableOpacity>))}
                </ScrollView>

                <Text style={styles.label}>Meio de Pagamento</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listaCategorias}>
                  {meiosPagamento.map((meio) => (<TouchableOpacity key={meio} style={[styles.pillCategoria, novaMetaMeioPagamento === meio && styles.pillCategoriaAtiva]} onPress={() => setNovaMetaMeioPagamento(meio)}><Text style={[styles.textoPill, novaMetaMeioPagamento === meio && styles.textoBranco]}>{meio}</Text></TouchableOpacity>))}
                </ScrollView>

                <View style={styles.linhaDupla}>
                  <View style={idEditandoMeta ? {width: '48%'} : {width: '100%'}}><Text style={styles.label}>Valor Alvo Total (R$)</Text><TextInput style={styles.input} placeholder="0.00" placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'} keyboardType="numeric" value={novaMetaAlvo} onChangeText={setNovaMetaAlvo} /></View>
                  {idEditandoMeta && (<View style={{width: '48%'}}><Text style={styles.label}>Valor Atual Guardado (R$)</Text><TextInput style={styles.input} placeholder="0.00" placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'} keyboardType="numeric" value={novaMetaValorAtual} onChangeText={setNovaMetaValorAtual} /></View>)}
                </View>

                <TouchableOpacity style={styles.botaoSalvar} onPress={salvarMeta}><Text style={styles.textoBotaoSalvar}>{idEditandoMeta ? 'Atualizar Meta' : 'Criar Meta'}</Text></TouchableOpacity>
                <View style={{height: 40}} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal animationType="slide" transparent={true} visible={modalDepositarVisivel} onRequestClose={() => {setModalDepositarVisivel(false); setValorDeposito('');}}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalFundo}>
            <View style={styles.modalConteudo}>
              <View style={styles.modalCabecalho}><Text style={styles.modalTitulo}>Guardar Dinheiro</Text><TouchableOpacity onPress={() => {setModalDepositarVisivel(false); setValorDeposito('');}}><Text style={styles.modalFechar}>X</Text></TouchableOpacity></View>
              <Text style={styles.labelPequeno}>Destino: {metaSelecionada?.titulo}</Text>
              <Text style={styles.label}>Qual valor você quer depositar?</Text>
              <TextInput style={[styles.input, {marginBottom: 15}]} placeholder="0.00" placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'} keyboardType="numeric" value={valorDeposito} onChangeText={setValorDeposito} />
              <Text style={styles.labelPequeno}>De onde vem o dinheiro?</Text>
              <View style={[styles.linhaBotoesOpcao, {marginBottom: 10}]}>
                <TouchableOpacity style={[styles.opcaoBtn, origemDeposito === 'carteira' && styles.opcaoBtnAtivo]} onPress={() => setOrigemDeposito('carteira')}><Text style={[styles.textoOpcao, origemDeposito === 'carteira' && styles.textoBranco]}>Da Minha Carteira</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.opcaoBtn, origemDeposito === 'externo' && styles.opcaoBtnAtivo]} onPress={() => setOrigemDeposito('externo')}><Text style={[styles.textoOpcao, origemDeposito === 'externo' && styles.textoBranco]}>Dinheiro Externo</Text></TouchableOpacity>
              </View>
              {origemDeposito === 'carteira' && (<Text style={styles.calculoParcelaTexto}>💡 Isso vai gerar uma Despesa automática na conta base ({metaSelecionada?.origemConta || 'Conta Corrente'}) no seu Extrato de hoje.</Text>)}
              <TouchableOpacity style={[styles.botaoSalvar, {marginTop: 15}]} onPress={depositarNaMeta}><Text style={styles.textoBotaoSalvar}>Confirmar Depósito</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal animationType="slide" transparent={true} visible={modalVisivel} onRequestClose={fecharModal}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalFundo}>
            <View style={styles.modalConteudo}>
              <View style={styles.modalCabecalho}><Text style={styles.modalTitulo}>{idEditando ? 'Editar' : 'Novo Registro'}</Text><TouchableOpacity onPress={fecharModal}><Text style={styles.modalFechar}>X</Text></TouchableOpacity></View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {novoTipo === 'saida' && ( 
                  <View style={{ marginTop: 5, marginBottom: 15 }}>
                    <Text style={styles.labelPequeno}>Forma de Pagamento:</Text>
                    <View style={styles.linhaBotoesOpcao}>
                      <TouchableOpacity style={[styles.opcaoBtn, novaModalidade === 'a_vista' && styles.opcaoBtnAtivo]} onPress={() => setNovaModalidade('a_vista')}><Text style={[styles.textoOpcao, novaModalidade === 'a_vista' && styles.textoBranco]}>À Vista</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.opcaoBtn, novaModalidade === 'parcelada' && styles.opcaoBtnAtivo]} onPress={() => setNovaModalidade('parcelada')}><Text style={[styles.textoOpcao, novaModalidade === 'parcelada' && styles.textoBranco]}>Parcelado</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.opcaoBtn, novaModalidade === 'fixa' && styles.opcaoBtnAtivo]} onPress={() => setNovaModalidade('fixa')}><Text style={[styles.textoOpcao, novaModalidade === 'fixa' && styles.textoBranco]}>Fixa Mensal</Text></TouchableOpacity>
                    </View>
                  </View>
                )}
                
                <Text style={styles.label}>O que foi?</Text>
                <TextInput style={styles.input} placeholder={novoTipo === 'entrada' ? "Ex: Salário, Venda..." : "Ex: Mercado, Uber..."} placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'} value={novaDescricao} onChangeText={setNovaDescricao} />
                
                <Text style={styles.label}>Categoria</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listaCategorias}>
                  {categorias.map((cat) => (<TouchableOpacity key={cat.id} style={[styles.pillCategoria, novaCategoriaForm === cat.nome && styles.pillCategoriaAtiva]} onPress={() => setNovaCategoriaForm(cat.nome)}><View style={{flexDirection: 'row', alignItems: 'center'}}><View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: cat.cor, marginRight: 6}} /><Text style={[styles.textoPill, novaCategoriaForm === cat.nome && styles.textoBranco]}>{cat.nome}</Text></View></TouchableOpacity>))}
                </ScrollView>

                <View style={styles.linhaDupla}>
                  <View style={novaModalidade === 'parcelada' && novoTipo === 'saida' ? { width: '58%' } : { width: '100%' }}><Text style={styles.label}>{novaModalidade === 'parcelada' && novoTipo === 'saida' ? 'Valor Total (R$)' : 'Valor (R$)'}</Text><TextInput style={styles.input} placeholder="0.00" placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'} keyboardType="numeric" value={novoValor} onChangeText={setNovoValor} /></View>
                  {novaModalidade === 'parcelada' && novoTipo === 'saida' && (<View style={{ width: '38%' }}><Text style={styles.label}>Parcelas</Text><TextInput style={styles.input} placeholder="Ex: 3" placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'} keyboardType="numeric" value={qtdParcelas} onChangeText={setQtdParcelas} /></View>)}
                </View>

                {novaModalidade === 'parcelada' && novoTipo === 'saida' && novoValor !== '' && (<Text style={styles.calculoParcelaTexto}>💡 {qtdParcelas || 2}x de R$ {(parseFloat(novoValor.replace(',', '.') || 0) / (parseInt(qtdParcelas, 10) || 2)).toFixed(2)} por mês</Text>)}
                
                {novoTipo === 'saida' ? (
                  novaModalidade === 'fixa' ? (
                    <View style={styles.avisoFixaContainer}><Text style={styles.avisoFixaTexto}>💡 A despesa começará automaticamente em {nomesMeses[mesSelecionado.split('/')[0]]}/{mesSelecionado.split('/')[1]}</Text></View>
                  ) : (
                    <View style={styles.linhaDupla}>
                      <View style={styles.metadeInput}><Text style={styles.label}>Data da Compra</Text><TouchableOpacity style={styles.inputDataBtn} onPress={() => abrirCalendario('compra')}><Text style={styles.inputDataTexto}>{novaDataCompra || 'Selecionar 📅'}</Text></TouchableOpacity></View>
                      <View style={styles.metadeInput}><Text style={styles.label}>Vencimento</Text><TouchableOpacity style={styles.inputDataBtn} onPress={() => abrirCalendario('vencimento')}><Text style={styles.inputDataTexto}>{novaDataVencimento || 'Selecionar 📅'}</Text></TouchableOpacity></View>
                    </View>
                  )
                ) : (
                  <View style={{ width: '100%' }}><Text style={styles.label}>Data do Crédito</Text><TouchableOpacity style={styles.inputDataBtn} onPress={() => abrirCalendario('compra')}><Text style={styles.inputDataTexto}>{novaDataCompra || 'Selecionar 📅'}</Text></TouchableOpacity></View>
                )}
                
                <TouchableOpacity style={styles.botaoSalvar} onPress={salvarTransacao}><Text style={styles.textoBotaoSalvar}>{idEditando ? 'Atualizar Registro' : 'Salvar Transação'}</Text></TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={menuAdicionarVisivel} transparent={true} animationType="slide" onRequestClose={() => setMenuAdicionarVisivel(false)}>
          <TouchableOpacity style={styles.modalAdicionarOverlay} activeOpacity={1} onPress={() => setMenuAdicionarVisivel(false)}>
            <View style={styles.menuAdicionarContent}>
              <View style={styles.menuAdicionarHeader}><Text style={styles.menuAdicionarTitle}>O que deseja registrar?</Text></View>
              <View style={styles.menuAdicionarBotoes}>
                <TouchableOpacity style={styles.menuAdicionarOpcao} onPress={() => escolherTipoTransacao('saida')}><View style={[styles.iconBoxAdicionar, { backgroundColor: isDarkMode ? '#7F1D1D' : '#FEF2F2' }]}><Feather name="arrow-down" size={28} color={isDarkMode ? '#F87171' : '#B91C1C'} /></View><Text style={styles.menuAdicionarTexto}>Despesa</Text></TouchableOpacity>
                <TouchableOpacity style={styles.menuAdicionarOpcao} onPress={() => escolherTipoTransacao('entrada')}><View style={[styles.iconBoxAdicionar, { backgroundColor: isDarkMode ? '#064E3B' : '#F0FDF4' }]}><Feather name="arrow-up" size={28} color={isDarkMode ? '#34D399' : '#15803D'} /></View><Text style={styles.menuAdicionarTexto}>Receita</Text></TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal animationType="fade" transparent={true} visible={calendarioVisivel} onRequestClose={() => setCalendarioVisivel(false)}>
          <View style={styles.calendarioOverlay}>
            <View style={styles.calendarioBox}>
              <View style={styles.calTopo}>
                <TouchableOpacity onPress={() => setCalMes(calMes === 1 ? 12 : calMes - 1)}><Text style={styles.calSeta}>{'<'}</Text></TouchableOpacity>
                <Text style={styles.calTitulo}>{nomesMeses[calMes.toString().padStart(2, '0')]} {calAno}</Text>
                <TouchableOpacity onPress={() => setCalMes(calMes === 12 ? 1 : calMes + 1)}><Text style={styles.calSeta}>{'>'}</Text></TouchableOpacity>
              </View>
              <View style={styles.gridDias}>
                {arrayDias.map((dia) => (<TouchableOpacity key={dia} style={styles.diaItem} onPress={() => selecionarDia(dia)}><Text style={styles.diaTexto}>{dia}</Text></TouchableOpacity>))}
              </View>
              <TouchableOpacity style={styles.btnFecharCal} onPress={() => setCalendarioVisivel(false)}><Text style={styles.textoFecharCal}>Cancelar</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal animationType="fade" transparent={true} visible={modalMesVisivel} onRequestClose={() => setModalMesVisivel(false)}>
          <View style={styles.modalFundoCentro}>
            <View style={styles.calendarioBox}>
              <View style={styles.calTopo}>
                <TouchableOpacity onPress={() => setAnoTemp(anoTemp - 1)}><Text style={styles.calSeta}>{'<'}</Text></TouchableOpacity>
                <Text style={styles.calTitulo}>{anoTemp}</Text>
                <TouchableOpacity onPress={() => setAnoTemp(anoTemp + 1)}><Text style={styles.calSeta}>{'>'}</Text></TouchableOpacity>
              </View>
              <View style={styles.gridMeses}>
                {mesesAbreviados.map((mes) => { 
                  const isSelecionado = mesSelecionado === `${mes.num.toString().padStart(2, '0')}/${anoTemp}`; 
                  return (<TouchableOpacity key={mes.num} style={[styles.mesItem, isSelecionado && styles.mesItemAtivo]} onPress={() => escolherMes(mes.num)}><Text style={[styles.mesItemTexto, isSelecionado && styles.mesItemTextoAtivo]}>{mes.nome}</Text></TouchableOpacity>);
                })}
              </View>
              <TouchableOpacity style={styles.btnFecharCal} onPress={() => setModalMesVisivel(false)}><Text style={styles.textoFecharCal}>Cancelar</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal animationType="slide" transparent={true} visible={modalEditarPerfilVisivel} onRequestClose={() => setModalEditarPerfilVisivel(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalFundo}>
            <View style={styles.modalConteudo}>
              <View style={styles.modalCabecalho}><Text style={styles.modalTitulo}>Editar Perfil</Text><TouchableOpacity onPress={() => setModalEditarPerfilVisivel(false)}><Text style={styles.modalFechar}>X</Text></TouchableOpacity></View>
              <Text style={styles.label}>Nome ou Apelido</Text>
              <TextInput style={styles.input} placeholder="Seu nome" placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'} value={perfilNome} onChangeText={setPerfilNome} />
              <Text style={styles.label}>E-mail</Text>
              <TextInput style={styles.input} placeholder="Seu e-mail" placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'} keyboardType="email-address" autoCapitalize="none" value={perfilEmail} onChangeText={setPerfilEmail} />
              <TouchableOpacity style={styles.botaoSalvar} onPress={salvarEdicaoPerfil}><Text style={styles.textoBotaoSalvar}>Salvar Alterações</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal animationType="slide" transparent={true} visible={modalSegurancaVisivel} onRequestClose={() => setModalSegurancaVisivel(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalFundo}>
            <View style={styles.modalConteudo}>
              <View style={styles.modalCabecalho}><Text style={styles.modalTitulo}>Segurança</Text><TouchableOpacity onPress={() => setModalSegurancaVisivel(false)}><Text style={styles.modalFechar}>X</Text></TouchableOpacity></View>
              <View style={styles.biometriaRow}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}><Feather name="smartphone" size={24} color={iconColor} style={{marginRight: 10}} /><Text style={styles.labelBiometria}>Biometria / Face ID</Text></View>
                <Switch trackColor={{ false: "#CBD5E1", true: "#3B82F6" }} thumbColor="#FFFFFF" onValueChange={() => setBiometriaAtiva(!biometriaAtiva)} value={biometriaAtiva} />
              </View>
              <Text style={styles.dicaBiometria}>Use sua digital ou rosto para entrar no app sem precisar digitar a senha toda vez.</Text>
              <Text style={[styles.sectionTitle, {marginTop: 20}]}>Trocar Senha</Text>
              <Text style={styles.labelPequeno}>Senha Atual</Text><TextInput style={[styles.input, {marginBottom: 10}]} placeholder="••••••••" placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'} secureTextEntry={true} />
              <Text style={styles.labelPequeno}>Nova Senha</Text><TextInput style={[styles.input, {marginBottom: 10}]} placeholder="••••••••" placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'} secureTextEntry={true} />
              <TouchableOpacity style={styles.botaoSalvar} onPress={() => { Platform.OS === 'web' ? window.alert('Senha atualizada com segurança!') : Alert.alert('Segurança', 'Senha atualizada com segurança!'); setModalSegurancaVisivel(false); }}><Text style={styles.textoBotaoSalvar}>Atualizar Senha</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal animationType="slide" transparent={true} visible={modalCategoriasVisivel} onRequestClose={() => setModalCategoriasVisivel(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalFundo}>
            <View style={styles.modalConteudo}>
              <View style={styles.modalCabecalho}><Text style={styles.modalTitulo}>Gerenciar Categorias</Text><TouchableOpacity onPress={() => setModalCategoriasVisivel(false)}><Text style={styles.modalFechar}>X</Text></TouchableOpacity></View>
              <Text style={styles.labelPequeno}>Nova Categoria:</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15}}><TextInput style={[styles.input, {flex: 1, marginRight: 10, paddingVertical: 10}]} placeholder="Ex: Faculdade" placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'} value={novaCategoriaNome} onChangeText={setNovaCategoriaNome} /><TouchableOpacity style={styles.btnAdicionarCategoria} onPress={adicionarCategoria}><Feather name="plus" size={20} color="#FFF" /></TouchableOpacity></View>
              <Text style={styles.labelPequeno}>Escolha a Cor:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
                {coresDisponiveis.map(cor => (<TouchableOpacity key={cor} style={[styles.bolinhaCor, {backgroundColor: cor}, novaCategoriaCor === cor && styles.bolinhaCorAtiva]} onPress={() => setNovaCategoriaCor(cor)} />))}
              </ScrollView>
              <Text style={styles.labelPequeno}>Suas Categorias:</Text>
              <FlatList data={categorias} keyExtractor={item => item.id} style={{maxHeight: 300}} renderItem={({item}) => (
                <View style={styles.catEditRow}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}><View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: item.cor, marginRight: 10}} /><Text style={styles.catEditNome}>{item.nome}</Text></View>
                  <TouchableOpacity onPress={() => excluirCategoria(item.id, item.nome)} style={{padding: 5}}><Feather name="trash-2" size={20} color="#EF4444" /></TouchableOpacity>
                </View>
              )} />
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={menuAberto} transparent={true} animationType="fade" onRequestClose={() => setMenuAberto(false)}>
          <View style={styles.drawerOverlay}>
            <View style={styles.drawerContent}>
              <View style={styles.drawerHeader}>
                <View style={styles.avatarPlaceholder}><Feather name="user" size={32} color="#FFF" /></View>
                <Text style={styles.drawerName}>App Finanças</Text><Text style={styles.drawerSubtitle}>Gestão Inteligente</Text>
              </View>
              <ScrollView>
                <TouchableOpacity style={styles.drawerItem} onPress={() => { setMenuAberto(false); setTimeout(() => setAbaAtual('visao_anual'), 200); }}><Feather name="bar-chart-2" size={22} color={isDarkMode ? '#94A3B8' : '#64748B'} /><Text style={styles.drawerItemText}>Visão Anual</Text></TouchableOpacity>
                <TouchableOpacity style={styles.drawerItem} onPress={() => { setMenuAberto(false); setTimeout(() => setModalCategoriasVisivel(true), 200); }}><Feather name="tag" size={22} color={isDarkMode ? '#94A3B8' : '#64748B'} /><Text style={styles.drawerItemText}>Gerenciar Categorias</Text></TouchableOpacity>
                <TouchableOpacity style={styles.drawerItem}><Feather name="download" size={22} color={isDarkMode ? '#94A3B8' : '#64748B'} /><Text style={styles.drawerItemText}>Exportar Relatórios</Text></TouchableOpacity>
                <TouchableOpacity style={styles.drawerItem}><Feather name="settings" size={22} color={isDarkMode ? '#94A3B8' : '#64748B'} /><Text style={styles.drawerItemText}>Configurações</Text></TouchableOpacity>
              </ScrollView>
            </View>
            <TouchableOpacity style={styles.drawerCloseArea} activeOpacity={1} onPress={() => setMenuAberto(false)} />
          </View>
        </Modal>

      </SafeAreaView>
    </const dynamicStyles =>
  );
}

const dynamicStyles = (isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
  scrollContent: { flex: 1, backgroundColor: isDark ? '#0F172A' : '#FAFAFA' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal
