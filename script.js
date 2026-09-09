let wordDatabase = JSON.parse(localStorage.getItem('spellingAdaptiveDB')) || {};
let customLevelsDB = JSON.parse(localStorage.getItem('spellingCustomLevels')) || {}; 
let soundEnabled = JSON.parse(localStorage.getItem('spellingSound')) ?? true;
let vibrationEnabled = JSON.parse(localStorage.getItem('spellingVibrate')) ?? true;

let sessionQueue = []; 
let targetWord = "";
let tempBuilderWords = []; 

// Statistik Sesi
let sessionTotal = 0;
let sessionCompleted = 0;
let sessionAttempts = 0;
let sessionCorrectAttempts = 0;

// Referensi DOM
const btnListen = document.getElementById('btn-listen');
const btnSubmit = document.getElementById('btn-submit');
const btnNext = document.getElementById('btn-next');
const wordInput = document.getElementById('word-input');
const feedbackArea = document.getElementById('feedback-area');
const sessionStats = document.getElementById('session-stats');
const progressBar = document.getElementById('progress-bar');
const fileStatus = document.getElementById('file-status');

// -- MESIN AUDIO & HAPTIC --
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}
window.addEventListener('click', initAudio, { once: true });
window.addEventListener('keydown', initAudio, { once: true });

function playFeedbackTone(isCorrect) {
    if (!audioCtx || !soundEnabled) return;
    initAudio(); 
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    
    if (isCorrect) {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(650, now);
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now); oscillator.stop(now + 0.1);
    } else {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(180, now);
        gainNode.gain.setValueAtTime(0.6, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
        oscillator.start(now); oscillator.stop(now + 0.09);
    }
}

function triggerVibration(isCorrect) {
    if (!vibrationEnabled || !('vibrate' in navigator)) return;
    if (isCorrect) navigator.vibrate(15); 
    else navigator.vibrate([40, 50, 40]); 
}

// -- SETTINGS UI & TOGGLES --
const settingsModal = document.getElementById('settings-modal');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnToggleSound = document.getElementById('toggle-sound');
const btnToggleVibrate = document.getElementById('toggle-vibrate');

function updatePreferencesUI() {
    btnToggleSound.textContent = soundEnabled ? 'Suara: ON' : 'Suara: OFF';
    btnToggleSound.classList.toggle('active', soundEnabled);
    btnToggleVibrate.textContent = vibrationEnabled ? 'Getar: ON' : 'Getar: OFF';
    btnToggleVibrate.classList.toggle('active', vibrationEnabled);
}
updatePreferencesUI();

btnToggleSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled; localStorage.setItem('spellingSound', soundEnabled);
    updatePreferencesUI(); if (soundEnabled) initAudio();
});
btnToggleVibrate.addEventListener('click', () => {
    vibrationEnabled = !vibrationEnabled; localStorage.setItem('spellingVibrate', vibrationEnabled);
    updatePreferencesUI(); if (vibrationEnabled) triggerVibration(true);
});

btnSettingsToggle.addEventListener('click', () => settingsModal.classList.remove('hidden'));
btnCloseSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
    if(!wordInput.disabled) wordInput.focus();
});
window.addEventListener('click', (e) => { if (e.target === settingsModal) btnCloseSettings.click(); });


// -- LOGIKA TABS LEVEL (MENGGANTIKAN DROPDOWN) --
let selectedCategory = "";
let selectedSubLevel = "";

const catTabs = document.querySelectorAll('.cat-tab');
const sublevelContainer = document.getElementById('sublevel-container');
const sublevelTabsContainer = document.getElementById('sublevel-tabs');
const btnLoadLevel = document.getElementById('btn-load-level');

catTabs.forEach(tab => {
    tab.addEventListener('click', function() {
        catTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        selectedCategory = this.getAttribute('data-val');
        selectedSubLevel = ""; // Reset sublevel
        
        // Render Sub-Level bergantung kategori
        sublevelTabsContainer.innerHTML = '';
        if (selectedCategory.match(/^[A-C][1-2]$/)) {
            ['Level 1', 'Level 2', 'Level 3'].forEach(lvl => {
                const btn = document.createElement('button');
                btn.className = 'tab-btn sub-tab'; btn.textContent = lvl; btn.setAttribute('data-val', lvl);
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    selectedSubLevel = this.getAttribute('data-val');
                });
                sublevelTabsContainer.appendChild(btn);
            });
            sublevelContainer.classList.remove('hidden');
        } 
        else if (selectedCategory === 'CUSTOM') {
            const customKeys = Object.keys(customLevelsDB);
            if(customKeys.length === 0) {
                sublevelTabsContainer.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted);">Belum ada level kustom.</span>';
            } else {
                customKeys.forEach(lvl => {
                    const btn = document.createElement('button');
                    btn.className = 'tab-btn sub-tab highlight-tab'; btn.textContent = lvl; btn.setAttribute('data-val', lvl);
                    btn.addEventListener('click', function() {
                        document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
                        this.classList.add('active');
                        selectedSubLevel = this.getAttribute('data-val');
                    });
                    sublevelTabsContainer.appendChild(btn);
                });
            }
            sublevelContainer.classList.remove('hidden');
        } else {
            // Untuk tab Weak dan Star, tidak perlu sublevel
            sublevelContainer.classList.add('hidden');
        }
    });
});

