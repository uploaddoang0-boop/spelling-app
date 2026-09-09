// -- ARSITEKTUR BASIS DATA --
let wordDatabase = JSON.parse(localStorage.getItem('spellingAdaptiveDB')) || {};
let customLevelsDB = JSON.parse(localStorage.getItem('spellingCustomLevels')) || {}; 

let sessionQueue = []; 
let targetWord = "";
let tempBuilderWords = []; 

// -- REFERENSI ELEMEN --
const levelSelector = document.getElementById('level-selector');
const btnLoadLevel = document.getElementById('btn-load-level');
const fileStatus = document.getElementById('file-status');
const btnClearData = document.getElementById('btn-clear-data');

const btnListen = document.getElementById('btn-listen');
const btnSubmit = document.getElementById('btn-submit');
const btnNext = document.getElementById('btn-next');
const wordInput = document.getElementById('word-input');
const feedbackArea = document.getElementById('feedback-area');

const builderLevelName = document.getElementById('builder-level-name');
const builderWord = document.getElementById('builder-word');
const builderTrans = document.getElementById('builder-trans');
const builderDef = document.getElementById('builder-def');
const btnAddWord = document.getElementById('btn-add-word');
const builderWordList = document.getElementById('builder-word-list');
const btnSaveLevel = document.getElementById('btn-save-level');

// -- LOGIKA MODAL SETTINGS UI --
const settingsModal = document.getElementById('settings-modal');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const btnCloseSettings = document.getElementById('btn-close-settings');

function openSettings() {
    settingsModal.classList.remove('hidden');
}

function closeSettings() {
    settingsModal.classList.add('hidden');
    // UX: Autofocus kembali ke kotak ketik jika level sedang berjalan
    if(!wordInput.disabled) wordInput.focus();
}

btnSettingsToggle.addEventListener('click', openSettings);
btnCloseSettings.addEventListener('click', closeSettings);

// Menutup modal jika area di luar kotak hitam diklik
window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        closeSettings();
    }
});

// -- FUNGSI DROPDOWN --
function populateLevelDropdown() {
    levelSelector.innerHTML = '<option value="">-- Pilih Level Game --</option>'; 
    
    if (typeof preloadedLevels !== 'undefined') {
        const levels = Object.keys(preloadedLevels);
        levels.forEach(level => {
            const option = document.createElement('option');
            option.value = `PRELOADED|${level}`;
            option.textContent = level;
            levelSelector.appendChild(option);
        });
    }

    const customLevels = Object.keys(customLevelsDB);
    if (customLevels.length > 0) {
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = "─── LEVEL KUSTOM ANDA ───";
        levelSelector.appendChild(separator);

        customLevels.forEach(level => {
            const option = document.createElement('option');
            option.value = `CUSTOM|${level}`;
            option.textContent = `⭐ ${level}`;
            levelSelector.appendChild(option);
        });
    }
}
populateLevelDropdown(); 

// -- LOGIKA MEMUAT LEVEL --
btnLoadLevel.addEventListener('click', () => {
    const selection = levelSelector.value;
    if (!selection) {
        alert("Silakan pilih level terlebih dahulu!");
        return;
    }

    const [source, levelName] = selection.split('|');
    let levelData = [];

    if (source === 'PRELOADED') {
        levelData = preloadedLevels[levelName];
    } else if (source === 'CUSTOM') {
        levelData = customLevelsDB[levelName];
    }

    prepareSession(levelData, levelName);
    // Otomatis menutup menu setelah level berhasil dimuat
    closeSettings();
});

// -- LOGIKA LEVEL BUILDER --
btnAddWord.addEventListener('click', () => {
    const w = builderWord.value.trim().toLowerCase();
    const t = builderTrans.value.trim();
    const d = builderDef.value.trim() || "Tidak ada definisi";

    if (w === "" || t === "") {
        alert("Kata bahasa Inggris dan Terjemahan wajib diisi.");
        return;
    }

    tempBuilderWords.push({ word: w, trans: t, def: d });
    
    const li = document.createElement('li');
    li.textContent = `${w} - ${t}`;
    builderWordList.appendChild(li);

    builderWord.value = '';
    builderTrans.value = '';
    builderDef.value = '';
    builderWord.focus();

    btnSaveLevel.style.display = 'block';
});

btnSaveLevel.addEventListener('click', () => {
    const lvlName = builderLevelName.value.trim().toUpperCase();
    
    if (lvlName === "") {
        alert("Harap isi Nama Level terlebih dahulu!");
        return;
    }

    customLevelsDB[lvlName] = tempBuilderWords;
    localStorage.setItem('spellingCustomLevels', JSON.stringify(customLevelsDB));

    tempBuilderWords = [];
    builderWordList.innerHTML = '';
    builderLevelName.value = '';
    btnSaveLevel.style.display = 'none';

    populateLevelDropdown();
    alert(`Level "${lvlName}" berhasil disimpan ke sistem!`);
});

// -- FUNGSI SHORTCUT KEYBOARD GLOBAL --
window.addEventListener('keydown', function (e) {
    const activeElementId = document.activeElement.id;
    if (activeElementId && activeElementId.includes('builder')) {
        return; 
    }

    // Tab untuk memutar audio
    if (e.key === 'Tab' || e.keyCode === 9) {
        e.preventDefault(); 
        e.stopPropagation();
        if (targetWord !== "" && !wordInput.disabled) {
            btnListen.click();
        }
    }

    // Enter untuk memeriksa atau lanjut
    if (e.key === 'Enter' || e.keyCode === 13) {
        // Cek agar enter tidak bereaksi ganda saat modal pengaturan terbuka
        if(!settingsModal.classList.contains('hidden')) return; 
        
        e.preventDefault(); 
        e.stopPropagation(); 

        if (btnNext.style.display !== 'none') {
            btnNext.click(); 
        } else if (!wordInput.disabled) {
            btnSubmit.click(); 
        }
    }
}, true); 

