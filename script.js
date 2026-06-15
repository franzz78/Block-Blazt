// ==========================================
// CONFIGURASI & INISIALISASI FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyD9BmV4XKXuMWa4PZHpb7Bbt-rHs61m3lE",
  authDomain: "absensi-polri.firebaseapp.com",
  databaseURL: "https://absensi-polri-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "absensi-polri",
  storageBucket: "absensi-polri.firebasestorage.app",
  messagingSenderId: "19006760644",
  appId: "1:19006760644:web:b7dac0410e47877ded4b91",
  measurementId: "G-82KHRYZBN0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==========================================
// LOGIKA GAME BLOCK BLAST
// ==========================================
const GRID_SIZE = 8;
const gridElement = document.getElementById('grid');
const piecesContainer = document.getElementById('pieces-container');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const restartBtn = document.getElementById('restart-btn');

let board = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
let score = 0;
let highScore = 0;

// Ambil High Score secara Realtime dari Firebase
database.ref('highscore').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data !== null) {
        highScore = data;
        highScoreElement.textContent = highScore;
    } else {
        highScore = 0;
        highScoreElement.textContent = "0";
    }
});

// Daftar Bentuk Balok (Matriks 1 = Kotak Terisi, 0 = Kosong)
const SHAPES = [
    { matrix: [[1, 1], [1, 1]], color: '#ff2a6d' },          // Kotak 2x2
    { matrix: [[1, 1, 1, 1]], color: '#05d9e8' },            // Balok Panjang 4x1
    { matrix: [[1]], color: '#f5a623' },                     // Kotak Tunggal 1x1
    { matrix: [[1, 0], [1, 0], [1, 1]], color: '#01ff70' },  // Bentuk L
    { matrix: [[1, 1, 1], [0, 1, 0]], color: '#b10dc9' }     // Bentuk T
];

// Membuat Papan Grid 8x8 di HTML
function createBoard() {
    gridElement.innerHTML = '';
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            // Listener untuk sistem Drag and Drop
            cell.addEventListener('dragover', e => e.preventDefault());
            cell.addEventListener('drop', (e) => handleDrop(e, r, c));
            
            gridElement.appendChild(cell);
        }
    }
    updateBoardUI();
}

// Memperbarui tampilan papan berdasarkan kondisi array `board`
function updateBoardUI() {
    const cells = gridElement.children;
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const index = r * GRID_SIZE + c;
            const cellValue = board[r][c];
            if (cellValue !== 0) {
                cells[index].style.backgroundColor = cellValue;
                cells[index].classList.add('filled');
            } else {
                cells[index].style.backgroundColor = '';
                cells[index].classList.remove('filled');
            }
        }
    }
}

// Memunculkan 3 opsi balok secara acak di kontainer bawah
function spawnPieces() {
    piecesContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const pieceEl = document.createElement('div');
        pieceEl.classList.add('mini-piece');
        pieceEl.draggable = true;
        
        pieceEl.style.gridTemplateRows = `repeat(${randomShape.matrix.length}, 1fr)`;
        pieceEl.style.gridTemplateColumns = `repeat(${randomShape.matrix[0].length}, 1fr)`;

        randomShape.matrix.forEach(row => {
            row.forEach(val => {
                const block = document.createElement('div');
                block.style.width = '20px';
                block.style.height = '20px';
                block.style.borderRadius = '3px';
                if (val === 1) {
                    block.style.backgroundColor = randomShape.color;
                } else {
                    block.style.backgroundColor = 'transparent';
                }
                pieceEl.appendChild(block);
            });
        });

        // Mentransfer data balok saat ditarik
        pieceEl.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify(randomShape));
            setTimeout(() => pieceEl.style.visibility = 'hidden', 0);
        });

        pieceEl.addEventListener('dragend', () => {
            pieceEl.style.visibility = 'visible';
        });

        piecesContainer.appendChild(pieceEl);
    }
}

// Menangani kejadian drop/peletakan balok di atas grid
function handleDrop(e, row, col) {
    e.preventDefault();
    const shapeData = JSON.parse(e.dataTransfer.getData('text/plain'));
    const matrix = shapeData.matrix;
    
    // Cek apakah area grid muat untuk balok tersebut
    if (canPlace(matrix, row, col)) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] === 1) {
                    board[row + r][col + c] = shapeData.color;
                }
            }
        }
        
        // Hapus elemen balok yang berhasil ditaruh dari daftar pilihan bawah
        const hiddenPiece = document.querySelector('.mini-piece[style*="hidden"]');
        if (hiddenPiece) hiddenPiece.remove();
        
        updateBoardUI();
        checkBlasts();

        // Jika 3 pilihan balok sudah terpakai semua, buat 3 baru lagi
        if (piecesContainer.children.length === 0) {
            spawnPieces();
        }
    }
}

// Fungsi validasi kecocokan ruang grid
function canPlace(matrix, startRow, startCol) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] === 1) {
                const targetRow = startRow + r;
                const targetCol = startCol + c;
                if (targetRow >= GRID_SIZE || targetCol >= GRID_SIZE || board[targetRow][targetCol] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

// Menghancurkan baris atau kolom yang terisi penuh (Mekanik Blast)
function checkBlasts() {
    let rowsToBlast = [];
    let colsToBlast = [];

    for (let r = 0; r < GRID_SIZE; r++) {
        if (board[r].every(cell => cell !== 0)) rowsToBlast.push(r);
    }

    for (let c = 0; c < GRID_SIZE; c++) {
        let colFilled = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            if (board[r][c] === 0) {
                colFilled = false;
                break;
            }
        }
        if (colFilled) colsToBlast.push(c);
    }

    rowsToBlast.forEach(r => {
        for (let c = 0; c < GRID_SIZE; c++) board[r][c] = 0;
        score += 10;
    });

    colsToBlast.forEach(c => {
        for (let r = 0; r < GRID_SIZE; r++) board[r][c] = 0;
        score += 10;
    });

    if (rowsToBlast.length > 0 || colsToBlast.length > 0) {
        scoreElement.textContent = score;
        
        // Simpan skor terbaru ke Firebase jika memecahkan rekor tertinggi
        if (score > highScore) {
            highScore = score;
            database.ref('highscore').set(highScore);
        }
        updateBoardUI();
    }
}

// Tombol Main Lagi
restartBtn.addEventListener('click', () => {
    board = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    score = 0;
    scoreElement.textContent = score;
    createBoard();
    spawnPieces();
});

// Memulai game pertama kali dibuka
createBoard();
spawnPieces();

// Registrasi Service Worker untuk PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('PWA Service Worker aktif!'))
      .catch((err) => console.log('PWA Gagal:', err));
  });
            }