btnLoadLevel.addEventListener('click', () => {
    let levelData = [];
    let levelName = "";
    
    if (!selectedCategory) return alert("Pilih kategori modul terlebih dahulu.");

    if (selectedCategory.match(/^[A-C][1-2]$/)) {
        if (!selectedSubLevel) return alert("Pilih Sub-Level (1, 2, atau 3).");
        levelName = `${selectedCategory} - ${selectedSubLevel}`;
        levelData = typeof preloadedLevels !== 'undefined' ? (preloadedLevels[levelName] || []) : [];
    } else if (selectedCategory === "CUSTOM") {
        if (!selectedSubLevel) return alert("Pilih salah satu level kustom Anda.");
        levelName = selectedSubLevel;
        levelData = customLevelsDB[levelName] || [];
    } else if (selectedCategory === "WEAK") {
        levelName = "⚡ KATA SULIT";
        levelData = Object.keys(wordDatabase)
            .filter(w => (wordDatabase[w].wrongCount || 0) > 0)
            .sort((a, b) => wordDatabase[b].wrongCount - wordDatabase[a].wrongCount)
            .map(w => ({ word: w, trans: wordDatabase[w].translation, def: wordDatabase[w].definition }));
        if(levelData.length === 0) return alert("Hebat! Anda tidak memiliki catatan kata sulit.");
    } else if (selectedCategory === "STAR") {
        levelName = "⭐ TERSIMPAN";
        levelData = Object.keys(wordDatabase)
            .filter(w => wordDatabase[w].isStarred)
            .map(w => ({ word: w, trans: wordDatabase[w].translation, def: wordDatabase[w].definition }));
        if(levelData.length === 0) return alert("Anda belum menandai (Bintang) kata apa pun.");
    }

    if(levelData.length === 0) return alert("Data level tidak ditemukan.");
    prepareSession(levelData, levelName);
    btnCloseSettings.click();
});

// -- MANAJEMEN PANGKALAN DATA BAWAHAN --
document.getElementById('btn-reset-weak').addEventListener('click', () => {
    if(confirm("Hapus seluruh catatan 'Kata Sulit'?")) {
        Object.keys(wordDatabase).forEach(w => wordDatabase[w].wrongCount = 0);
        localStorage.setItem('spellingAdaptiveDB', JSON.stringify(wordDatabase));
        alert("Catatan Kata Sulit berhasil direset.");
    }
});
document.getElementById('btn-reset-star').addEventListener('click', () => {
    if(confirm("Hapus semua Bookmark Bintang?")) {
        Object.keys(wordDatabase).forEach(w => wordDatabase[w].isStarred = false);
        localStorage.setItem('spellingAdaptiveDB', JSON.stringify(wordDatabase));
        alert("Semua Bintang berhasil dihapus.");
    }
});
document.getElementById('btn-clear-data').addEventListener('click', () => {
    if(confirm("PERINGATAN: Hapus seluruh riwayat statistik, kata sulit, dan bintang? (Level kustom tidak dihapus)")) {
        localStorage.removeItem('spellingAdaptiveDB');
        wordDatabase = {}; sessionQueue = [];
        fileStatus.textContent = "Data direset. Silakan muat sesi baru.";
        wordInput.disabled = true; btnSubmit.style.display = 'none';
        feedbackArea.innerHTML = ''; btnNext.style.display = 'none';
    }
});

// -- BUILDER LEVEL KUSTOM --
const builderLevelName = document.getElementById('builder-level-name');
const builderWord = document.getElementById('builder-word');
const builderTrans = document.getElementById('builder-trans');
const builderDef = document.getElementById('builder-def');
const btnAddWord = document.getElementById('btn-add-word');
const builderWordList = document.getElementById('builder-word-list');
const btnSaveLevel = document.getElementById('btn-save-level');

