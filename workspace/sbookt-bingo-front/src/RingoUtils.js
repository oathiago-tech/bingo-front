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
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Nota Lá (A5)
        
        // Volume inicial mais audível
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        // Decaimento suave
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) { 
        console.error("Erro ao emitir bip:", e); 
    }
};

export const speakNumber = (num, currentCount) => {
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

export const speakStartMessage = () => {
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

// --- Lógica de Horários ---
export const calculateRaffleSchedule = () => {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    if (hour < 9 || hour >= 19) return "09:00";
    const nextInterval = Math.ceil((minutes + 0.1) / 15) * 15;
    let nextHour = hour;
    let nextMin = nextInterval;
    if (nextInterval === 60) { nextHour += 1; nextMin = 0; }
    if (nextHour >= 19 && nextMin > 0) return "09:00";
    return `${String(nextHour).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`;
};

export const getCurrentRaffleTime = () => {
    const now = new Date();
    const currentInterval = Math.floor(now.getMinutes() / 15) * 15;
    return `${String(now.getHours()).padStart(2, '0')}:${String(currentInterval).padStart(2, '0')}`;
};

// --- Requisições API ---
export const fetchStatus = async () => {
    try {
        const res = await fetch('/ringo/raffle/is-started');
        return await res.json();
    } catch (e) { return false; }
};

export const fetchDailyData = async () => {
    try {
        const [resWinners, resRaffles] = await Promise.all([
            fetch('/winner/today'),
            fetch('/raffle/today')
        ]);
        const winners = resWinners.ok ? await resWinners.json() : [];
        const raffles = resRaffles.ok ? await resRaffles.json() : [];
        return { winners, raffles: raffles.sort((a, b) => a.raffleDate.localeCompare(b.raffleDate)) };
    } catch (e) { return { winners: [], raffles: [] }; }
};