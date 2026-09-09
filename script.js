let wordDatabase = JSON.parse(localStorage.getItem('spellingAdaptiveDB')) || {};
let customLevelsDB = JSON.parse(localStorage.getItem('spellingCustomLevels')) || {}; 
let soundEnabled = JSON.parse(localStorage.getItem('spellingSound')) ?? true;
let vibrationEnabled = JSON.parse(localStorage.getItem('spellingVibrate')) ?? true;

let sessionQueue = []; let targetWord = ""; let tempBuilderWords = []; 
let sessionTotal = 0; let sessionCompleted = 0; let sessionAttempts = 0; let sessionCorrectAttempts = 0;

// Variabel Global untuk Kalkulasi Penguasaan (Mastery)
let currentRawData = [];
let currentCategoryTitle = "";

const btnListen = document.getElementById('btn-listen');
const btnSubmit = document.getElementById('btn-submit');
const btnNext = document.getElementById('btn-next');
const wordInput = document.getElementById('word-input');
const feedbackArea = document.getElementById('feedback-area');
const sessionStats = document.getElementById('session-stats');
const fileStatus = document.getElementById('file-status');
const progressBar = document.getElementById('progress-bar');
const idleText = document.getElementById('idle-text');

// Audio & Haptic
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
function initAudio() { if (!audioCtx) audioCtx = new AudioContext(); if (audioCtx.state === 'suspended') audioCtx.resume(); }
window.addEventListener('click', initAudio, { once: true });
window.addEventListener('keydown', initAudio, { once: true });

function playFeedbackTone(isCorrect) {
    if (!audioCtx || !soundEnabled) return; initAudio(); 
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (isCorrect) {
        osc.type = 'sine'; osc.frequency.setValueAtTime(650, now);
        gain.gain.setValueAtTime(0.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(180, now);
        gain.gain.setValueAtTime(0.6, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
        osc.start(now); osc.stop(now + 0.09);
    }
}
function triggerVibration(isCorrect) {
    if (!vibrationEnabled || !('vibrate' in navigator)) return;
    if (isCorrect) navigator.vibrate(15); else navigator.vibrate([40, 50, 40]); 
}

// Settings Modal
const settingsModal = document.getElementById('settings-modal');
document.getElementById('btn-settings-toggle').addEventListener('click', () => settingsModal.classList.remove('hidden'));
document.getElementById('btn-close-settings').addEventListener('click', () => { settingsModal.classList.add('hidden'); if(!wordInput.classList.contains('hidden')) wordInput.focus(); });
window.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });

const btnToggleSound = document.getElementById('toggle-sound');
const btnToggleVibrate = document.getElementById('toggle-vibrate');
function updatePrefs() {
    btnToggleSound.textContent = soundEnabled ? 'suara: aktif' : 'suara: mati'; btnToggleSound.classList.toggle('active', soundEnabled);
    btnToggleVibrate.textContent = vibrationEnabled ? 'getar: aktif' : 'getar: mati'; btnToggleVibrate.classList.toggle('active', vibrationEnabled);
}
updatePrefs();
btnToggleSound.addEventListener('click', () => { soundEnabled = !soundEnabled; localStorage.setItem('spellingSound', soundEnabled); updatePrefs(); if(soundEnabled) initAudio(); });
btnToggleVibrate.addEventListener('click', () => { vibrationEnabled = !vibrationEnabled; localStorage.setItem('spellingVibrate', vibrationEnabled); updatePrefs(); if(vibrationEnabled) triggerVibration(true); });

// -- ADMIN DATABASE (TERMASUK RESET PENGUASAAN) --
document.getElementById('btn-reset-mastery').addEventListener('click', () => { 
    if(confirm("Ulangi progres penguasaan dari 0%? (Kata yang sudah benar akan muncul kembali)")) {
        Object.keys(wordDatabase).forEach(w => { wordDatabase[w].correct = 0; wordDatabase[w].wrong = 0; });
        localStorage.setItem('spellingAdaptiveDB', JSON.stringify(wordDatabase)); alert("Progres penguasaan berhasil di-reset ke 0%.");
        if(activeCategory) initSession(); // Refresh antarmuka
    }
});
document.getElementById('btn-reset-weak').addEventListener('click', () => { Object.keys(wordDatabase).forEach(w => wordDatabase[w].wrongCount = 0); localStorage.setItem('spellingAdaptiveDB', JSON.stringify(wordDatabase)); alert("Data Kata Sulit direset."); });
document.getElementById('btn-reset-star').addEventListener('click', () => { Object.keys(wordDatabase).forEach(w => wordDatabase[w].isStarred = false); localStorage.setItem('spellingAdaptiveDB', JSON.stringify(wordDatabase)); alert("Data Bintang direset."); });
document.getElementById('btn-clear-data').addEventListener('click', () => { if(confirm("Format riwayat analitik?")) { localStorage.removeItem('spellingAdaptiveDB'); location.reload(); }});

