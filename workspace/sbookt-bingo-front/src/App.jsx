import {useEffect, useRef, useState} from 'react'
import './App.css'
import {
    playBeep,
    speakNumber,
    speakStartMessage,
    calculateRaffleSchedule,
    getCurrentRaffleTime,
    fetchStatus,
    fetchDailyData
} from './RingoUtils.js'
import axios from "axios";

function App() {
    const [numbers, setNumbers] = useState([])
    const [winners, setWinners] = useState([])
    const [dailyWinners, setDailyWinners] = useState([])
    const [dailyRaffles, setDailyRaffles] = useState([])
    const [nextRaffleTime, setNextRaffleTime] = useState('')
    const [currentBall, setCurrentBall] = useState(null)
    const [isStarted, setIsStarted] = useState(false)
    const [showStartMessage, setShowStartMessage] = useState(false)
    const [audioUnlocked, setAudioUnlocked] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString())

    const numbersRef = useRef([])
    const audioInstanceRef = useRef(new Audio('/victory.mp3'))

    useEffect(() => {
        numbersRef.current = numbers
    }, [numbers])

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
        const unlockAudio = () => {
            playBeep();
            const audio = audioInstanceRef.current;
            audio.muted = true;
            audio.play().then(() => {
                setTimeout(() => {
                    audio.pause();
                    audio.muted = false;
                    audio.currentTime = 0;
                }, 100);
                setAudioUnlocked(true);
            }).catch(() => {
            });
            window.removeEventListener('click', unlockAudio);
        };
        window.addEventListener('click', unlockAudio);
        return () => {
            clearInterval(timer);
            window.removeEventListener('click', unlockAudio);
        };
    }, []);

    useEffect(() => {
        const update = () => setNextRaffleTime(calculateRaffleSchedule());
        update();
        const timer = setInterval(update, 30000);
        const dailyUpdate = async () => {
            const data = await fetchDailyData();
            setDailyWinners(data.winners);
            setDailyRaffles(data.raffles);
        };
        dailyUpdate();
        const dailyTimer = setInterval(dailyUpdate, 10000);
        return () => {
            clearInterval(timer);
            clearInterval(dailyTimer);
        };
    }, []);

    useEffect(() => {
        const check = async () => {
            const started = await fetchStatus();
            if (started && !isStarted) {
                setIsStarted(true);
                setShowStartMessage(true);
                speakStartMessage();
                setTimeout(() => setShowStartMessage(false), 10000);
            } else if (!started) {
                setIsStarted(false);
            }
        };
        const timer = setInterval(check, 15000);
        check();
        return () => clearInterval(timer);
    }, [isStarted]);

    useEffect(() => {
        if (!isStarted) return;
        let isMounted = true;
        const loop = async () => {
            while (isMounted && isStarted) {
                try {
                    const res = await axios.get('https://meuringo.com.br/ringo/raffle/');
                    const data = res.data;
                    if (res.status === 500 || data?.code === 500) {
                        setIsStarted(false);
                        break;
                    }
                    if (Array.isArray(data) && data.length > 0) {
                        const last = Number(data[data.length - 1]);
                        if (!numbersRef.current.includes(last)) {
                            const prevCount = numbersRef.current.length;
                            setNumbers(data.map(Number));
                            setCurrentBall(last);
                            speakNumber(last, prevCount);
                            const resWin = await axios.get('https://meuringo.com.br/ringo/raffle/validate-winners');
                            const winData = resWin.data;
                            await setCurrentBall(null);
                            if (winData && Array.isArray(winData) && winData.length > 0) {
                                setWinners(winData);
                                audioInstanceRef.current.play();
                                await new Promise(r => setTimeout(r, 15000));
                                audioInstanceRef.current.pause();
                                setWinners([]);
                                setNumbers([]);
                                setIsStarted(false);
                                break;
                            }
                            await new Promise(r => setTimeout(r, 4000));
                            setCurrentBall(null);
                        }
                    }
                } catch (e) {
                }
                await new Promise(r => setTimeout(r, 1000));
            }
        };
        loop();
        return () => {
            isMounted = false;
        };
    }, [isStarted]);

    return (
        <div className="flex h-screen bg-slate-950 text-white overflow-hidden font-sans">
            {!audioUnlocked && <div
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] bg-yellow-500/20 text-yellow-500 px-4 py-1 rounded-full text font-black uppercase animate-pulse border border-yellow-500/30">⚠️
                Ativar Som</div>}
            {showStartMessage && <div
                className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-yellow-500 text-black px-16 py-12 rounded-[3rem] font-black text-4xl animate-bounce border-[10px] border-white shadow-2xl">A
                PRÓXIMA RODADA VAI COMEÇAR!</div>}
            {currentBall && <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
                <div
                    className="w-80 h-80 bg-white text-slate-950 rounded-full flex items-center justify-center text-[10rem] font-black border-[12px] shadow-2xl animate-bounce">{currentBall}</div>
            </div>}

            <div className="w-90 bg-slate-900 border-r border-slate-800 p-6 flex flex-col shadow-5xl">
                <h2 className="text-xl font-black text-yellow-500 mb-6 uppercase text-center border-b border-slate-800 pb-4 animate-pulse">📅
                    Próximos Sorteios</h2>
                <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                    {dailyRaffles.map((r, i) => {
                        const raffleTimeString = new Date(r.raffleDate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        });

                        const isActiveByStatus = String(r.status || '').toUpperCase() === 'STARTED';
                        const isActiveFallback = isStarted && raffleTimeString === getCurrentRaffleTime();
                        const isActive = isActiveByStatus || isActiveFallback;

                        return (
                            <div
                                key={r.id ?? i}
                                className={`p-4 rounded-2xl border flex justify-between items-center ${
                                    isActive ? 'bg-yellow-500 border-white shadow-xl z-0' : 'bg-slate-800/30 border-slate-800'
                                }`}
                            >
                                <div className="flex flex-col">
                                    <span
                                        className={`font-mono text-xl font-bold ${isActive ? 'text-black' : 'text-slate-300'}`}>
                                        {raffleTimeString}
                                    </span>
                                    <span
                                        className={`text-[10px] font-black uppercase ${isActive ? 'text-black/70' : 'text-slate-500'}`}>
                                        {r.status}
                                    </span>
                                </div>
                                <span className={`font-black text-lg ${isActive ? 'text-black' : 'text-green-500'}`}>
                                    R$ {r.value.toFixed(2)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center p-6 space-y-6 overflow-y-auto">
                <div className="flex flex-col items-center w-full">
                    <div className="flex items-center justify-center gap-10">
                        <h1 className="text-9xl font-black text-yellow-500 italic uppercase ringo-3d">RINGO</h1>
                        <div
                            className="bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-800 shadow-2xl">
                            <span className="text-2xl font-black text-yellow-500 font-mono">{currentTime}</span></div>
                    </div>
                    <p className="text-yellow-500 font-black uppercase tracking-[0.3em] text-xl italic mt-[-0px] animate-bounce">Seu
                        dia de sorte</p>
                </div>
                <div
                    className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xl text-center w-full max-w-md">
                    <div className="flex items-center justify-center space-x-3 mb-1">
                        <div
                            className={`w-3 h-3 rounded-full ${isStarted ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></div>
                        <span
                            className="text-xl font-bold uppercase">{isStarted ? 'Rodada Em Andamento' : 'Aguardando a próxima rodada'}</span>
                    </div>
                </div>
                {winners.length > 0 && <div
                    className="w-full max-w-5xl bg-red-600 p-8 rounded-[3rem] border-8 border-white text-center animate-pulse shadow-2xl">{winners.map((w, i) =>
                    <div key={i} className="text-2xl font-extrabold text-white">- {w.storeName}</div>)}</div>}
                <div
                    className="grid grid-cols-10 gap-3 p-8 bg-slate-900/50 rounded-[3rem] border border-slate-800 shadow-2xl">{Array.from({length: 75}, (_, i) => i + 1).map(n =>
                    <div key={n}
                         className={`w-16 h-16 flex items-center justify-center rounded-full border-2 font-black transition-all ${numbers.includes(n) ? 'bg-white border-white text-slate-950 scale-110 shadow-xl' : 'bg-slate-800/40 border-slate-700 text-slate-600 animate-pulse'}`}>{n}</div>)}</div>
                <div
                    className="flex justify-center items-center sticky bottom-0 z-50 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Sorteios
                    Automáticos de 30 em 30 minutos • Ringo
                </div>
            </div>

            <div className="w-96 bg-slate-900 border-l border-slate-800 p-8 flex flex-col shadow-2xl">
                <h2 className="text-2xl font-black text-yellow-500 mb-8 uppercase text-center border-b border-slate-800 pb-4 animate-pulse">🏆
                    Prêmios do dia</h2>
                <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">{dailyWinners.map((w, i) => <div
                    key={i} className="bg-slate-800/40 p-5 rounded-3xl border border-slate-700"><p
                    className="font-black text-white text-xl">{w.storeName}</p>
                    <div className="flex justify-between items-end mt-2"><p
                        className="text-xs text-slate-500 font-mono font-bold">{new Date(w.raffleDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p><p
                        className="text-green-400 font-black text-xl animate-bounce">R$ {w.prizeValue.toFixed(2)}</p>
                    </div>
                </div>)}</div>
            </div>
        </div>
    );
}

export default App;