btnAddWord.addEventListener('click', () => {
    const w = builderWord.value.trim().toLowerCase();
    const t = builderTrans.value.trim();
    const d = builderDef.value.trim() || "Tidak ada definisi";
    if (w === "" || t === "") return alert("Kata dan Terjemahan wajib diisi.");
    tempBuilderWords.push({ word: w, trans: t, def: d });
    const li = document.createElement('li'); li.textContent = `${w} - ${t}`; builderWordList.appendChild(li);
    builderWord.value = ''; builderTrans.value = ''; builderDef.value = ''; builderWord.focus();
    btnSaveLevel.style.display = 'block';
});
btnSaveLevel.addEventListener('click', () => {
    const lvlName = builderLevelName.value.trim().toUpperCase();
    if (lvlName === "") return alert("Isi Nama Level!");
    customLevelsDB[lvlName] = tempBuilderWords;
    localStorage.setItem('spellingCustomLevels', JSON.stringify(customLevelsDB));
    tempBuilderWords = []; builderWordList.innerHTML = ''; builderLevelName.value = '';
    btnSaveLevel.style.display = 'none';
    alert(`Level Kustom "${lvlName}" disimpan.`);
    // Memaksa refresh tab agar level kustom muncul
    if(selectedCategory === 'CUSTOM') document.querySelector('.cat-tab[data-val="CUSTOM"]').click();
});


// -- MANAJEMEN SESI & PROGRESS --
function updateStatsUI() {
    const accuracy = sessionAttempts === 0 ? 100 : Math.round((sessionCorrectAttempts / sessionAttempts) * 100);
    const progress = sessionTotal === 0 ? 0 : (sessionCompleted / sessionTotal) * 100;
    
    sessionStats.textContent = `Selesai: ${sessionCompleted} / ${sessionTotal} Kata  |  Akurasi: ${accuracy}%`;
    progressBar.style.width = `${progress}%`;
}

function prepareSession(dataArray, levelName) {
    let sessionWords = [];
    
    dataArray.forEach(item => {
        const w = item.word.toLowerCase();
        if (!wordDatabase[w]) {
            wordDatabase[w] = { correct: 0, wrong: 0, wrongCount: 0, isStarred: false, translation: item.trans, definition: item.def };
        } else {
            wordDatabase[w].translation = item.trans; wordDatabase[w].definition = item.def;
            if(wordDatabase[w].wrongCount === undefined) wordDatabase[w].wrongCount = 0;
            if(wordDatabase[w].isStarred === undefined) wordDatabase[w].isStarred = false;
        }
        sessionWords.push(w);
    });
    localStorage.setItem('spellingAdaptiveDB', JSON.stringify(wordDatabase));

    sessionQueue = sessionWords.sort((a, b) => {
        const errorRateA = wordDatabase[a].wrong - wordDatabase[a].correct;
        const errorRateB = wordDatabase[b].wrong - wordDatabase[b].correct;
        return errorRateB - errorRateA; 
    });

    sessionTotal = sessionQueue.length;
    sessionCompleted = 0; sessionAttempts = 0; sessionCorrectAttempts = 0;
    
    fileStatus.textContent = `Modul Aktif: ${levelName}`;
    wordInput.disabled = false;
    updateStatsUI();
    loadNextWord();
}

function loadNextWord() {
    if (sessionQueue.length > 0) {
        targetWord = sessionQueue[0]; 
        wordInput.value = '';
        feedbackArea.innerHTML = '';
        wordInput.classList.remove('shake-animation', 'pulse-animation');
        
        btnNext.style.display = 'none';
        btnSubmit.style.display = 'inline-block'; // Tampilkan tombol periksa untuk mobile
        setTimeout(() => wordInput.focus(), 50); 
    } else {
        feedbackArea.innerHTML = '<div class="feedback-row" style="color:var(--correct); font-size:1.5rem; letter-spacing:0;">Pelatihan Selesai.</div>';
        wordInput.disabled = true;
        btnSubmit.style.display = 'none';
        btnNext.style.display = 'none';
    }
}

// -- SHORTCUT KEYBOARD GLOBAL --
window.addEventListener('keydown', function (e) {
    if (document.activeElement.id && document.activeElement.id.includes('builder')) return; 

    if (e.key === 'Tab' || e.keyCode === 9) {
        e.preventDefault(); e.stopPropagation();
        if (targetWord !== "" && !wordInput.disabled) btnListen.click();
    }
    if (e.key === 'Enter' || e.keyCode === 13) {
        if(!settingsModal.classList.contains('hidden')) return; 
        e.preventDefault(); e.stopPropagation(); 
        if (btnNext.style.display !== 'none') btnNext.click(); 
        else if (!wordInput.disabled) btnSubmit.click(); 
    }
}, true); 