// Custom Builder
const bName = document.getElementById('builder-level-name'), bWord = document.getElementById('builder-word'), bTrans = document.getElementById('builder-trans'), bDef = document.getElementById('builder-def'), bList = document.getElementById('builder-word-list'), bSave = document.getElementById('btn-save-level');
document.getElementById('btn-add-word').addEventListener('click', () => {
    const w = bWord.value.trim().toLowerCase(), t = bTrans.value.trim(), d = bDef.value.trim() || "-";
    if (!w || !t) return;
    tempBuilderWords.push({ word: w, trans: t, def: d });
    const li = document.createElement('li'); li.textContent = `${w} - ${t}`; bList.appendChild(li);
    bWord.value = ''; bTrans.value = ''; bDef.value = ''; bWord.focus(); bSave.style.display = 'block';
});
bSave.addEventListener('click', () => {
    const n = bName.value.trim().toUpperCase(); if (!n) return;
    customLevelsDB[n] = tempBuilderWords; localStorage.setItem('spellingCustomLevels', JSON.stringify(customLevelsDB));
    tempBuilderWords = []; bList.innerHTML = ''; bName.value = ''; bSave.style.display = 'none'; alert(`Tersimpan: ${n}`);
});

// -- LOGIKA NAVIGASI DAN TARGET SESI --
let activeCategory = "";
let targetLimit = 10; 

const catBtns = document.querySelectorAll('.cat-btn');
const targetBtns = document.querySelectorAll('.target-btn');
const btnCustomTarget = document.getElementById('btn-custom-target');
const inputCustomTarget = document.getElementById('input-custom-target');

catBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        catBtns.forEach(b => b.classList.remove('active')); this.classList.add('active');
        activeCategory = this.getAttribute('data-val');
        initSession();
    });
});

targetBtns.forEach(btn => {
    if(btn.id === 'btn-custom-target') return; 
    btn.addEventListener('click', function() {
        targetBtns.forEach(b => b.classList.remove('active')); this.classList.add('active');
        btnCustomTarget.textContent = "kustom"; 
        targetLimit = this.getAttribute('data-val') === 'ALL' ? 'ALL' : parseInt(this.getAttribute('data-val'));
        initSession();
    });
});

// Custom Target Input Logic
btnCustomTarget.addEventListener('click', () => {
    btnCustomTarget.classList.add('hidden');
    inputCustomTarget.classList.remove('hidden');
    inputCustomTarget.focus();
});

inputCustomTarget.addEventListener('keydown', (e) => { if(e.key === 'Enter') { e.preventDefault(); applyCustomTarget(); } });
inputCustomTarget.addEventListener('blur', applyCustomTarget);

function applyCustomTarget() {
    if(inputCustomTarget.classList.contains('hidden')) return;
    let val = parseInt(inputCustomTarget.value);
    inputCustomTarget.classList.add('hidden');
    btnCustomTarget.classList.remove('hidden');
    
    if(val > 0) {
        targetLimit = val;
        targetBtns.forEach(b => b.classList.remove('active'));
        btnCustomTarget.classList.add('active');
        btnCustomTarget.textContent = val; 
        initSession();
    } else {
        inputCustomTarget.value = '';
    }
}

// Algoritma Pengacakan Fisher-Yates
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// -- FUNGSI REAL-TIME: Kalkulasi Persentase Penguasaan --
function updateMasteryUI() {
    if(!currentRawData.length) return;
    let masteredCount = 0;
    
    currentRawData.forEach(item => {
        const rec = wordDatabase[item.word.toLowerCase()];
        // SYARAT DIKUASAI: Benar lebih besar dari Salah. (Jika salah 2, butuh benar 3)
        if(rec && rec.correct > rec.wrong) masteredCount++;
    });
    
    const pct = Math.round((masteredCount / currentRawData.length) * 100);
    let sHtml = `kategori: ${currentCategoryTitle} &nbsp;|&nbsp; dikuasai: <span style="color:var(--accent);">${pct}%</span> (${masteredCount}/${currentRawData.length})`;
    
    if(masteredCount === currentRawData.length) {
        sHtml += ` &nbsp;<span style="color:var(--correct); font-weight:bold;">[ TUNTAS ]</span>`;
    }
    fileStatus.innerHTML = sHtml;
}

