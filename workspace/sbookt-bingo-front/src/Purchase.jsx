import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Purchase() {
    const navigate = useNavigate();
    const [sheets, setSheets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ storeId: '', raffleDay: '', raffleHour: '', amount: 1 });

    const printSheet = (base64) => {
        const win = window.open("");
        win.document.write(`<img src="data:image/png;base64,${base64}" style="width:100%" onload="window.print();window.close()">`);
    };

    const handleCreateSheets = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([formData])
            });
            const data = await res.json();
            setSheets(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 p-10 text-white font-sans">
            <button onClick={() => navigate('/')} className="mb-8 bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded-xl font-bold transition-all">
                ← Voltar para o Bingo
            </button>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-xl">
                    <h2 className="text-4xl font-black text-yellow-500 mb-8 uppercase italic tracking-tighter">Gerar Cartelas</h2>
                    <form onSubmit={handleCreateSheets} className="space-y-6">
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-500 mb-2">ID da Loja</label>
                            <input required type="number" className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl outline-none focus:border-yellow-500 text-xl font-bold"
                                   value={formData.storeId} onChange={e => setFormData({...formData, storeId: parseInt(e.target.value)})} />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Data do Sorteio</label>
                                <input required type="date" className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl outline-none focus:border-yellow-500 font-bold"
                                       value={formData.raffleDay} onChange={e => setFormData({...formData, raffleDay: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Hora</label>
                                <input required type="time" className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl outline-none focus:border-yellow-500 font-bold"
                                       value={formData.raffleHour} onChange={e => setFormData({...formData, raffleHour: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-500 mb-2">Quantidade de Cartelas</label>
                            <input required type="number" min="1" className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl outline-none focus:border-yellow-500 text-xl font-bold"
                                   value={formData.amount} onChange={e => setFormData({...formData, amount: parseInt(e.target.value)})} />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-6 rounded-2xl uppercase text-2xl shadow-lg transition-all disabled:opacity-50">
                            {loading ? 'Processando...' : 'Confirmar Registro'}
                        </button>
                    </form>
                </div>

                <div className="bg-slate-900/40 rounded-[2rem] border border-slate-800/50 p-6 flex flex-col h-[700px]">
                    <h3 className="text-xl font-black text-slate-500 mb-6 uppercase tracking-widest text-center border-b border-slate-800 pb-4">Cartelas Geradas</h3>
                    <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                        {sheets.length > 0 ? sheets.map((s, i) => (
                            <div key={i} className="bg-slate-900 border border-slate-700 p-6 rounded-3xl flex justify-between items-center hover:border-yellow-500/50 transition-colors group">
                                <div>
                                    <p className="font-black text-2xl text-white group-hover:text-yellow-500 transition-colors">{s.storeName}</p>
                                    <p className="text-sm text-slate-500 font-mono mt-1">
                                        📅 {new Date(s.raffleDate).toLocaleDateString()} | ⏰ {new Date(s.raffleDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                                <button onClick={() => printSheet(s.base64Image)} className="bg-white hover:bg-yellow-500 text-black p-4 rounded-2xl transition-all shadow-xl active:scale-95">
                                    <span className="text-2xl font-bold">🖨️ IMPRIMIR</span>
                                </button>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-20">
                                <span className="text-6xl mb-4">📄</span>
                                <p className="font-black uppercase tracking-tighter">Nenhuma cartela no lote</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}