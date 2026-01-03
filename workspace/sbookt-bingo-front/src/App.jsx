
import { useState, useEffect, useRef } from 'react'

function App() {
    const [numbers, setNumbers] = useState([])
    const [winners, setWinners] = useState([])
    const [dailyWinners, setDailyWinners] = useState([])
    const [nextRaffleTime, setNextRaffleTime] = useState('')
    const [currentBall, setCurrentBall] = useState(null)
    const [isStarted, setIsStarted] = useState(false)
    const [showStartMessage, setShowStartMessage] = useState(false)
    const [audioUnlocked, setAudioUnlocked] = useState(false)

    const numbersRef = useRef([])
    const audioInstanceRef = useRef(new Audio('/victory.mp3'))

    useEffect(() => {
        numbersRef.current = numbers
    }, [numbers])

    // --- Desbloqueio de Áudio ---
    const unlockAudio = () => {
        setAudioUnlocked(true);
        const audio = audioInstanceRef.current;
        audio.play().then(() => {
            audio.pause();
            audio.currentTime = 0;
        }).catch(() => {});
        if ('speechSynthesis' in window) {
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
        }
    };

    // --- Narração (Francisca - Microsoft Edge) ---
    const speakNumber = (num) => {
        if (!('speechSynthesis' in window)) return;
        const synth = window.speechSynthesis;
        synth.cancel();

        const createUtterance = (text) => {
            const utterance = new SpeechSynthesisUtterance(text);
            const voices = synth.getVoices();
            const selectedVoice = voices.find(v => v.name.includes('Francisca'))
                || voices.find(v => v.name.includes('Antonio'))
                || voices.find(v => v.name.includes('Google') && v.lang.includes('pt-BR'))
                || voices.find(v => v.lang.includes('pt-BR'));

            if (selectedVoice) utterance.voice = selectedVoice;
            utterance.lang = 'pt-BR';
            utterance.rate = 0.70;
            return utterance;
        };

        const firstPart = createUtterance(`Próximo Número.  .  .  .  . ${num}`);
        firstPart.onend = () => {
            setTimeout(() => {
                let secondText = (num >= 10)
                    ? `${num.toString()[0]} . . . ${num.toString()[1]}`
                    : `${num}`;
                synth.speak(createUtterance(secondText));
            }, 1000);
        };
        synth.speak(firstPart);
    };

    // --- Música de Vitória ---
    const playVictoryMusic = () => {
        if (!audioUnlocked) return;
        const audio = audioInstanceRef.current;
        audio.volume = 0.5;
        audio.loop = false;
        audio.currentTime = 0;
        audio.play().catch(e => console.error("Erro música:", e));
    };

    // --- Horários (15 em 15 min) ---
    const calculateRaffleSchedule = () => {
        const now = new Date();
        const minutes = now.getMinutes();
        const nextInterval = Math.ceil((minutes + 0.1) / 15) * 15;
        let nextHour = now.getHours();
        let nextMin = nextInterval;
        if (nextInterval === 60) { nextHour += 1; nextMin = 0; }
        if (nextHour >= 20) return "AMANHÃ ÀS 09:00";
        return `${String(nextHour).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`;
    };

    const getCurrentRaffleTime = () => {
        const now = new Date();
        const currentInterval = Math.floor(now.getMinutes() / 15) * 15;
        return `${String(now.getHours()).padStart(2, '0')}:${String(currentInterval).padStart(2, '0')}`;
    };

    // --- Efeito Inicial (Relógio e Limpeza) ---
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNextRaffleTime(calculateRaffleSchedule());
        const timer = setInterval(() => setNextRaffleTime(calculateRaffleSchedule()), 30000);

        const initialCheck = async () => {
            try {
                const res = await fetch('/raffle/is-started');
                const started = await res.json();
                if (started) {
                    setIsStarted(true);
                } else {
                    setIsStarted(false);
                    setNumbers([]);
                    setWinners([]);
                    setCurrentBall(null);
                }
            } catch (e) { console.error(e); }
        };
        initialCheck();

        const loadVoices = () => window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();

        return () => clearInterval(timer);
    }, []);

    // --- 1. Verificação de Status (Minuto a Minuto) ---
    useEffect(() => {
        const checkStatus = async () => {
            if (isStarted) return;
            try {
                const res = await fetch('/raffle/is-started');
                const started = await res.json();
                if (started) {
                    setIsStarted(true);
                    setShowStartMessage(true);
                    setTimeout(() => setShowStartMessage(false), 10000);
                }
            } catch (e) { console.error(e); }
        };
        const statusTimer = setInterval(checkStatus, 60000);
        checkStatus();
        return () => clearInterval(statusTimer);
    }, [isStarted]);

    // --- 2. Ciclo de Polling Rápido (A cada segundo se isStarted === true) ---
    useEffect(() => {
        if (!isStarted) return;
        let isMounted = true;
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        const raffleLoop = async () => {
            while (isMounted && isStarted) {
                try {
                    // Chama /raffle a cada segundo
                    const resRaffle = await fetch('/raffle');
                    const data = await resRaffle.json();

                    if (Array.isArray(data) && data.length > 0) {
                        const lastNum = Number(data[data.length - 1]);

                        if (!numbersRef.current.includes(lastNum)) {
                            setNumbers(data.map(Number));
                            setCurrentBall(lastNum);
                            speakNumber(lastNum);

                            // Chama /raffle/validate-winners logo após detectar número novo
                            const resWin = await fetch('/raffle/validate-winners');
                            const winText = await resWin.text();

                            if (winText) {
                                const winnersData = JSON.parse(winText);
                                if (Array.isArray(winnersData) && winnersData.length > 0) {
                                    setCurrentBall(null);
                                    setWinners(winnersData);
                                    playVictoryMusic();
                                    await sleep(30000); // 30s de festa
                                    audioInstanceRef.current.pause();
                                    setWinners([]);
                                    setNumbers([]);
                                    setIsStarted(false); // Volta para verificação minuto a minuto
                                    break;
                                }
                            }
                            await sleep(4000);
                            setCurrentBall(null);
                        }
                    }
                } catch (e) { console.error(e); }
                await sleep(1000); // Intervalo de 1 segundo
            }
        };

        raffleLoop();
        return () => { isMounted = false; };
    }, [isStarted, audioUnlocked]);

    // Loop da Barra Lateral (Prêmios do Dia)
    useEffect(() => {
        let isMounted = true;
        const fetchDaily = async () => {
            while (isMounted) {
                try {
                    const res = await fetch('/winner/today');
                    if (res.ok) setDailyWinners(await res.json());
                } catch (e) { console.error(e); }
                await new Promise(r => setTimeout(r, 10000));
            }
        };
        fetchDaily();
        return () => { isMounted = false; };
    }, []);

    return (
        <div className="flex min-h-screen bg-slate-950 text-white overflow-hidden font-sans">
            {!audioUnlocked && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl">
                    <button onClick={unlockAudio} className="bg-yellow-500 hover:bg-yellow-400 text-black px-12 py-6 rounded-3xl font-black text-3xl shadow-[0_0_50px_rgba(234,179,8,0.4)] animate-pulse">
                        🔊 ATIVAR SOM DO BINGO
                    </button>
                </div>
            )}
            {showStartMessage && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 bg-yellow-500 text-black px-10 py-5 rounded-2xl font-black text-2xl animate-bounce border-4 border-white shadow-2xl">
                    A PRÓXIMA RODADA VAI COMEÇAR!
                </div>
            )}
            {currentBall && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
                    <div className="text-center animate-bounce">
                        <p className="text-2xl font-black mb-5 tracking-[0.5em] uppercase">PRÓXIMO NÚMERO</p>
                        <div className="w-80 h-80 bg-white text-slate-950 rounded-full flex items-center justify-center text-[10rem] font-black border-[12px] border-slate-200 shadow-2xl">
                            {currentBall}
                        </div>
                    </div>
                </div>
            )}
            <div className="flex-1 flex flex-col items-center p-10 space-y-10 overflow-y-auto">
                <h1 className="text-9xl font-black text-yellow-500 italic flex gap-x-20 uppercase tracking-tighter">
                    <span>NEW</span><span>BINGO</span>
                </h1>
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl text-center">
                    <div className="flex items-center justify-center space-x-3 mb-2">
                        <div className={`w-4 h-4 rounded-full ${isStarted ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-2xl font-bold uppercase">{isStarted ? 'Rodada Em Andamento' : 'Aguardando próxima rodada'}</span>
                    </div>
                    <p className="text-slate-500 text-sm font-black tracking-widest">PRÓXIMA RODADA: {nextRaffleTime}</p>
                </div>
                {winners.length > 0 && (
                    <div className="w-full max-w-2xl bg-red-600 p-10 rounded-[3rem] border-8 border-white text-center animate-pulse shadow-[0_0_80px_rgba(220,38,38,0.6)]">
                        <h2 className="text-5xl font-black italic mb-4 uppercase">BINGO!</h2>
                        {winners.map((w, i) => <div key={i} className="text-6xl font-extrabold text-white drop-shadow-lg">{w.storeName}</div>)}
                    </div>
                )}
                <div className="grid grid-cols-10 gap-4 p-10 bg-slate-900/50 rounded-[3rem] border border-slate-800">
                    {Array.from({ length: 75 }, (_, i) => i + 1).map(n => (
                        <div key={n} className={`w-12 h-12 flex items-center justify-center rounded-full border-2 font-black text-xl transition-all duration-500
                            ${numbers.includes(n) ? 'bg-white border-white text-slate-950 scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'bg-slate-800/40 border-slate-700 text-slate-600'}`}>
                            {n}
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-96 bg-slate-900 border-l border-slate-800 p-8 flex flex-col h-screen shadow-2xl">
                <h2 className="text-2xl font-black text-yellow-500 mb-8 uppercase italic tracking-widest border-b border-slate-800 pb-4 text-center">🏆 Premios do Dia</h2>
                <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                    {dailyWinners.length > 0 ? dailyWinners.map((w, i) => (
                        <div key={i} className="bg-slate-800/40 p-5 rounded-3xl border border-slate-700">
                            <p className="font-black text-white text-xl">{w.storeName}</p>
                            <div className="flex justify-between items-end mt-2">
                                <p className="text-xs text-slate-500 font-mono font-bold">
                                    HORÁRIO: {new Date(w.raffleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-green-400 font-black text-xl tracking-tighter">R$ {w.prizeValue.toFixed(2)}</p>
                            </div>
                        </div>
                    )) : <p className="opacity-20 text-center mt-10 font-black uppercase tracking-widest text-xs">Vazio</p>}
                </div>
            </div>
        </div>
    );
}

export default App;