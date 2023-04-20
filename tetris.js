const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scale = 20;
const numRows = 20;
const numCols = 10;

const shapes = [
    [[1, 1, 1], [1, 0, 0]],
    [[1, 1, 1], [0, 0, 1]],
    [[1, 1], [1, 1]],
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 1, 1, 1]],
    [[0, 1, 0], [1, 1, 1]],
];

const colors = ['orange', 'blue', 'yellow', 'red', 'green', 'cyan', 'purple'];

class Piece {
    constructor(shapeIndex) {
        this.matrix = shapes[shapeIndex];
        this.color = colors[shapeIndex];
        this.pos = {x: Math.floor(numCols / 2) - 1, y: 0};
    }
}

let piece = createPiece();
let nextPiece = createPiece();

function createPiece() {
    return new Piece(Math.floor(Math.random() * shapes.length));
}

function drawPiece(piece) {
    const ghostPos = getGhostPosition(piece, board);
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                // Draw ghost piece
                ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
                ctx.fillRect((ghostPos.x + x) * scale, (ghostPos.y + y) * scale, scale, scale);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.strokeRect((ghostPos.x + x) * scale, (ghostPos.y + y) * scale, scale, scale);

                // Draw actual piece
                ctx.fillStyle = piece.color;
                ctx.fillRect((piece.pos.x + x) * scale, (piece.pos.y + y) * scale, scale, scale);
                ctx.strokeStyle = 'black';
                ctx.strokeRect((piece.pos.x + x) * scale, (piece.pos.y + y) * scale, scale, scale);
            }
        });
    });
}

function drawNextPiece() {
    const nextCanvas = document.getElementById('next');
    const nextCtx = nextCanvas.getContext('2d');
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

    nextPiece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                nextCtx.fillStyle = nextPiece.color;
                nextCtx.fillRect(x * scale, y * scale, scale, scale);
                nextCtx.strokeStyle = 'black';
                nextCtx.strokeRect(x * scale, y * scale, scale, scale);
            }
        });
    });
}


function collide(piece, board) {
    for (let y = 0; y < piece.matrix.length; y++) {
        for (let x = 0; x < piece.matrix[y].length; x++) {
            if (piece.matrix[y][x] && (board[piece.pos.y + y] && board[piece.pos.y + y][piece.pos.x + x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(piece, board) {
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                board[piece.pos.y + y][piece.pos.x + x] = piece.color;
            }
        });
    });
}

function rotate(matrix, dir) {
    const transposed = matrix[0].map((_, i) => matrix.map(row => row[i]));
    return dir > 0 ? transposed.map(row => row.reverse()) : transposed.reverse();
}

function createBoard() {
    return Array.from({ length: numRows }, () => Array(numCols).fill(0));
}

function drawBoard(board) {
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            ctx.fillStyle = value || 'black';
            ctx.fillRect(x * scale, y * scale, scale, scale);
            if (value) {
                ctx.strokeStyle = 'black';
                ctx.strokeRect(x * scale, y * scale, scale, scale);
            }
        });
    });
}

function movePiece(piece, board, dir) {
    piece.pos.x += dir
    if (collide(piece, board)) {
        piece.pos.x -= dir;
    }
}

function dropPiece(piece, board) {
    piece.pos.y++;
    if (collide(piece, board)) {
        piece.pos.y--;
        merge(piece, board);
        return true;
    }
    return false;
}

function rotatePiece(piece, board, dir) {
    const originalMatrix = piece.matrix;
    piece.matrix = rotate(piece.matrix, dir);
    if (collide(piece, board)) {
        piece.matrix = originalMatrix;
    }
}

function clearLines(board) {
    outer: for (let y = board.length - 1; y >= 0; y--) {
        for (let x = 0; x < numCols; x++) {
            if (!board[y][x]) {
                continue outer;
            }
        }
        board.splice(y, 1);
        board.unshift(Array(numCols).fill(0));
    }
}

function gameLoop() {
    if (dropPiece(piece, board)) {
        clearLines(board);
        piece = createPiece();
        if (collide(piece, board)) {
            // ゲームオーバー処理
            console.log('Game Over');
            board = createBoard();
        }
    }
    drawBoard(board);
    drawPiece(piece);
    setTimeout(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        gameLoop();
    }, 500);
}

const board = createBoard();
gameLoop();

document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
        movePiece(piece, board, -1);
    } else if (event.key === 'ArrowRight') {
        movePiece(piece, board, 1);
    } else if (event.key === 'ArrowUp') {
        rotatePiece(piece, board, 1);
    } else if (event.key === 'ArrowDown') {
        rotatePiece(piece, board, -1);
    } else if (event.key === ' ') {
        while (!dropPiece(piece, board)) { }
    }
});

function getGhostPosition(piece, board) {
    const ghostPos = { ...piece.pos };
    while (!collide({ ...piece, pos: ghostPos }, board)) {
        ghostPos.y++;
    }
    ghostPos.y--;
    return ghostPos;
}

function resetPiece() {
    piece = nextPiece;
    piece.pos.x = Math.floor(numCols / 2) - 2;
    piece.pos.y = 0;

    nextPiece = createPiece();
}



