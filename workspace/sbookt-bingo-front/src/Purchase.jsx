import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from "axios";

export default function Purchase() {
    const navigate = useNavigate();
    const [sheets, setSheets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pendingRaffles, setPendingRaffles] = useState([]);
    const [selectedRaffle, setSelectedRaffle] = useState(null);
    const [stores, setStores] = useState([]);
    const [storeSearch, setStoreSearch] = useState('');
    const [selectedStore, setSelectedStore] = useState(null);
    const [showStoreResults, setShowStoreResults] = useState(false);
    const [selectedSheet, setSelectedSheet] = useState(null);
    const [formData, setFormData] = useState({
        amount: 1
    });

    useEffect(() => {
        const loadPending = async () => {
            try {
                const res = await axios.get('https://meuringo.com.br/raffle/pending');
                const data = res.data || [];
                setPendingRaffles(data.sort((a, b) => a.raffleDate.localeCompare(b.raffleDate)));
            } catch (err) { console.error(err); }
        };
        loadPending();
    }, []);

    useEffect(() => {
        // Agora limpa apenas se o campo estiver vazio
        if (storeSearch.length === 0) {
            setStores([]);
            setShowStoreResults(false);
            return;
        }

        // Debounce de 300ms para não sobrecarregar a API, mas inicia na primeira letra
        const timer = setTimeout(async () => {
            try {
                const res = await axios.get(`https://meuringo.com.br/store/search?name=${encodeURIComponent(storeSearch)}`);
                const data = res.data || [];
                setStores(Array.isArray(data) ? data : []);
                setShowStoreResults(true);
            } catch (err) {
                console.error(err);
                setStores([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [storeSearch]);

    const printAllSheets = () => {
        if (sheets.length === 0) return;
        const win = window.open("", "_blank");

        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    @page { margin: 0; size: auto; }
                    body { 
                        margin: 0; 
                        padding: 0; 
                        background: white; 
                        display: flex; 
                        flex-direction: column; 
                        align-items: center; 
                    }
                    .print-item { 
                        page-break-after: always; 
                        width: 100%; 
                        height: 100%;
                        display: flex; 
                        justify-content: center; 
                    }
                    .print-item:last-child { page-break-after: auto; }
                    img { 
                        width: 290px; 
                        height: auto; 
                        display: block;
                    }
                </style>
            </head>
            <body onload="window.print();window.close()">`;

        sheets.forEach(s => {
            html += `<div class="print-item"><img src="data:image/png;base64,${s.base64Image}"></div>`;
        });

        html += "</body></html>";
        win.document.write(html);
        win.document.close();
    };

    const handleCreateSheets = async (e) => {
        e.preventDefault();
        if (!selectedRaffle || !selectedStore) {
            alert("Por favor, selecione uma loja e um sorteio.");
            return;
        }
        setLoading(true);
        try {
            const dateObj = new Date(selectedRaffle.raffleDate);
            const payload = {
                ...formData,
                storeId: selectedStore.id,
                raffleDay: selectedRaffle.raffleDate.split('T')[0],
                raffleHour: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            const res = await axios.post('https://meuringo.com.br/sheet', [payload]);
            const data = res.data || [];
            setSheets(data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 p-10 text-white font-sans">
            {selectedSheet && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-10"
                    onClick={() => setSelectedSheet(null)}
                >
                    <div
                        className="relative max-w-lg bg-white p-4 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedSheet(null)}
                            className="absolute -top-12 right-0 text-white text-4xl font-black hover:text-yellow-500 transition-colors"
                        >
                            &times;
                        </button>
                        <img
                            src={`data:image/png;base64,${selectedSheet.base64Image}`}
                            alt="Cartela"
                            className="w-full h-auto rounded-lg shadow-inner"
                        />
                        <p className="text-black text-center mt-4 font-black uppercase tracking-widest text-sm italic">
                            Pré-visualização
                        </p>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-8">
                <button onClick={() => navigate('/')} className="bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2">
                    ← Voltar para o Bingo
                </button>

                {sheets.length > 0 && (
                    <button
                        onClick={printAllSheets}
                        className="bg-green-600 hover:bg-green-500 text-white font-black px-8 py-3 rounded-xl uppercase shadow-lg transition-all flex items-center gap-2 animate-pulse"
                    >
                        🖨️ Imprimir Todas ({sheets.length})
                    </button>
                )}
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-xl self-start">
                    <h2 className="text-4xl font-black text-yellow-500 mb-8 uppercase italic tracking-tighter">Gerar Cartelas</h2>
                    <form onSubmit={handleCreateSheets} className="space-y-6">
                        <div className="relative">
                            <label className="block text-xs font-black uppercase text-slate-500 mb-2">Nome da Loja</label>
                            <input
                                required
                                type="text"
                                placeholder="Digite o nome da loja..."
                                className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl outline-none focus:border-yellow-500 text-xl font-bold"
                                value={selectedStore ? selectedStore.name : storeSearch}
                                onChange={e => {
                                    setStoreSearch(e.target.value);
                                    setSelectedStore(null);
                                }}
                                onFocus={() => storeSearch.length > 0 && setShowStoreResults(true)}
                            />
                            {showStoreResults && stores.length > 0 && !selectedStore && (
                                <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden border-t-4 border-t-yellow-500">
                                    {stores.map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedStore(s);
                                                setShowStoreResults(false);
                                            }}
                                            className="w-full text-left p-5 hover:bg-yellow-500 hover:text-black font-bold transition-colors border-b border-slate-700 last:border-0 flex justify-between items-center group"
                                        >
                                            <span>{s.name}</span>
                                            <span className="text-[10px] opacity-50 group-hover:opacity-100 uppercase italic">Selecionar →</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase text-slate-500 mb-4">Selecione o Sorteio Disponível</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {pendingRaffles.map((raffle, idx) => {
                                    const date = new Date(raffle.raffleDate);
                                    const isSelected = selectedRaffle?.raffleDate === raffle.raffleDate;

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setSelectedRaffle(raffle)}
                                            className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all
                                                    ${isSelected
                                                ? 'bg-yellow-500 border-white text-black scale-105 shadow-lg'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                        >
                                                <span className="text-[10px] uppercase font-black">
                                                    {date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                                                </span>
                                            <span className="text-xl font-black">
                                                    {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            <span className="text-[10px] font-bold text-green-500 bg-black/20 px-2 rounded-full mt-1">
                                                    R$ {raffle.value.toFixed(2)}
                                                </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase text-slate-500 mb-2">Quantidade de Cartelas</label>
                            <input required type="number" min="1" className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl outline-none focus:border-yellow-500 text-xl font-bold"
                                   value={formData.amount} onChange={e => setFormData({...formData, amount: parseInt(e.target.value) || 1})} />
                        </div>

                        <button type="submit" disabled={loading || !selectedRaffle || !selectedStore} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-6 rounded-2xl uppercase text-2xl shadow-lg transition-all disabled:opacity-50">
                            {loading ? 'Processando...' : 'Confirmar Registro'}
                        </button>
                    </form>
                </div>

                <div className="bg-slate-900/40 rounded-[2rem] border border-slate-800/50 p-6 flex flex-col h-[700px]">
                    <h3 className="text-xl font-black text-slate-500 mb-6 uppercase tracking-widest text-center border-b border-slate-800 pb-4">Cartelas Geradas</h3>
                    <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                        {sheets.length > 0 ? sheets.map((s, i) => (
                            <div key={i} className="bg-slate-900 border border-slate-700 p-6 rounded-3xl flex justify-between items-center hover:border-yellow-500/50 transition-colors group">
                                <div className="cursor-pointer flex-1" onClick={() => setSelectedSheet(s)}>
                                    <p className="font-black text-2xl text-white group-hover:text-yellow-500 transition-colors">{s.storeName}</p>
                                    <p className="text-sm text-slate-500 font-mono mt-1">
                                        📅 {new Date(s.raffleDate).toLocaleDateString()} | ⏰ {new Date(s.raffleDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedSheet(s)}
                                        className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl transition-all border border-slate-600"
                                        title="Visualizar"
                                    >
                                        👁️
                                    </button>
                                    <div className="text-slate-500 font-bold italic text-xs uppercase hidden md:flex items-center ml-2">Registrada ✓</div>
                                </div>
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