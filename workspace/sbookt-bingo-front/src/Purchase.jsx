import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Funções Utilitárias
const generateTimeOptions = () => {
    const times = [];
    for (let hour = 9; hour <= 19; hour++) {
        ['00', '30'].forEach(min => {
            times.push(`${String(hour).padStart(2, '0')}:${min}`);
        });
    }
    return times;
};

const getNextWorkDays = () => {
    const days = [];
    let current = new Date();
    while (days.length < 10) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Pula 0 (Dom) e 6 (Sab)
            days.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }
    return days;
};

export default function Purchase() {
    const navigate = useNavigate();
    const [sheets, setSheets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        storeId: '',
        raffleDay: '',
        raffleHour: '09:00',
        amount: 1
    });

    const handleCreateSheets = async (e) => {
        e.preventDefault();
        if (!formData.raffleDay) {
            alert("Por favor, selecione um dia.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([formData])
            });
            const data = await res.json();
            setSheets(data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 p-10 text-white font-sans">
            <div className="flex justify-between items-center mb-8">
                <button onClick={() => navigate('/')} className="bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2">
                    ← Voltar para o Bingo
                </button>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Lado Esquerdo: Formulário */}
                <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-xl self-start">
                    <h2 className="text-4xl font-black text-yellow-500 mb-8 uppercase italic tracking-tighter">Gerar Cartelas</h2>
                    <form onSubmit={handleCreateSheets} className="space-y-6">
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-500 mb-2">ID da Loja</label>
                            <input required type="number" className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl outline-none focus:border-yellow-500 text-xl font-bold"
                                   value={formData.storeId} onChange={e => setFormData({...formData, storeId: parseInt(e.target.value) || ''})} />
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase text-slate-500 mb-4">Selecione o Dia (Segunda a Sexta)</label>
                            <div className="grid grid-cols-5 gap-2">
                                {getNextWorkDays().map((date, idx) => {
                                    const dateStr = date.toISOString().split('T')[0];
                                    const isSelected = formData.raffleDay === dateStr;
                                    const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
                                    const dayNum = date.getDate();
                                    const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, raffleDay: dateStr })}
                                            className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all
                                                ${isSelected
                                                ? 'bg-yellow-500 border-white text-black scale-105 shadow-lg'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                        >
                                            <span className="text-[10px] uppercase font-black">{dayName}</span>
                                            <span className="text-xl font-black">{dayNum}</span>
                                            <span className="text-[10px] uppercase">{monthName}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Hora do Sorteio</label>
                                <select
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl outline-none focus:border-yellow-500 font-bold appearance-none cursor-pointer text-xl"
                                    value={formData.raffleHour}
                                    onChange={e => setFormData({...formData, raffleHour: e.target.value})}
                                >
                                    {generateTimeOptions().map(time => (
                                        <option key={time} value={time}>{time}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Quantidade</label>
                                <input required type="number" min="1" className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl outline-none focus:border-yellow-500 text-xl font-bold"
                                       value={formData.amount} onChange={e => setFormData({...formData, amount: parseInt(e.target.value) || 1})} />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-6 rounded-2xl uppercase text-2xl shadow-lg transition-all disabled:opacity-50">
                            {loading ? 'Processando...' : 'Confirmar Registro'}
                        </button>
                    </form>
                </div>

                {/* Lado Direito: Listagem */}
                <div className="bg-slate-900/40 rounded-[2rem] border border-slate-800/50 p-6 flex flex-col h-[700px]">
                    <h3 className="text-xl font-black text-slate-500 mb-6 uppercase tracking-widest text-center border-b border-slate-800 pb-4">Lote Atual</h3>
                    <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                        {sheets.length > 0 ? sheets.map((s, i) => (
                            <div key={i} className="bg-slate-900 border border-slate-700 p-6 rounded-3xl flex justify-between items-center hover:border-yellow-500/50 transition-colors group">
                                <div>
                                    <p className="font-black text-2xl text-white group-hover:text-yellow-500 transition-colors">{s.storeName}</p>
                                    <p className="text-sm text-slate-500 font-mono mt-1">
                                        📅 {new Date(s.raffleDate).toLocaleDateString()} | ⏰ {new Date(s.raffleDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                                <div className="text-slate-500 font-bold italic text-sm">Registrada ✓</div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-20">
                                <span className="text-6xl mb-4 text-white">📄</span>
                                <p className="font-black uppercase tracking-tighter text-white">Nenhuma cartela gerada</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}