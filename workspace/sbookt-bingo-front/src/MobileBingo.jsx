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
import axios from 'axios';

function MobileBingo() {
    const [numbers, setNumbers] = useState([])
    const [winners, setWinners] = useState([])
    const [dailyWinners, setDailyWinners] = useState([])
    const [dailyRaffles, setDailyRaffles] = useState([])
    const [currentBall, setCurrentBall] = useState(null)
    const [isStarted, setIsStarted] = useState(false)
    const [showStartMessage, setShowStartMessage] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString())
    const [audioUnlocked, setAudioUnlocked] = useState(false)
    const [showRafflesModal, setShowRafflesModal] = useState(false)
    const [showWinnersModal, setShowWinnersModal] = useState(false)

    const numbersRef = useRef([])
    const audioInstanceRef = useRef(new Audio('/victory.mp3'))

    useEffect(() => {
        numbersRef.current = numbers
    }, [numbers])

    const unlockAudioAction = () => {
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
        if ('speechSynthesis' in window) {
            const ut = new SpeechSynthesisUtterance(" ");
            ut.volume = 0;
            window.speechSynthesis.speak(ut);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
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
                            if (winData && Array.isArray(winData) && winData.length > 0) {
                                setCurrentBall(null);
                                setWinners(winData);
                                await audioInstanceRef.current.play();
                                await new Promise(r => setTimeout(r, 30000));
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
        <div className="flex flex-col h-screen bg-slate-950 text-white font-sans overflow-hidden">
            {!audioUnlocked && (
                <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-6 text-center">
                    <button onClick={unlockAudioAction}
                            className="bg-yellow-500 text-black px-12 py-6 rounded-full font-black text-2xl border-4 border-white shadow-2xl">🔊
                        ATIVAR SOM
                    </button>
                </div>
            )}
            {showStartMessage && (
                <div
                    className="fixed top-20 left-1/2 -translate-x-1/2 z-[120] bg-yellow-500 text-black px-8 py-6 rounded-3xl font-black text-xl animate-bounce border-4 border-white text-center w-[80%]">A
                    PRÓXIMA RODADA VAI COMEÇAR!</div>
            )}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-50">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-yellow-500 italic uppercase ringo-3d-mobile">RINGO</h1>
                    <p className="text-yellow-500 font-black uppercase text-[8px] italic animate-bounce">Seu dia
                        de sorte</p>
                </div>
                <div
                    className="text-base font-mono text-yellow-500 font-bold bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 shrink-0">{currentTime}</div>
            </div>
            <div
                className="px-4 py-2 flex items-center justify-between gap-2 bg-slate-900/50 border-b border-slate-800/50">
                <button onClick={() => setShowRafflesModal(true)}
                        className="w-12 h-12 bg-slate-800 rounded-xl border border-slate-700 active:scale-90 flex items-center justify-center shadow-lg">📅
                </button>
                <div
                    className="flex-1 bg-slate-900 h-12 rounded-xl border border-slate-800 flex items-center justify-center space-x-2 shadow-inner">
                    <div
                        className={`w-2 h-2 rounded-full ${isStarted ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span
                        className="text-[10px] font-black uppercase tracking-widest">{isStarted ? 'Rodada em Andamento' : 'Aguardando a Próxima Rodada'}</span>
                </div>
                <button onClick={() => setShowWinnersModal(true)}
                        className="w-12 h-12 bg-slate-800 rounded-xl border border-slate-700 active:scale-90 flex items-center justify-center shadow-lg">🏆
                </button>
            </div>
            {showRafflesModal && (
                <div className="fixed inset-0 z-[110] bg-slate-950/95 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6"><h2
                        className="text-xl font-black text-yellow-500 animate-pulse">📅 Próximos Sorteios</h2>
                        <button onClick={() => setShowRafflesModal(false)} className="text-3xl">&times;</button>
                    </div>
                    <div className="flex-1 space-y-3 overflow-y-auto">
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
                                    className={`p-4 rounded-2xl border ${
                                        isActive ? 'bg-yellow-500 text-black border-white' : 'bg-slate-900 border-slate-800'
                                    } flex justify-between`}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-mono font-bold">{raffleTimeString}</span>
                                        <span className={`text-[10px] font-black uppercase ${isActive ? 'text-black/70' : 'text-slate-500'}`}>
                                            {r.status}
                                        </span>
                                    </div>
                                    <span className="font-black">R$ {r.value.toFixed(2)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {showWinnersModal && (
                <div className="fixed inset-0 z-[110] bg-slate-950/95 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6"><h2
                        className="text-xl font-black text-yellow-500 animate-pulse">🏆 Prêmios do dia</h2>
                        <button onClick={() => setShowWinnersModal(false)} className="text-3xl">&times;</button>
                    </div>
                    <div
                        className="flex-1 space-y-3 overflow-y-auto">{dailyWinners.length > 0 ? dailyWinners.map((w, i) =>
                        <div key={i} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700"><p
                            className="font-black text-white">{w.storeName}</p>
                            <div className="flex justify-between mt-1"><span
                                className="text-[10px] text-slate-500">{new Date(w.raffleDate).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</span><span
                                className="text-green-400 font-black animate-bounce">R$ {w.prizeValue.toFixed(2)}</span>
                            </div>
                        </div>) : <p className="text-center opacity-30 mt-10">Ninguém ganhou ainda.</p>}</div>
                </div>
            )}
            <main className="flex-1 p-4 overflow-y-auto">
                {currentBall && <div
                    className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm bg-black/10">
                    <div
                        className="w-64 h-64 bg-white rounded-full flex items-center justify-center text-9xl font-black text-slate-950 border-[12px] border-yellow-500 animate-bounce shadow-2xl">{currentBall}</div>
                </div>}
                {winners.length > 0 && <div
                    className="bg-red-600 p-6 rounded-3xl border-4 border-white text-center animate-pulse mb-4 shadow-lg">{winners.map((w, i) =>
                    <p key={i} className="text-xl font-extrabold">- {w.storeName}</p>)}</div>}
                <div
                    className="grid grid-cols-6 gap-2 p-2 bg-slate-900/50 rounded-2xl border border-slate-800 shadow-inner">{Array.from({length: 75}, (_, i) => i + 1).map(n =>
                    <div key={n}
                         className={`aspect-square flex items-center justify-center rounded-full border text-sm font-black transition-all ${numbers.includes(n) ? 'bg-white text-slate-950 border-white shadow-lg scale-105 animate-pulse' : 'bg-slate-800/40 border-slate-700 text-slate-600'}`}>{n}</div>)}</div>
            </main>
            <div
                className="p-4 bg-slate-900 border-t border-slate-800 flex justify-center items-center sticky bottom-0 z-50 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Sorteios
                Automáticos de 30 em 30 minutos • Ringo
            </div>
        </div>
    );
}

export default MobileBingo;