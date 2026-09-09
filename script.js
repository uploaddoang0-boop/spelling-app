let wordDatabase = JSON.parse(localStorage.getItem('spellingAdaptiveDB')) || {};
let sessionQueue = []; 
let targetWord = "";

const levelSelector = document.getElementById('level-selector');
const btnLoadLevel = document.getElementById('btn-load-level');
const fileInput = document.getElementById('file-input');
const fileStatus = document.getElementById('file-status');
const btnClearData = document.getElementById('btn-clear-data');
const btnListen = document.getElementById('btn-listen');
const btnSubmit = document.getElementById('btn-submit');
const btnNext = document.getElementById('btn-next');
const wordInput = document.getElementById('word-input');
const feedbackArea = document.getElementById('feedback-area');

// -- INISIALISASI DROPDOWN LEVEL --
function populateLevelDropdown() {
    // preloadedLevels berasal dari berkas levels.js
    if (typeof preloadedLevels !== 'undefined') {
        const levels = Object.keys(preloadedLevels);
        levels.forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = level;
            levelSelector.appendChild(option);
        });
    }
}
populateLevelDropdown();

// -- LOGIKA MEMUAT LEVEL DARI DROPDOWN --
btnLoadLevel.addEventListener('click', () => {
    const selectedLevel = levelSelector.value;
    if (!selectedLevel) {
        alert("Silakan pilih level terlebih dahulu!");
        return;
    }

    const levelData = preloadedLevels[selectedLevel]; 
    prepareSession(levelData, selectedLevel);
});

// -- LOGIKA MEMUAT LEVEL KUSTOM DARI FILE TXT --
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        
        let customLevelData = [];
        lines.forEach(line => {
            const parts = line.split('|');
            const word = parts[0] ? parts[0].trim().toLowerCase() : "";
            const trans = parts[1] ? parts[1].trim() : "Terjemahan belum tersedia.";
            const def = parts[2] ? parts[2].trim() : "Definisi belum tersedia.";
            
            if (word !== "") {
                customLevelData.push({ word: word, trans: trans, def: def });
            }
        });
        
        const levelName = file.name.replace('.txt', '').replace(/_/g, ' ').toUpperCase();
        prepareSession(customLevelData, `KUSTOM: ${levelName}`);
        fileInput.value = ''; 
    };
    reader.readAsText(file);
});

// -- FUNGSI INTI: MENYIAPKAN SESI (HYBRID ADAPTIF) --
function prepareSession(dataArray, levelName) {
    let sessionWords = [];
    
    // 1. Registrasi kata ke database utama jika belum ada (untuk melacak statistik)
    dataArray.forEach(item => {
        const w = item.word.toLowerCase();
        if (!wordDatabase[w]) {
            wordDatabase[w] = { correct: 0, wrong: 0, translation: item.trans, definition: item.def };
        } else {
            // Perbarui arti jika ada perubahan
            wordDatabase[w].translation = item.trans;
            wordDatabase[w].definition = item.def;
        }
        sessionWords.push(w);
    });
    
    localStorage.setItem('spellingAdaptiveDB', JSON.stringify(wordDatabase));

    // 2. Susun antrean KHUSUS untuk kata-kata di level ini saja
    // Urutkan berdasarkan rekam jejak kesalahan tertinggi
    sessionQueue = sessionWords.sort((a, b) => {
        const errorRateA = wordDatabase[a].wrong - wordDatabase[a].correct;
        const errorRateB = wordDatabase[b].wrong - wordDatabase[b].correct;
        return errorRateB - errorRateA; 
    });

    // 3. Perbarui UI
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
        
        // Coba kosongkan level selector
        levelSelector.value = "";
    }
}

// -- LOGIKA HAPUS DATABASE --
btnClearData.addEventListener('click', () => {
    if(confirm("PERINGATAN: Tindakan ini akan menghapus riwayat statistik Anda. Kata-kata di dropdown TIDAK akan hilang, hanya statistiknya yang di-reset. Lanjutkan?")) {
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

// -- MODUL TEXT-TO-SPEECH & EVALUASI --
function speakWord(text) {
    if (!text) return;
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
    } else {
        alert("Browser Anda tidak mendukung Text-to-Speech.");
    }
}

btnListen.addEventListener('click', () => { speakWord(targetWord); });

btnSubmit.addEventListener('click', () => {
    if (sessionQueue.length === 0) return; 

    const userInput = wordInput.value.toLowerCase().trim();
    const targetLower = targetWord.toLowerCase();
    
    feedbackArea.innerHTML = '';
    if (userInput === "") {
        feedbackArea.textContent = "Silakan ketik sesuatu terlebih dahulu.";
        return; 
    }

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
        sessionQueue.shift(); // Buang dari antrean karena benar
        
        message.textContent = "Tepat sekali!";
        message.style.color = "#28a745";
        feedbackArea.appendChild(comparisonContainer);
        feedbackArea.appendChild(message);
    } else {
        wordDatabase[targetLower].wrong++; 
        
        // HUKUMAN: Lempar ke belakang antrean agar diuji lagi
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

// Matikan input saat awal muat sebelum level dipilih
wordInput.disabled = true;
btnSubmit.disabled = true;