// -- EVALUASI & INTERAKSI --
function speakWord(text) {
    if (!text) return;
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
    }
}
btnListen.addEventListener('click', () => { speakWord(targetWord); });

btnSubmit.addEventListener('click', () => {
    if (sessionQueue.length === 0) return; 

    const userInput = wordInput.value.toLowerCase().trim();
    const targetLower = targetWord.toLowerCase();
    
    feedbackArea.innerHTML = '';
    wordInput.classList.remove('shake-animation', 'pulse-animation');
    void wordInput.offsetWidth; 
    
    if (userInput === "") {
        wordInput.classList.add('shake-animation'); triggerVibration(false);
        return; 
    }
    
    wordInput.blur(); 
    sessionAttempts++;

    const comparisonContainer = document.createElement('div');
    comparisonContainer.style.textAlign = 'center';
    
    // Render Input User
    const userRow = document.createElement('div'); userRow.classList.add('feedback-row');
    userRow.innerHTML = '<span class="label">Input Anda:</span>';
    for (let i = 0; i < userInput.length; i++) {
        const span = document.createElement('span'); span.textContent = userInput[i];
        span.classList.add(userInput[i] === targetLower[i] ? 'char-correct' : 'char-incorrect');
        userRow.appendChild(span);
    }
    comparisonContainer.appendChild(userRow);

    if (userInput === targetLower) {
        // BENAR
        wordInput.classList.add('pulse-animation'); playFeedbackTone(true); triggerVibration(true);
        wordDatabase[targetLower].correct++; 
        // Mengurangi jumlah weak count jika berhasil (Logika Kata Sulit)
        if(wordDatabase[targetLower].wrongCount > 0) wordDatabase[targetLower].wrongCount--;
        
        sessionCorrectAttempts++; sessionCompleted++;
        sessionQueue.shift(); 
        feedbackArea.appendChild(comparisonContainer);
    } else {
        // SALAH
        wordInput.classList.add('shake-animation'); playFeedbackTone(false); triggerVibration(false);
        wordDatabase[targetLower].wrong++; 
        // Menambah jumlah weak count (Logika Kata Sulit)
        wordDatabase[targetLower].wrongCount = (wordDatabase[targetLower].wrongCount || 0) + 1;
        
        const failedWord = sessionQueue.shift(); sessionQueue.push(failedWord);
        
        const targetRow = document.createElement('div'); targetRow.classList.add('feedback-row');
        targetRow.innerHTML = '<span class="label">Seharusnya:</span>';
        for (let i = 0; i < targetLower.length; i++) {
            const span = document.createElement('span'); span.textContent = targetLower[i];
            span.classList.add(userInput[i] === targetLower[i] ? 'char-neutral' : 'char-correction');
            targetRow.appendChild(span);
        }
        comparisonContainer.appendChild(targetRow);
        feedbackArea.appendChild(comparisonContainer);
    }
    
    updateStatsUI();

    // Render Semantic Box dengan Bintang
    const currentWordData = wordDatabase[targetLower];
    const semanticBox = document.createElement('div'); semanticBox.classList.add('semantic-box');
    const starIcon = currentWordData.isStarred ? '★' : '☆';
    
    semanticBox.innerHTML = `
        <div>
            <strong>[ID]</strong> ${currentWordData.translation} <br><br>
            <strong>Def:</strong> ${currentWordData.definition}
        </div>
        <button class="star-btn" id="toggle-star" title="Tandai Kata">${starIcon}</button>
    `;
    feedbackArea.appendChild(semanticBox);
    
    // Logika Klik Bintang Interaktif
    document.getElementById('toggle-star').addEventListener('click', function() {
        currentWordData.isStarred = !currentWordData.isStarred;
        this.textContent = currentWordData.isStarred ? '★' : '☆';
        localStorage.setItem('spellingAdaptiveDB', JSON.stringify(wordDatabase));
    });
    
    localStorage.setItem('spellingAdaptiveDB', JSON.stringify(wordDatabase));
    
    btnSubmit.style.display = 'none';
    btnNext.style.display = 'inline-block';
});

btnNext.addEventListener('click', () => {
    loadNextWord();
    if (sessionQueue.length > 0) { speakWord(targetWord); }
});