function initSession() {
    if(!activeCategory) return;
    let rawData = [];
    let title = "";

    if(activeCategory.match(/^[A-C][1-2]$/)) {
        title = `CEFR ${activeCategory}`;
        rawData = typeof preloadedLevels !== 'undefined' ? (preloadedLevels[activeCategory] || []) : [];
    } else if (activeCategory === "WEAK") {
        title = "⚡ Sulit";
        let weakWords = Object.keys(wordDatabase).filter(w => (wordDatabase[w].wrongCount || 0) > 0).sort((a,b) => wordDatabase[b].wrongCount - wordDatabase[a].wrongCount);
        rawData = weakWords.map(w => ({word: w, trans: wordDatabase[w].translation, def: wordDatabase[w].definition}));
    } else if (activeCategory === "STAR") {
        title = "★ Bintang";
        let starWords = Object.keys(wordDatabase).filter(w => wordDatabase[w].isStarred);
        rawData = starWords.map(w => ({word: w, trans: wordDatabase[w].translation, def: wordDatabase[w].definition}));
    } else if (activeCategory === "CUSTOM") {
        title = "Kustom";
        Object.values(customLevelsDB).forEach(arr => rawData = rawData.concat(arr));
    }

    currentRawData = rawData;
    currentCategoryTitle = title;
    updateMasteryUI(); // Tampilkan persentase awal

    if(rawData.length === 0) {
        wordInput.classList.add('hidden'); btnListen.classList.add('hidden'); sessionStats.classList.add('hidden');
        feedbackArea.innerHTML = `<div class="idle-text" style="color:var(--incorrect);">Data kosong.</div>`;
        return;
    }

    // FILTER PROGRESIF: Pisahkan kata yang belum dikuasai
    let learningPool = [];
    rawData.forEach(item => {
        const rec = wordDatabase[item.word.toLowerCase()];
        if (!rec || rec.correct <= rec.wrong) {
            learningPool.push(item);
        }
    });

    // Jika semua kata sudah dikuasai (100%), masukkan kembali semuanya untuk mode "Review"
    if(learningPool.length === 0) {
        learningPool = [...rawData];
    }

    let limit = targetLimit === "ALL" ? learningPool.length : Math.min(targetLimit, learningPool.length);

    // Acak pool belajar, lalu ambil sejumlah limit target
    let sessionData = [];
    if (activeCategory === "WEAK") {
        sessionData = shuffleArray(learningPool.slice(0, limit)); // Potong dulu (prioritas tersulit), baru acak
    } else {
        sessionData = shuffleArray([...learningPool]).slice(0, limit); // Acak dulu semua, baru potong
    }

    prepareSession(sessionData);
}

// -- EXECUTION & UI UPDATE --
function updateStatsUI() {
    const acc = sessionAttempts === 0 ? 100 : Math.round((sessionCorrectAttempts / sessionAttempts) * 100);
    const prog = sessionTotal === 0 ? 0 : (sessionCompleted / sessionTotal) * 100;
    sessionStats.textContent = `sesi berjalan: ${sessionCompleted}/${sessionTotal}  |  akurasi instan: ${acc}%`;
    progressBar.style.width = `${prog}%`;
}

function prepareSession(dataArray) {
    let sessionWords = [];
    dataArray.forEach(item => {
        const w = item.word.toLowerCase();
        if (!wordDatabase[w]) wordDatabase[w] = { correct: 0, wrong: 0, wrongCount: 0, isStarred: false, translation: item.trans, definition: item.def };
        else { wordDatabase[w].translation = item.trans; wordDatabase[w].definition = item.def; if(wordDatabase[w].wrongCount === undefined) wordDatabase[w].wrongCount = 0; if(wordDatabase[w].isStarred === undefined) wordDatabase[w].isStarred = false; }
        sessionWords.push(w);
    });
    localStorage.setItem('spellingAdaptiveDB', JSON.stringify(wordDatabase));
    
    sessionQueue = sessionWords;
    sessionTotal = sessionQueue.length; sessionCompleted = 0; sessionAttempts = 0; sessionCorrectAttempts = 0;
    
    idleText.classList.add('hidden');
    wordInput.classList.remove('hidden');
    sessionStats.classList.remove('hidden');
    btnListen.classList.remove('hidden');
    btnSubmit.classList.remove('hidden');
    
    updateStatsUI(); loadNextWord();
}

function loadNextWord() {
    if (sessionQueue.length > 0) {
        targetWord = sessionQueue[0]; 
        wordInput.value = ''; feedbackArea.innerHTML = '';
        wordInput.classList.remove('shake-animation');
        btnNext.classList.add('hidden'); btnSubmit.classList.remove('hidden');
        setTimeout(() => wordInput.focus(), 50); 
    } else {
        feedbackArea.innerHTML = '<div class="feedback-row" style="color:var(--correct); font-size:1.5rem; letter-spacing:0;">Sesi tuntas.</div>';
        wordInput.classList.add('hidden'); btnSubmit.classList.add('hidden'); btnNext.classList.add('hidden'); btnListen.classList.add('hidden');
        updateMasteryUI(); // Update persentase global setelah sesi selesai
    }
}

