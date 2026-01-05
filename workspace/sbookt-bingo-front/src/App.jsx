import {useEffect, useRef, useState} from 'react'
import { useNavigate } from 'react-router-dom'

function App() {
    const navigate = useNavigate();
    const [numbers, setNumbers] = useState([])
    const [winners, setWinners] = useState([])
    const [dailyWinners, setDailyWinners] = useState([])
    const [dailyRaffles, setDailyRaffles] = useState([])
    const [nextRaffleTime, setNextRaffleTime] = useState('')
    const [currentBall, setCurrentBall] = useState(null)
    const [isStarted, setIsStarted] = useState(false)
    const [showStartMessage, setShowStartMessage] = useState(false)
    const [audioUnlocked, setAudioUnlocked] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString())

    const numbersRef = useRef([])
    const audioInstanceRef = useRef(new Audio('/victory.mp3'))

    useEffect(() => {
        numbersRef.current = numbers
    }, [numbers])

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const speakNumber = (num, currentCount) => {
        if (!('speechSynthesis' in window)) return;
        const synth = window.speechSynthesis;
        synth.cancel();

        const createUtterance = (text) => {
            const utterance = new SpeechSynthesisUtterance(text);
            const voices = synth.getVoices();
            const selectedVoice = voices.find(v => v.name.includes('Antonio'))
                || voices.find(v => v.name.includes('Google') && v.lang.includes('pt-BR'))
                || voices.find(v => v.lang.includes('pt-BR'));

            if (selectedVoice) utterance.voice = selectedVoice;
            utterance.lang = 'pt-BR';
            utterance.rate = 0.70;
            return utterance;
        };

        const prefix = currentCount === 0 ? "Primeiro Número" : "Próximo Número";
        const firstPart = createUtterance(`${prefix}.  .  .  .  . ${num}`);

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

    const speakStartMessage = () => {
        if (!('speechSynthesis' in window)) return;
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance("A Próxima rodada vai começar");
        const voices = synth.getVoices();
        const selectedVoice = voices.find(v => v.name.includes('Antonio')) || voices.find(v => v.lang.includes('pt-BR'));
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.lang = 'pt-BR';
        utterance.rate = 0.9;
        synth.speak(utterance);
    };

    const playVictoryMusic = () => {
        if (!audioUnlocked) return;
        const audio = audioInstanceRef.current;
        audio.volume = 0.5;
        audio.loop = false;
        audio.currentTime = 0;
        audio.play().catch(e => console.error("Erro música:", e));
    };

    const calculateRaffleSchedule = () => {
        const now = new Date();
        const minutes = now.getMinutes();
        const nextInterval = Math.ceil((minutes + 0.1) / 15) * 15;
        let nextHour = now.getHours();
        let nextMin = nextInterval;
        if (nextInterval === 60) { nextHour += 1; nextMin = 0; }
        if (nextHour >= 20) return "09:00";
        return `${String(nextHour).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`;
    };

    useEffect(() => {
        setNextRaffleTime(calculateRaffleSchedule());
        const timer = setInterval(() => setNextRaffleTime(calculateRaffleSchedule()), 30000);

        const initialCheck = async () => {
            try {
                const res = await fetch('/raffle/is-started');
                const started = await res.json();
                if (started) { setIsStarted(true); } else {
                    setIsStarted(false);
                    setNumbers([]);
                    setWinners([]);
                    setCurrentBall(null);
                }
            } catch (e) { console.error(e); }
        };
        initialCheck();
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const checkStatus = async () => {
            if (isStarted) return;
            try {
                const res = await fetch('/raffle/is-started');
                const started = await res.json();
                if (started) {
                    setIsStarted(true);
                    setShowStartMessage(true);
                    speakStartMessage();
                    setTimeout(() => setShowStartMessage(false), 10000);
                }
            } catch (e) { console.error(e); }
        };
        const statusTimer = setInterval(checkStatus, 15000);
        checkStatus();
        return () => clearInterval(statusTimer);
    }, [isStarted]);

    useEffect(() => {
        if (!isStarted) return;
        let isMounted = true;
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        const raffleLoop = async () => {
            while (isMounted && isStarted) {
                try {
                    const resRaffle = await fetch('/raffle');
                    const data = await resRaffle.json();
                    if (resRaffle.status === 500 || (data && data.code === 500)) {
                        setIsStarted(false);
                        break;
                    }
                    if (Array.isArray(data) && data.length > 0) {
                        const lastNum = Number(data[data.length - 1]);
                        if (!numbersRef.current.includes(lastNum)) {
                            const prevCount = numbersRef.current.length;
                            setNumbers(data.map(Number));
                            setCurrentBall(lastNum);
                            speakNumber(lastNum, prevCount);
                            const resWin = await fetch('/raffle/validate-winners');
                            const winText = await resWin.text();
                            if (winText) {
                                const winnersData = JSON.parse(winText);
                                if (Array.isArray(winnersData) && winnersData.length > 0) {
                                    setCurrentBall(null);
                                    setWinners(winnersData);
                                    playVictoryMusic();
                                    await sleep(30000);
                                    audioInstanceRef.current.pause();
                                    setWinners([]);
                                    setNumbers([]);
                                    setIsStarted(false);
                                    break;
                                }
                            }
                            await sleep(4000);
                            setCurrentBall(null);
                        }
                    }
                } catch (e) { console.error(e); }
                await sleep(1000);
            }
        };
        raffleLoop();
        return () => { isMounted = false; };
    }, [isStarted]);

    useEffect(() => {
        let isMounted = true;
        const fetchDaily = async () => {
            while (isMounted) {
                try {
                    const res = await fetch('/winner/today');
                    if (res.ok) setDailyWinners(await res.json());
                    const resRaffles = await fetch('/raffle/today');
                    if (resRaffles.ok) {
                        const data = await resRaffles.json();
                        setDailyRaffles(data.sort((a, b) => a.raffleDate.localeCompare(b.raffleDate)));
                    }
                } catch (e) { console.error(e); }
                await new Promise(r => setTimeout(r, 10000));
            }
        };
        fetchDaily();
        return () => { isMounted = false; };
    }, []);

    const getCurrentRaffleTime = () => {
        const now = new Date();
        const currentInterval = Math.floor(now.getMinutes() / 15) * 15;
        return `${String(now.getHours()).padStart(2, '0')}:${String(currentInterval).padStart(2, '0')}`;
    };

    return (
        <div className="flex h-screen bg-slate-950 text-white overflow-hidden font-sans">
            {showStartMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-yellow-500 text-black px-16 py-12 rounded-[3rem] font-black text-4xl animate-bounce border-[10px] border-white shadow-[0_0_100px_rgba(234,179,8,0.6)]">
                    A PRÓXIMA RODADA VAI COMEÇAR!
                </div>
            )}
            {currentBall && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm">
                    <div className="text-center animate-bounce">
                        <div className="w-80 h-80 bg-white text-slate-950 rounded-full flex items-center justify-center text-[10rem] font-black border-[12px] border-slate-200 shadow-2xl">
                            {currentBall}
                        </div>
                    </div>
                </div>
            )}

            <div className="w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col shrink-0 shadow-5xl">
                <h2 className="text-xl font-black text-yellow-500 mb-6 uppercase italic tracking-widest border-b border-slate-800 pb-4 text-center animate-pulse">📅 Sorteios de Hoje</h2>
                <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                    {dailyRaffles.length > 0 ? dailyRaffles.map((r, i) => {
                        const raffleTime = new Date(r.raffleDate);
                        const raffleTimeString = raffleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const isActive = isStarted && raffleTimeString === getCurrentRaffleTime();
                        const isPast = (new Date(r.raffleDate) - new Date()) < 0 && !isActive;
                        return (
                            <div key={i} className={`p-4 rounded-2xl border transition-all duration-500 flex justify-between items-center ${isActive ? 'bg-yellow-500 border-white scale-105 shadow-[0_0_20px_rgba(234,179,8,0.4)] z-10' : isPast ? 'bg-slate-800/10 border-slate-900 opacity-30 grayscale' : 'bg-slate-800/30 border-slate-800'}`}>
                                <div className="flex flex-col">
                                    <span className={`font-mono text-xl font-bold ${isActive ? 'text-black' : 'text-slate-300'}`}>{raffleTimeString}</span>
                                    {isActive && <span className="text-[8px] font-black text-black animate-pulse">EM ANDAMENTO</span>}
                                </div>
                                <span className={`font-black text-lg ${isActive ? 'text-black' : 'text-green-500'}`}>R$ {r.value.toFixed(2)}</span>
                            </div>
                        );
                    }) : <p className="opacity-20 text-center mt-10 font-black uppercase tracking-widest text-xs">Carregando...</p>}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col items-center w-full relative">
                    <div className="flex items-center justify-center w-full relative">
                        {/* Título centralizado */}
                        <h1 className="text-9xl font-black text-yellow-500 italic uppercase tracking-tighter">
                            <span>RINGO</span>
                        </h1>

                        {/* Relógio posicionado ao lado, mas sem empurrar o título do centro */}
                        <div className="ml-10 bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-800 shadow-2xl">
                            <span className="text-1xl font-black text-yellow-500 font-mono tracking-widest">{currentTime}</span>
                        </div>
                    </div>
                    <p className="text-yellow-500 font-black uppercase tracking-[0.3em] text-xl italic mt-[-10px] animate-bounce-rotate text-center">Seu dia de sorte</p>
                </div>

                <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xl text-center w-full max-w-md">
                    <div className="flex items-center justify-center space-x-3 mb-1">
                        <div className={`w-3 h-3 rounded-full ${isStarted ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></div>
                        <span className="text-xl font-bold uppercase">{isStarted ? 'Rodada Em Andamento' : 'Aguardando rodada'}</span>
                    </div>
                    <p className="text-slate-500 text-xs font-black tracking-widest uppercase">PRÓXIMA: {nextRaffleTime}</p>
                </div>

                {winners.length > 0 && (
                    <div className="w-full max-w-5xl bg-red-600 p-8 rounded-[3rem] border-8 border-white text-center animate-pulse shadow-[0_0_80px_rgba(220,38,38,0.6)]">
                        <h2 className="text-3xl font-black italic mb-4 uppercase animate-pulse">RINGO!</h2>
                        {winners.map((w, i) => <div key={i} className="text-2xl font-extrabold text-white drop-shadow-lg animate-pulse">- {w.storeName}</div>)}
                    </div>
                )}

                <div className="grid grid-cols-10 gap-3 p-8 bg-slate-900/50 rounded-[3rem] border border-slate-800 shadow-2xl">
                    {Array.from({length: 75}, (_, i) => i + 1).map(n => (
                        <div key={n} className={`w-16 h-16 flex items-center justify-center rounded-full border-2 font-black text-2xl transition-all duration-500 ${numbers.includes(n) ? 'bg-white border-white text-slate-950 scale-110 shadow-[0_0_20px_rgba(255,255,255,0.6)] animate-pulse' : 'bg-slate-800/40 border-slate-700 text-slate-600'}`}>
                            {n}
                        </div>
                    ))}
                </div>

                <div className="text-slate-700 text-[10px] font-bold uppercase tracking-[0.5em] pt-2">
                    Sorteios Automáticos • 09:00 - 19:00
                </div>
            </div>

            <div className="w-96 bg-slate-900 border-l border-slate-800 p-8 flex flex-col shrink-0 shadow-2xl">
                <h2 className="text-2xl font-black text-yellow-500 mb-8 uppercase italic tracking-widest border-b border-slate-800 pb-4 text-center animate-pulse">🏆 Prêmios do Dia</h2>
                <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                    {dailyWinners.length > 0 ? dailyWinners.map((w, i) => (
                        <div key={i} className="bg-slate-800/40 p-5 rounded-3xl border border-slate-700">
                            <p className="font-black text-white text-xl">{w.storeName}</p>
                            <div className="flex justify-between items-end mt-2">
                                <p className="text-xs text-slate-500 font-mono font-bold">HORÁRIO: {new Date(w.raffleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                <p className="text-green-400 font-black text-xl tracking-tighter animate-bounce">R$ {w.prizeValue.toFixed(2)}</p>
                            </div>
                        </div>
                    )) : <p className="opacity-20 text-center mt-10 font-black uppercase tracking-widest text-xs">Vazio</p>}
                </div>
            </div>
        </div>
    );
}

export default App;