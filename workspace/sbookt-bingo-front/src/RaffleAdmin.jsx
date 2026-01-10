import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from "axios";

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

            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black text-yellow-500 uppercase italic leading-none">Gestão Ringo</h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Painel Administrativo</p>
                    </div>
                    <button onClick={() => navigate('/')} className="bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 border border-slate-700">
                        ← Voltar ao Bingo
                    </button>
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