// Global Keyboard Control
window.addEventListener('keydown', function (e) {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.id.includes('builder') || activeEl.id === 'input-custom-target')) return; 
    
    if (e.key === 'Tab' || e.keyCode === 9) {
        e.preventDefault(); e.stopPropagation();
        if (targetWord !== "" && !wordInput.classList.contains('hidden')) btnListen.click();
    }
    if (e.key === 'Enter' || e.keyCode === 13) {
        if(!settingsModal.classList.contains('hidden')) return; 
        e.preventDefault(); e.stopPropagation(); 
        if (!btnNext.classList.contains('hidden')) btnNext.click(); 
        else if (!btnSubmit.classList.contains('hidden')) btnSubmit.click(); 
    }
}, true); 

btnListen.addEventListener('click', () => { if(targetWord && 'speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(targetWord); u.lang = 'en-US'; u.rate = 0.8; window.speechSynthesis.speak(u); }});

btnSubmit.addEventListener('click', () => {
    if (sessionQueue.length === 0) return; 
    const userInput = wordInput.value.toLowerCase().trim(); const targetLower = targetWord.toLowerCase();
    feedbackArea.innerHTML = ''; wordInput.classList.remove('shake-animation'); void wordInput.offsetWidth; 
    
    if (!userInput) { wordInput.classList.add('shake-animation'); triggerVibration(false); return; }
    wordInput.blur(); sessionAttempts++;
    
    const comp = document.createElement('div'); comp.style.textAlign = 'center';
    const userRow = document.createElement('div'); userRow.classList.add('feedback-row');
    
    for (let i = 0; i < userInput.length; i++) {
        const span = document.createElement('span'); span.textContent = userInput[i];
        span.classList.add(userInput[i] === targetLower[i] ? 'char-correct' : 'char-incorrect');
        userRow.appendChild(span);
    }
    comp.appendChild(userRow);

    if (userInput === targetLower) {
        playFeedbackTone(true); triggerVibration(true);
        wordDatabase[targetLower].correct++; 
        if(wordDatabase[targetLower].wrongCount > 0) wordDatabase[targetLower].wrongCount--;
        sessionCorrectAttempts++; sessionCompleted++; sessionQueue.shift(); 
        feedbackArea.appendChild(comp);
    } else {
        wordInput.classList.add('shake-animation'); playFeedbackTone(false); triggerVibration(false);
        wordDatabase[targetLower].wrong++; wordDatabase[targetLower].wrongCount = (wordDatabase[targetLower].wrongCount || 0) + 1;
        const failedWord = sessionQueue.shift(); sessionQueue.push(failedWord);
        
        const targetRow = document.createElement('div'); targetRow.classList.add('feedback-row');
        for (let i = 0; i < targetLower.length; i++) {
            const span = document.createElement('span'); span.textContent = targetLower[i];
            span.classList.add(userInput[i] === targetLower[i] ? 'char-neutral' : 'char-correction');
            targetRow.appendChild(span);
        }
        comp.appendChild(targetRow); feedbackArea.appendChild(comp);
    }
    
    updateStatsUI();
    updateMasteryUI(); // Update persentase penguasaan secara live
    
    const currentWordData = wordDatabase[targetLower];
    const semanticBox = document.createElement('div'); semanticBox.classList.add('semantic-box');
    semanticBox.innerHTML = `<div><span class="trans-text">${currentWordData.translation}</span><br><span style="font-size:0.8rem;">${currentWordData.definition}</span></div><button class="star-btn ${currentWordData.isStarred ? 'starred' : ''}" id="toggle-star">${currentWordData.isStarred ? '★' : '☆'}</button>`;
    feedbackArea.appendChild(semanticBox);
    
    document.getElementById('toggle-star').addEventListener('click', function() {
        currentWordData.isStarred = !currentWordData.isStarred;
        this.textContent = currentWordData.isStarred ? '★' : '☆';
        this.classList.toggle('starred', currentWordData.isStarred);
        localStorage.setItem('spellingAdaptiveDB', JSON.stringify(wordDatabase));
    });
    
    localStorage.setItem('spellingAdaptiveDB', JSON.stringify(wordDatabase));
    btnSubmit.classList.add('hidden'); btnNext.classList.remove('hidden');
});

btnNext.addEventListener('click', () => { loadNextWord(); if (sessionQueue.length > 0) { btnListen.click(); }});
