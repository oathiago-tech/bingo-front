// --- Áudio ---
import axios from "axios";

export const playBeep = () => {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        const audioCtx = new AudioContextClass();

        // No iOS/Safari, o context pode começar em state 'suspended'
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // Nota Lá (A5)

        // Volume inicial mais audível
        gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
        // Decaimento suave
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
        console.error("Erro ao emitir bip:", e);
    }
};

export function speakNumber(number, prevCount = 0) {
    const prefix = prevCount === 0 ? 'Primeiro número' : 'Próximo número';

    const digitWord = (d) => {
        const map = {
            0: 'zero',
            1: 'um',
            2: 'dois',
            3: 'três',
            4: 'quatro',
            5: 'cinco',
            6: 'seis',
            7: 'sete',
            8: 'oito',
            9: 'nove',
        };
        return map[d] ?? String(d);
    };

    const asDigitsSpeech = (n) => {
        if (!Number.isFinite(n)) return String(n);

        // 1..9 -> "zero um" ... "zero nove"
        if (Number.isInteger(n) && n >= 1 && n <= 9) {
            return `zero ${digitWord(n)}`;
        }

        // 10..99 -> "quatro sete", "dois oito", etc.
        const s = String(Math.trunc(n));
        return s.split('').map(ch => digitWord(Number(ch))).join(' ');
    };

    const n = Number(number);

    const text = `${prefix} ${n}, ${asDigitsSpeech(n)}`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

export const speakStartMessage = () => {
    if (!('speechSynthesis' in window)) return;

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(
        "A próxima rodada vai começar!"
    );

    const voices = synth.getVoices();
    const selectedVoice =
        voices.find(v => v.name === 'Luciana');

    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.lang = 'pt-BR';
    synth.cancel();
    synth.speak(utterance);
};

// --- Lógica de horários ---
export const calculateRaffleSchedule = () => {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    if (hour < 9 || hour >= 19) return "09:00";
    const nextInterval = Math.ceil((minutes + 0.1) / 15) * 15;
    let nextHour = hour;
    let nextMin = nextInterval;
    if (nextInterval === 60) {
        nextHour += 1;
        nextMin = 0;
    }
    if (nextHour >= 19 && nextMin > 0) return "09:00";
    return `${String(nextHour).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`;
};

export const getCurrentRaffleTime = () => {
    const now = new Date();
    const currentInterval = Math.floor(now.getMinutes() / 15) * 15;
    return `${String(now.getHours()).padStart(2, '0')}:${String(currentInterval).padStart(2, '0')}`;
};

export const fetchStatus = async () => {
    try {
        const res = await axios.get('https://meuringo.com.br/ringo/raffle/is-started');
        return res.data;
    } catch (e) {
        return false;
    }
};

export const fetchDailyData = async () => {
    try {
        const [resWinners, resRaffles] = await Promise.all([
            fetch('https://meuringo.com.br/ringo/winner/today', {headers: {Accept: 'application/json'}}),
            fetch('https://meuringo.com.br/ringo/raffle/today', {headers: {Accept: 'application/json'}})
        ]);

        if (!resWinners.ok || !resRaffles.ok) {
            console.warn('fetchDailyData HTTP error:', resWinners.status, resRaffles.status);
            return {winners: [], raffles: []};
        }

        const winners = await resWinners.json().catch(() => []);
        const raffles = await resRaffles.json().catch(() => []);

        const safeWinners = Array.isArray(winners) ? winners : [];
        const safeRaffles = Array.isArray(raffles) ? raffles : [];

        return {
            winners: safeWinners,
            raffles: safeRaffles.sort((a, b) => {
                if (!a?.raffleDate || !b?.raffleDate) return 0;
                return String(a.raffleDate).localeCompare(String(b.raffleDate));
            })
        };
    } catch (e) {
        console.error('Erro ao carregar sorteios:', e);
        return {winners: [], raffles: []};
    }
};
