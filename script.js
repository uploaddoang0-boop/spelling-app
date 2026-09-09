// -- ARSITEKTUR BASIS DATA --
let wordDatabase = JSON.parse(localStorage.getItem('spellingAdaptiveDB')) || {};
// Pangkalan data terpisah khusus untuk Level Kustom buatan pengguna
let customLevelsDB = JSON.parse(localStorage.getItem('spellingCustomLevels')) || {}; 

let sessionQueue = []; 
let targetWord = "";
let tempBuilderWords = []; // Variabel sementara untuk menampung kata saat membuat level

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

// Referensi Level Builder
const builderLevelName = document.getElementById('builder-level-name');
const builderWord = document.getElementById('builder-word');
const builderTrans = document.getElementById('builder-trans');
const builderDef = document.getElementById('builder-def');
const btnAddWord = document.getElementById('btn-add-word');
const builderWordList = document.getElementById('builder-word-list');
const btnSaveLevel = document.getElementById('btn-save-level');

// -- FUNGSI DROPDOWN (GABUNGAN DATA STATIS & DINAMIS) --
function populateLevelDropdown() {
    levelSelector.innerHTML = '<option value="">-- Pilih Level Game --</option>'; 
    
    // 1. Muat data statis dari levels.js (Jika ada)
    if (typeof preloadedLevels !== 'undefined') {
        const levels = Object.keys(preloadedLevels);
        levels.forEach(level => {
            const option = document.createElement('option');
            option.value = `PRELOADED|${level}`;
            option.textContent = level;
            levelSelector.appendChild(option);
        });
    }

    // 2. Muat data Kustom dinamis dari localStorage
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
});

// -- LOGIKA LEVEL BUILDER (PEMBUAT LEVEL) --
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

// -- FUNGSI SHORTCUT KEYBOARD GLOBAL (ENTER) DENGAN TELEMETRI --
document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault(); // Mencegah perilaku bawaan peramban
        console.log("[SISTEM] Tombol Enter terdeteksi.");

        // Logika 1: Jika tombol Next terlihat di layar (bernilai 'inline-block')
        if (btnNext.style.display === 'inline-block') {
            console.log("[SISTEM] Mengeksekusi navigasi Next.");
            btnNext.click();
        } 
        // Logika 2: Jika tombol Next sembunyi DAN tombol Periksa tidak dinonaktifkan
        else if (btnSubmit.disabled === false) {
            console.log("[SISTEM] Mengeksekusi evaluasi Periksa.");
            btnSubmit.click();
        } 
        // Logika 3: Kondisi di mana level belum dimulai
        else {
            console.log("[SISTEM] Eksekusi ditolak: Sesi belum aktif.");
        }
    }
});
// -- MANAJEMEN SESI (SPACED REPETITION) --
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

    // Urutkan kata dari yang paling sering salah
    sessionQueue = sessionWords.sort((a, b) => {
        const errorRateA = wordDatabase[a].wrong - wordDatabase[a].correct;
        const errorRateB = wordDatabase[b].wrong - wordDatabase[b].correct;
        return errorRateB - errorRateA; 
    });

    fileStatus.innerHTML = `<strong>Level Aktif: ${levelName}</strong> <br> ${sessionQueue.length} kata disiapkan.`;
    fileStatus.style.color = "#0056b3";
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
        wordInput.focus(); 
    } else {
        feedbackArea.innerHTML = '<div class="result-message" style="color:#28a745;">LUAR BIASA! Level ini telah Anda taklukkan.</div>';
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
        fileStatus.textContent = "Statistik direset. Pilih level untuk mulai.";
        fileStatus.style.color = "#333";
        wordInput.disabled = true;
        btnSubmit.disabled = true;
        feedbackArea.innerHTML = '';
        btnNext.style.display = 'none';
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
    userRow.innerHTML = '<span class="label">Jawaban Anda:</span>';
    
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

    const message = document.createElement('div');
    message.classList.add('result-message');

    if (userInput === targetLower) {
        wordDatabase[targetLower].correct++; 
        sessionQueue.shift(); 
        message.textContent = "Tepat sekali!";
        message.style.color = "#28a745";
        feedbackArea.appendChild(comparisonContainer);
        feedbackArea.appendChild(message);
    } else {
        wordDatabase[targetLower].wrong++; 
        const failedWord = sessionQueue.shift();
        sessionQueue.push(failedWord);
        
        const targetRow = document.createElement('div');
        targetRow.classList.add('feedback-row');
        targetRow.innerHTML = '<span class="label">Seharusnya:</span>';
        
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

        message.textContent = "Ejaan salah. Kata ini akan diulang kembali.";
        message.style.color = "#dc3545";
        feedbackArea.appendChild(comparisonContainer);
        feedbackArea.appendChild(message);
    }
    
    const semanticBox = document.createElement('div');
    semanticBox.classList.add('semantic-box');
    const currentWordData = wordDatabase[targetLower];
    semanticBox.innerHTML = `
        <strong>Terjemahan:</strong> ${currentWordData.translation} <br><br>
        <strong>Definisi:</strong> ${currentWordData.definition}
    `;
    feedbackArea.appendChild(semanticBox);
    
    localStorage.setItem('spellingAdaptiveDB', JSON.stringify(wordDatabase));
    
    btnNext.style.display = 'inline-block';
});

btnNext.addEventListener('click', () => {
    loadNextWord();
    if (sessionQueue.length > 0) { speakWord(targetWord); }
});

// Status awal
wordInput.disabled = true;
btnSubmit.disabled = true;