// -- MANAJEMEN SESI --
function prepareSession(dataArray, levelName) {
    let sessionWords = [];
    
    dataArray.forEach(item => {
        const w = item.word.toLowerCase();
        if (!wordDatabase[w]) {
            wordDatabase[w] = { correct: 0, wrong: 0, translation: item.trans, definition: item.def };
        } else {
            wordDatabase[w].translation = item.trans;
            wordDatabase[w].definition = item.def;
        }
        sessionWords.push(w);
    });
    
    localStorage.setItem('spellingAdaptiveDB', JSON.stringify(wordDatabase));

    sessionQueue = sessionWords.sort((a, b) => {
        const errorRateA = wordDatabase[a].wrong - wordDatabase[a].correct;
        const errorRateB = wordDatabase[b].wrong - wordDatabase[b].correct;
        return errorRateB - errorRateA; 
    });

    fileStatus.textContent = `Level Aktif: ${levelName} (${sessionQueue.length} kata disiapkan)`;
    wordInput.disabled = false;
    btnSubmit.disabled = false;
    
    loadNextWord();
}

function loadNextWord() {
    if (sessionQueue.length > 0) {
        targetWord = sessionQueue[0]; 
        wordInput.value = '';
        feedbackArea.innerHTML = '';
        btnNext.style.display = 'none';
        
        // Sengaja berikan sedikit jeda agar DOM browser stabil saat modal ditutup
        setTimeout(() => wordInput.focus(), 50); 
    } else {
        feedbackArea.innerHTML = '<div class="feedback-row" style="color:var(--correct); font-family:Inter; letter-spacing:0; font-size:1.5rem;">Sesi Selesai. Kinerja Sempurna.</div>';
        wordInput.disabled = true;
        btnSubmit.disabled = true;
        btnNext.style.display = 'none';
        levelSelector.value = "";
    }
}

btnClearData.addEventListener('click', () => {
    if(confirm("Hanya menghapus riwayat statistik kesalahan. Level Kustom TIDAK akan terhapus. Lanjutkan?")) {
        localStorage.removeItem('spellingAdaptiveDB');
        wordDatabase = {};
        sessionQueue = [];
        fileStatus.textContent = "Statistik direset. Pilih level di pengaturan.";
        wordInput.disabled = true;
        btnSubmit.disabled = true;
        feedbackArea.innerHTML = '';
        btnNext.style.display = 'none';
        closeSettings();
    }
});

// -- EVALUASI & TEXT-TO-SPEECH --
function speakWord(text) {
    if (!text) return;
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
    }
}

btnListen.addEventListener('click', () => { speakWord(targetWord); });

btnSubmit.addEventListener('click', () => {
    if (sessionQueue.length === 0) return; 

    const userInput = wordInput.value.toLowerCase().trim();
    const targetLower = targetWord.toLowerCase();
    
    feedbackArea.innerHTML = '';
    if (userInput === "") return; 
    
    wordInput.blur(); 

    const comparisonContainer = document.createElement('div');
    comparisonContainer.style.textAlign = 'center';
    const userRow = document.createElement('div');
    userRow.classList.add('feedback-row');
    userRow.innerHTML = '<span class="label">Input:</span>';
    
    for (let i = 0; i < userInput.length; i++) {
        const span = document.createElement('span');
        span.textContent = userInput[i];
        if (userInput[i] === targetLower[i]) {
            span.classList.add('char-correct');
        } else {
            span.classList.add('char-incorrect');
        }
        userRow.appendChild(span);
    }
    comparisonContainer.appendChild(userRow);

    if (userInput === targetLower) {
        wordDatabase[targetLower].correct++; 
        sessionQueue.shift(); 
        feedbackArea.appendChild(comparisonContainer);
    } else {
        wordDatabase[targetLower].wrong++; 
        const failedWord = sessionQueue.shift();
        sessionQueue.push(failedWord);
        
        const targetRow = document.createElement('div');
        targetRow.classList.add('feedback-row');
        targetRow.innerHTML = '<span class="label">Target:</span>';
        
        for (let i = 0; i < targetLower.length; i++) {
            const span = document.createElement('span');
            span.textContent = targetLower[i];
            
            if (userInput[i] === targetLower[i]) {
                span.classList.add('char-neutral');
            } else {
                span.classList.add('char-correction');
            }
            targetRow.appendChild(span);
        }
        comparisonContainer.appendChild(targetRow);
        feedbackArea.appendChild(comparisonContainer);
    }
    
    const semanticBox = document.createElement('div');
    semanticBox.classList.add('semantic-box');
    const currentWordData = wordDatabase[targetLower];
    semanticBox.innerHTML = `
        <strong>[ID]</strong> ${currentWordData.translation} <br><br>
        <strong>Def:</strong> ${currentWordData.definition}
    `;
    feedbackArea.appendChild(semanticBox);
    
    localStorage.setItem('spellingAdaptiveDB', JSON.stringify(wordDatabase));
    btnNext.style.display = 'inline-block';
});

btnNext.addEventListener('click', () => {
    loadNextWord();
    if (sessionQueue.length > 0) { speakWord(targetWord); }
});

wordInput.disabled = true;
btnSubmit.disabled = true;
