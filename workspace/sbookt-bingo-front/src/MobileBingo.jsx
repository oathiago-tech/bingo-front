import { useEffect, useRef, useState } from 'react'
import { playBeep, speakNumber, speakStartMessage, getCurrentRaffleTime } from './bingoUtils'

function MobileBingo() {
    const [numbers, setNumbers] = useState([])
    const [winners, setWinners] = useState([])
    const [dailyWinners, setDailyWinners] = useState([])
    const [dailyRaffles, setDailyRaffles] = useState([])
    const [currentBall, setCurrentBall] = useState(null)
    const [isStarted, setIsStarted] = useState(false)
    const [showStartMessage, setShowStartMessage] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString())
    const [audioUnlocked, setAudioUnlocked] = useState(false);

    const [showRafflesModal, setShowRafflesModal] = useState(false)
    const [showWinnersModal, setShowWinnersModal] = useState(false)

    const numbersRef = useRef([])
    const audioInstanceRef = useRef(new Audio('/victory.mp3'));

    useEffect(() => { numbersRef.current = numbers }, [numbers])

    const playVictoryMusic = () => {
        const audio = audioInstanceRef.current;
        audio.volume = 0.8;
        audio.loop = false;
        audio.currentTime = 0;
        audio.play().catch(e => console.error("Erro vitória mobile:", e));
    };

    // --- Relógio ---
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

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
        }).catch(() => {});

        if ('speechSynthesis' in window) {
            const synth = window.speechSynthesis;
            const ut = new SpeechSynthesisUtterance(" ");
            ut.volume = 0;
            synth.speak(ut);
        }
    };

    // --- Polling de Status ---
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

    // --- Loop de Sorteio ---
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
                            if (winText && winText.trim().length > 0) {
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

    // --- Polling Ganhadores e Hoje ---
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

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white font-sans overflow-hidden">
            {!audioUnlocked && (
                <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 text-center">
                    <button onClick={unlockAudioAction} className="bg-yellow-500 text-black px-12 py-6 rounded-full font-black text-2xl animate-pulse border-4 border-white shadow-[0_0_50px_rgba(234,179,8,0.4)]">
                        🔊 ATIVAR SOM
                    </button>
                </div>
            )}

            {showStartMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[120] bg-yellow-500 text-black px-8 py-6 rounded-3xl font-black text-xl animate-bounce border-4 border-white shadow-2xl text-center w-[80%]">
                    A PRÓXIMA RODADA VAI COMEÇAR!
                </div>
            )}

            {/* Header Principal */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-50">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-yellow-500 italic uppercase leading-none">RINGO</h1>
                    <p className="text-yellow-500 font-black uppercase tracking-[0.2em] text-[8px] italic mt-1 animate-bounce-rotate">Seu dia de sorte</p>
                </div>
                <div className="text-base font-mono text-yellow-500 font-bold bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 shrink-0">{currentTime}</div>
            </div>

            {/* Barra de Ações e Status (Integrada) */}
            <div className="px-4 py-2 flex items-center justify-between gap-2 bg-slate-900/50 border-b border-slate-800/50">
                <button
                    onClick={() => setShowRafflesModal(true)}
                    className="flex flex-col items-center justify-center w-12 h-12 bg-slate-800 rounded-xl border border-slate-700 active:scale-90 transition-transform shadow-lg"
                >
                    <span className="text-lg">📅</span>
                </button>

                <div className="flex-1 bg-slate-900 h-12 rounded-xl border border-slate-800 flex items-center justify-center space-x-2 shadow-inner">
                    <div className={`w-2 h-2 rounded-full ${isStarted ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        {isStarted ? 'Rodada em Andamento' : 'Aguardando Sorteio'}
                    </span>
                </div>

                <button
                    onClick={() => setShowWinnersModal(true)}
                    className="flex flex-col items-center justify-center w-12 h-12 bg-slate-800 rounded-xl border border-slate-700 active:scale-90 transition-transform shadow-lg"
                >
                    <span className="text-lg">🏆</span>
                </button>
            </div>

            {/* Modais Mobile */}
            {showRafflesModal && (
                <div className="fixed inset-0 z-[110] bg-slate-950/95 backdrop-blur-xl p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-yellow-500 uppercase">Sorteios de Hoje</h2>
                        <button onClick={() => setShowRafflesModal(false)} className="text-3xl">&times;</button>
                    </div>
                    <div className="flex-1 space-y-3 overflow-y-auto">
                        {dailyRaffles.map((r, i) => {
                            const timeString = new Date(r.raffleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const isActive = isStarted && timeString === getCurrentRaffleTime();
                            return (
                                <div key={i} className={`p-4 rounded-2xl border ${isActive ? 'bg-yellow-500 text-black border-white' : 'bg-slate-900 border-slate-800'} flex justify-between`}>
                                    <span className="font-mono font-bold text-lg">{timeString}</span>
                                    <span className="font-black text-lg">R$ {r.value.toFixed(2)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {showWinnersModal && (
                <div className="fixed inset-0 z-[110] bg-slate-950/95 backdrop-blur-xl p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-yellow-500 uppercase">Ganhadores de Hoje</h2>
                        <button onClick={() => setShowWinnersModal(false)} className="text-3xl">&times;</button>
                    </div>
                    <div className="flex-1 space-y-3 overflow-y-auto">
                        {dailyWinners.length > 0 ? dailyWinners.map((w, i) => (
                            <div key={i} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700">
                                <p className="font-black text-white">{w.storeName}</p>
                                <div className="flex justify-between mt-1">
                                    <span className="text-[10px] text-slate-500">{new Date(w.raffleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="text-green-400 font-black text-sm">R$ {w.prizeValue.toFixed(2)}</span>
                                </div>
                            </div>
                        )) : <p className="text-center opacity-30 mt-10 uppercase font-black text-xs">Ninguém ganhou ainda.</p>}
                    </div>
                </div>
            )}

            <main className="flex-1 p-4 space-y-4 overflow-y-auto">
                {currentBall && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm bg-black/10">
                        <div className="w-64 h-64 bg-white rounded-full flex items-center justify-center text-9xl font-black text-slate-950 border-[12px] border-yellow-500 animate-bounce shadow-2xl">{currentBall}</div>
                    </div>
                )}
                {winners.length > 0 && (
                    <div className="bg-red-600 p-6 rounded-3xl border-4 border-white text-center animate-pulse shadow-[0_0_40px_rgba(220,38,38,0.5)]">
                        <h2 className="text-3xl font-black uppercase italic">RINGO!</h2>
                        {winners.map((w, i) => <p key={i} className="text-xl font-extrabold">- {w.storeName}</p>)}
                    </div>
                )}

                <div className="grid grid-cols-6 gap-2 p-2 bg-slate-900/50 rounded-2xl border border-slate-800 shadow-inner">
                    {Array.from({ length: 75 }, (_, i) => i + 1).map(n => (
                        <div key={n} className={`aspect-square flex items-center justify-center rounded-full border text-sm font-black transition-all ${numbers.includes(n) ? 'bg-white text-slate-950 border-white shadow-lg scale-105' : 'bg-slate-800/40 border-slate-700 text-slate-600'}`}>{n}</div>
                    ))}
                </div>
            </main>

            {/* Footer Discreto */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-center items-center sticky bottom-0 z-50">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">
                    Sorteios Automáticos • Ringo Bingo
                </p>
            </div>
        </div>
    );
}

export default MobileBingo;