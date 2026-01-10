import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import './App.css'

export default function RaffleAdmin() {
    const navigate = useNavigate();
    const [pendingRaffles, setPendingRaffles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [formData, setFormData] = useState({
        raffleDate: '',
        value: ''
    });

    const loadPending = async () => {
        try {
            const res = await axios.get('https://meuringo.com.br/ringo/raffle/pending');
            if (res.data && Array.isArray(res.data)) {
                setPendingRaffles(res.data.sort((a, b) => a.raffleDate.localeCompare(b.raffleDate)));
            }
        } catch (err) {
            console.error("Erro ao carregar sorteios:", err);
        }
    };

    useEffect(() => {
        loadPending();
        const timer = setInterval(loadPending, 10000);
        return () => clearInterval(timer);
    }, []);

    const handleCreateRaffle = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post('https://meuringo.com.br/ringo/raffle', {
                raffleDate: formData.raffleDate,
                value: parseFloat(formData.value)
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.status === 200 || res.status === 201) {
                setFormData({ raffleDate: '', value: '' });
                await loadPending();
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 4000);
            }
        } catch (err) {
            console.error("Erro ao criar sorteio:", err);
            alert("Erro ao cadastrar: Verifique se o endpoint /raffle/save está correto no backend.");
        } finally {
            setLoading(false);
        }
    };

    const startRaffle = async (raffleId) => {
        try {
            const res = await axios.post(
                "https://meuringo.com.br/ringo/raffle/start",
                null,
                {
                    params: { id: raffleId }
                }
            );

            if (res.status >= 200 && res.status < 300) {
                console.log("Sorteio iniciado com sucesso!", { status: res.status, data: res.data });
                setPendingRaffles((prev) => prev.filter((r) => r.id !== raffleId));
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            } else {
                console.error("Erro ao iniciar sorteio: status", res.status, res.data);
                alert(`Erro ao iniciar sorteio (status ${res.status}).`);
            }
        } catch (err) {
            console.error("Erro ao iniciar sorteio:", err);
        }
    };

    // =========================
    // Configs Modal (NOVO)
    // =========================
    const [showConfigsModal, setShowConfigsModal] = useState(false);
    const [configsLoading, setConfigsLoading] = useState(false);
    const [configsSavingKey, setConfigsSavingKey] = useState(null);
    const [configsError, setConfigsError] = useState('');
    const [configs, setConfigs] = useState([]); // {configKey, configValue, isNew, dirty}

    const openConfigs = async () => {
        setShowConfigsModal(true);
        setConfigsError('');
        await loadConfigs();
    };

    const closeConfigs = () => {
        setShowConfigsModal(false);
        setConfigsError('');
        setConfigsSavingKey(null);
    };

    const loadConfigs = async () => {
        setConfigsLoading(true);
        setConfigsError('');
        try {
            const res = await axios.get('https://meuringo.com.br/ringo/configs');
            const data = Array.isArray(res.data) ? res.data : [];
            setConfigs(
                data.map((c) => ({
                    configKey: String(c.configKey ?? ''),
                    configValue: String(c.configValue ?? ''),
                    isNew: false,
                    dirty: false,
                }))
            );
        } catch (err) {
            console.error("Erro ao carregar configs:", err);
            setConfigsError('Erro ao carregar configurações.');
        } finally {
            setConfigsLoading(false);
        }
    };

    const updateConfigRow = (idx, patch) => {
        setConfigs((prev) => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...patch };
            return copy;
        });
    };

    const addConfigRow = () => {
        setConfigsError('');
        setConfigs((prev) => [
            ...prev,
            { configKey: '', configValue: '', isNew: true, dirty: true }
        ]);
    };

    const saveConfigRow = async (idx) => {
        const row = configs[idx];
        const configKey = String(row.configKey || '').trim();
        const configValue = String(row.configValue ?? '');

        if (!configKey) {
            setConfigsError('O campo "Key" é obrigatório.');
            return;
        }

        // evitar duplicados ao criar
        if (row.isNew) {
            const exists = configs.some((r, i) => i !== idx && String(r.configKey || '').trim() === configKey && !r.isNew);
            if (exists) {
                setConfigsError(`Já existe uma configuração com key "${configKey}".`);
                return;
            }
        }

        setConfigsSavingKey(configKey);
        setConfigsError('');
        try {
            await axios.post(
                'https://meuringo.com.br/ringo/configs',
                { configKey, configValue },
                { headers: { 'Content-Type': 'application/json' } }
            );

            // Depois de salvar, key não pode ser editado
            updateConfigRow(idx, {
                configKey,
                configValue,
                isNew: false,
                dirty: false,
            });

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            console.error("Erro ao salvar config:", err);
            setConfigsError(`Erro ao salvar "${configKey}".`);
        } finally {
            setConfigsSavingKey(null);
        }
    };

    const handleBlurConfigValue = async (idx) => {
        const row = configs[idx];
        if (!row?.dirty) return;
        await saveConfigRow(idx);
    };

    const handleKeyDownModal = (e) => {
        if (e.key === 'Escape') closeConfigs();
    };

    return (
        <div className="min-h-screen bg-slate-950 p-6 text-white font-sans">
            {showSuccess && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] transition-all animate-bounce">
                    <div className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black uppercase shadow-2xl border-4 border-white flex items-center gap-3">
                        <span className="text-2xl">✨</span>
                        Operação Realizada!
                    </div>
                </div>
            )}

            {showConfigsModal && (
                <div
                    className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-4"
                    onKeyDown={handleKeyDownModal}
                    tabIndex={-1}
                >
                    <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex flex-col">
                                <h2 className="text-2xl font-black text-yellow-500 uppercase">Configurações</h2>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                                    Edite o Value e saia do campo para salvar
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={addConfigRow}
                                    className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl font-black transition-all border border-slate-700"
                                >
                                    ➕ Adicionar
                                </button>
                                <button
                                    onClick={loadConfigs}
                                    className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl font-black transition-all border border-slate-700"
                                >
                                    🔄 Recarregar
                                </button>
                                <button
                                    onClick={closeConfigs}
                                    className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl font-black transition-all border border-red-400/30"
                                >
                                    ✕ Fechar
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {configsError && (
                                <div className="mb-4 bg-red-600/20 border border-red-500/30 text-red-200 p-4 rounded-2xl font-bold">
                                    {configsError}
                                </div>
                            )}

                            {configsLoading ? (
                                <div className="opacity-60 font-bold">Carregando configurações...</div>
                            ) : (
                                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {configs.length > 0 ? configs.map((c, idx) => {
                                        const keyTrim = String(c.configKey || '').trim();
                                        const busy = configsSavingKey && configsSavingKey === keyTrim;

                                        return (
                                            <div
                                                key={`${c.configKey || 'new'}-${idx}`}
                                                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-3 items-center"
                                            >
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">
                                                        Key {c.isNew ? '(novo)' : '(travado)'}
                                                    </label>
                                                    <input
                                                        value={c.configKey}
                                                        disabled={!c.isNew}
                                                        onChange={(e) => updateConfigRow(idx, { configKey: e.target.value, dirty: true })}
                                                        className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl outline-none focus:border-yellow-500 font-bold text-white transition-colors disabled:opacity-70"
                                                        placeholder="ex: botAmount"
                                                    />
                                                </div>

                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">
                                                        Value
                                                    </label>
                                                    <input
                                                        value={c.configValue}
                                                        onChange={(e) => updateConfigRow(idx, { configValue: e.target.value, dirty: true })}
                                                        onBlur={() => handleBlurConfigValue(idx)}
                                                        className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl outline-none focus:border-yellow-500 font-bold text-white transition-colors"
                                                        placeholder='ex: "7000" ou "false"'
                                                    />
                                                </div>

                                                <div className="w-[170px] pt-6">
                                                    <button
                                                        onClick={() => saveConfigRow(idx)}
                                                        disabled={busy || (!c.isNew && !c.dirty)}
                                                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 rounded-xl uppercase shadow-lg transition-all disabled:opacity-50"
                                                    >
                                                        {busy ? 'Salvando...' : 'Salvar'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="flex flex-col items-center justify-center py-16 opacity-30">
                                            <span className="text-6xl mb-6">⚙️</span>
                                            <p className="font-black uppercase tracking-[0.2em]">Nenhuma configuração encontrada</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black text-yellow-500 uppercase italic leading-none">Gestão Ringo</h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Painel Administrativo</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={openConfigs}
                            className="bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 border border-slate-700"
                        >
                            ⚙️ Configurações
                        </button>

                        <button onClick={() => navigate('/')} className="bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 border border-slate-700">
                            ← Voltar ao Bingo
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-xl h-fit sticky top-6">
                        <h2 className="text-xl font-black text-white mb-6 uppercase flex items-center gap-2">
                            <span className="text-yellow-500">➕</span> Novo Sorteio
                        </h2>
                        <form onSubmit={handleCreateRaffle} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Data e Hora do Evento</label>
                                <input
                                    required
                                    type="datetime-local"
                                    className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none focus:border-yellow-500 font-bold text-white transition-colors"
                                    value={formData.raffleDate}
                                    onChange={e => setFormData({...formData, raffleDate: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Valor do Prêmio (R$)</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none focus:border-yellow-500 font-bold text-white transition-colors"
                                    value={formData.value}
                                    onChange={e => setFormData({...formData, value: e.target.value})}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-5 rounded-xl uppercase shadow-lg transition-all disabled:opacity-50 text-lg"
                            >
                                {loading ? 'Processando...' : 'Cadastrar Sorteio'}
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-2 bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800/50 shadow-xl">
                        <h2 className="text-xl font-black text-white mb-6 uppercase flex items-center gap-2">
                            <span className="text-yellow-500">📅</span> Sorteios Aguardando
                        </h2>
                        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                            {pendingRaffles.length > 0 ? pendingRaffles.map((r) => (
                                <div key={r.id || r.raffleDate} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex justify-between items-center group hover:border-yellow-500/30 transition-all shadow-inner">
                                    <div className="flex gap-6 items-center">
                                        <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl text-center min-w-[90px] group-hover:bg-slate-700 transition-colors">
                                            <p className="text-[10px] uppercase font-black text-slate-500">Horário</p>
                                            <p className="text-2xl font-black text-yellow-500">
                                                {new Date(r.raffleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg text-white">
                                                {new Date(r.raffleDate).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                                            </p>
                                            <p className="text-green-500 font-black flex items-center gap-1 uppercase text-sm">
                                                💰 Prêmio: R$ {r.value.toFixed(2)} {!r.id && <span className="text-red-500 ml-2 animate-pulse">(SEM ID NA API)</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => startRaffle(r.id)}
                                        className="bg-green-600 hover:bg-green-500 text-white font-black px-8 py-4 rounded-2xl uppercase text-sm shadow-xl transition-all flex items-center gap-2 active:scale-95"
                                    >
                                        ▶ Iniciar
                                    </button>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center py-32 opacity-20">
                                    <span className="text-7xl mb-6">🏜️</span>
                                    <p className="font-black uppercase tracking-[0.2em]">Nada programado por enquanto</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}