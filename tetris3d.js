const container = document.getElementById("container");
const renderer = new THREE.WebGLRenderer();
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
    80,  // 視野角をさらに広く（広角レンズ風）
    container.clientWidth / container.clientHeight,
    0.1,
    1000
);

// カメラは最初から正面の位置に固定
camera.position.set(4.5, 9.5, 15);  // 正面の位置
camera.lookAt(4.5, 9.5, 0);  // ステージの中心を見る

const scene = new THREE.Scene();

// ステージ全体を動かすためのグループ
const stageGroup = new THREE.Group();
// 初期位置：横向きでカメラの真後ろ
stageGroup.position.set(0, 0, 20);  // カメラの後ろ（Z軸の正の方向）
stageGroup.rotation.y = Math.PI / 2;  // 90度回転（横向き）
scene.add(stageGroup);

// ステージアニメーション用の変数
let stageAnimation = null;

// ライティングを追加して立体感を強調
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);  // 環境光を少し強く
scene.add(ambientLight);

// const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);  // メインライトを弱く
// directionalLight.position.set(5, 10, 10);  // 正面寄りに配置
// directionalLight.castShadow = true;
// scene.add(directionalLight);

// 正面を照らす追加のライト（弱めに）
const frontLight = new THREE.DirectionalLight(0xffffff, 0.4);  // 適度な強さ
frontLight.position.set(4.5, 3, 20);  // 下の方から照らす
scene.add(frontLight);

const numRows = 20;
const numCols = 10;
const blockSize = 1;

// フレームをEdgesGeometryで作成（対角線なし）
const frameGeometry = new THREE.BoxGeometry(
    numCols * blockSize,
    numRows * blockSize,
    blockSize
);

// EdgesGeometryを使用（これは辺のみを作成し、対角線は含まない）
const edges = new THREE.EdgesGeometry(frameGeometry);
const lineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x00D9FF,  // スカイブルーに変更（テトリミノのI型と同じ色）
    linewidth: 2 
});
const frame = new THREE.LineSegments(edges, lineMaterial);

frame.position.set(
    (numCols * blockSize / 2) - blockSize / 2,
    (numRows * blockSize / 2) - blockSize / 2,
    0
);

stageGroup.add(frame);

// 濃い紺色の背景を追加
const bgGeometry = new THREE.PlaneGeometry(
    numCols * blockSize,
    numRows * blockSize
);
const bgMaterial = new THREE.MeshBasicMaterial({
    color: 0x0a0a2e,  // 濃い紺色
    side: THREE.DoubleSide
});
const background = new THREE.Mesh(bgGeometry, bgMaterial);
background.position.set(
    (numCols * blockSize / 2) - blockSize / 2,
    (numRows * blockSize / 2) - blockSize / 2,
    -blockSize / 2
);
stageGroup.add(background);

// 背景の外枠（青色）を追加
const bgEdges = new THREE.EdgesGeometry(bgGeometry);
const bgEdgeMaterial = new THREE.LineBasicMaterial({ 
    color: 0x00D9FF,
    linewidth: 2
});
const bgFrame = new THREE.LineSegments(bgEdges, bgEdgeMaterial);
bgFrame.position.copy(background.position);
stageGroup.add(bgFrame);

// 白いグリッド線を追加（背景と同じ深さに配置）
const gridGroup = new THREE.Group();
const gridMaterial = new THREE.LineBasicMaterial({ 
    color: 0xffffff, 
    opacity: 0.2,
    transparent: true
});

const gridZ = -blockSize / 2 + 0.01; // 背景の少し前

// 縦線（ブロックの境界に配置）
for (let i = 0; i <= numCols; i++) {
    const points = [];
    const x = i * blockSize - blockSize / 2;
    points.push(new THREE.Vector3(x, -blockSize / 2, gridZ));
    points.push(new THREE.Vector3(x, numRows * blockSize - blockSize / 2, gridZ));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, gridMaterial);
    gridGroup.add(line);
}

// 横線（ブロックの境界に配置）
for (let i = 0; i <= numRows; i++) {
    const points = [];
    const y = i * blockSize - blockSize / 2;
    points.push(new THREE.Vector3(-blockSize / 2, y, gridZ));
    points.push(new THREE.Vector3(numCols * blockSize - blockSize / 2, y, gridZ));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, gridMaterial);
    gridGroup.add(line);
}

stageGroup.add(gridGroup);

function createBoard(rows, cols) {
    const matrix = [];
    for (let i = 0; i < rows; i++) {
        matrix.push(new Array(cols).fill(0));
    }
    return matrix;
}

let board = createBoard(numRows, numCols);

// ゲーム状態の変数
let score = 0;
let lines = 0;
let level = 1;

// Next piece用のシーンとレンダラー
const nextContainer = document.getElementById("next-piece");
const nextRenderer = new THREE.WebGLRenderer();
nextRenderer.setSize(100, 100);
nextContainer.appendChild(nextRenderer.domElement);

const nextCamera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
nextCamera.position.set(1.5, 1, 5);
nextCamera.lookAt(1.5, 1, 0);

const nextScene = new THREE.Scene();

// NEXTピース用のライト
const nextAmbientLight = new THREE.AmbientLight(0xffffff, 0.5);
nextScene.add(nextAmbientLight);
const nextDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
nextDirectionalLight.position.set(2, 2, 2);
nextScene.add(nextDirectionalLight);

let nextPieceGroup = null;
let nextRotationGroup = null;

// ライン消去エフェクト用の変数
let clearingLines = [];
let clearAnimationStart = null;
const clearAnimationDuration = 500; // 0.5秒
let isGameOver = false; // ゲームオーバー状態
let isGameStarted = false; // ゲーム開始状態

function drawBoard() {
    const group = new THREE.Group();
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            if (board[row][col]) {
                const cubeGeometry = new THREE.BoxGeometry(
                    blockSize,
                    blockSize,
                    blockSize
                );
                const cubeMaterial = new THREE.MeshPhongMaterial({
                    color: tetrominoColors[board[row][col] - 1],
                    specular: 0x222222,
                    shininess: 30,
                });
                const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
                
                // 黒い線（エッジ）を追加
                const edgeGeometry = new THREE.EdgesGeometry(cubeGeometry);
                const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
                const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
                cube.add(edges);
                
                cube.position.set(
                    col * blockSize,
                    (numRows - 1 - row) * blockSize,
                    0
                );
                group.add(cube);
            }
        }
    }
    return group;
}

let boardGroup = drawBoard();
stageGroup.add(boardGroup);

// Tetromino shape definitions
const tetrominoShapes = [
    [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
    ],
    [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
    ],
    [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
    ],
    [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
    ],
    [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
    ],
    [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 0 },
    ],
    [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
    ],
];

const tetrominoColors = [
    0x00D9FF,  // I - スカイブルー
    0xFFD700,  // O - ゴールド
    0x50E3C2,  // S - ミントグリーン
    0xFF6B6B,  // Z - コーラルレッド
    0x4169E1,  // J - ロイヤルブルー
    0xFF8C42,  // L - サンセットオレンジ
    0xB19CD9,  // T - ソフトパープル
];

function createTetromino() {
    const shapeIndex = Math.floor(Math.random() * tetrominoShapes.length);
    const shape = JSON.parse(JSON.stringify(tetrominoShapes[shapeIndex])); // Deep copy the shape
    const color = tetrominoColors[shapeIndex];

    const group = new THREE.Group();

    for (let i = 0; i < shape.length; i++) {
        const cubeGeometry = new THREE.BoxGeometry(
            blockSize,
            blockSize,
            blockSize
        );
        const cubeMaterial = new THREE.MeshPhongMaterial({
            color: color,
            specular: 0x222222,
            shininess: 30,
        });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        
        // 黒い線（エッジ）を追加
        const edgeGeometry = new THREE.EdgesGeometry(cubeGeometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        cube.add(edges);
        
        cube.position.set(
            shape[i].x * blockSize,
            shape[i].y * blockSize,
            0
        );
        group.add(cube);
    }

    return { group, shape, color };
}

// テトリミノの変数（ゲーム開始時まで生成しない）
let currentTetromino = null;
let nextTetromino = null;

let posX = 4 * blockSize;  // 初期位置を中央に設定
let posY = (numRows - 1) * blockSize;
let dropSpeed = 500; // ミリ秒ごとの落下速度
let lastDropTime = Date.now();

// Next piece表示を更新
function updateNextPieceDisplay() {
    if (nextRotationGroup) {
        nextScene.remove(nextRotationGroup);
    }
    
    nextPieceGroup = new THREE.Group();
    nextRotationGroup = new THREE.Group();
    
    // テトリミノの境界を計算
    let minX = Math.min(...nextTetromino.shape.map(block => block.x));
    let maxX = Math.max(...nextTetromino.shape.map(block => block.x));
    let minY = Math.min(...nextTetromino.shape.map(block => block.y));
    let maxY = Math.max(...nextTetromino.shape.map(block => block.y));
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    for (let i = 0; i < nextTetromino.shape.length; i++) {
        const cubeGeometry = new THREE.BoxGeometry(
            blockSize,
            blockSize,
            blockSize
        );
        const cubeMaterial = new THREE.MeshPhongMaterial({
            color: nextTetromino.color,
            specular: 0x222222,
            shininess: 30,
        });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        
        // 黒い線（エッジ）を追加
        const edgeGeometry = new THREE.EdgesGeometry(cubeGeometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        cube.add(edges);
        
        // 中心を原点にして配置
        cube.position.set(
            (nextTetromino.shape[i].x - centerX) * blockSize,
            (nextTetromino.shape[i].y - centerY) * blockSize,
            0
        );
        nextPieceGroup.add(cube);
    }
    
    nextRotationGroup.add(nextPieceGroup);
    nextRotationGroup.position.set(1.5, 1, 0);  // 表示エリアの中央に配置
    nextScene.add(nextRotationGroup);
}

// スコア表示を更新
function updateDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('lines').textContent = lines;
    document.getElementById('level').textContent = level;
}

let clearEffectGroup = null;

function animate() {
    requestAnimationFrame(animate);

    const currentTime = Date.now();
    
    // ステージアニメーション処理
    if (stageAnimation) {
        const elapsed = currentTime - stageAnimation.startTime;
        const progress = Math.min(elapsed / stageAnimation.duration, 1);
        
        // イージング関数（ease-out: 最初速く、最後ゆっくり）
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // ステージを回転（横向き→正面向き）
        stageGroup.rotation.y = Math.PI / 2 * (1 - easeProgress);
        
        // ステージをZ軸に沿ってまっすぐ移動（後ろから前へ）
        stageGroup.position.z = 20 * (1 - easeProgress);
        
        // アニメーション完了
        if (progress >= 1) {
            stageAnimation = null;
            stageGroup.rotation.y = 0;
            stageGroup.position.set(0, 0, 0);
        }
    }
    
    // ゲームが開始されていない場合は描画のみ
    if (!isGameStarted) {
        renderer.render(scene, camera);
        return;
    }
    
    // ライン消去アニメーション中は落下を一時停止
    if (clearAnimationStart) {
        const elapsed = currentTime - clearAnimationStart;
        const progress = Math.min(elapsed / clearAnimationDuration, 1);
        
        // 前のエフェクトを削除
        if (clearEffectGroup) {
            stageGroup.remove(clearEffectGroup);
        }
        
        // 新しいエフェクトを描画
        clearEffectGroup = drawClearingEffect(progress);
        stageGroup.add(clearEffectGroup);
        
        // アニメーション終了
        if (progress >= 1) {
            stageGroup.remove(clearEffectGroup);
            clearEffectGroup = null;
            finishLineClear();
        }
    } else if (!isGameOver) {
        // 通常の落下処理（ゲームオーバー中は停止）
        if (currentTime - lastDropTime > dropSpeed) {
            posY -= blockSize; // 下に移動

            if (checkCollision()) {
                posY += blockSize; // 衝突した場合は元の位置に戻す
                addToBoard();
                resetTetromino();
            }

            lastDropTime = currentTime;
        }

        // Tetrominoの位置を更新
        currentTetromino.group.position.set(posX, posY, 0);
    }

    // メインシーンをレンダリング
    renderer.render(scene, camera);
    
    // ネクストピースをレンダリング
    if (nextRotationGroup) {
        nextRotationGroup.rotation.y += 0.01; // 回転アニメーション
        nextRenderer.render(nextScene, nextCamera);
    }
}

function checkCollision() {
    const x = Math.floor(posX / blockSize);
    const y = Math.floor(posY / blockSize);

    // テトリミノの各ブロック位置を確認
    for (const block of currentTetromino.shape) {
        const checkX = x + block.x;
        const checkY = numRows - 1 - (y + block.y);

        // 底に達した場合
        if (checkY >= numRows) {
            return true;
        }

        // 左右の壁を超えた場合
        if (checkX < 0 || checkX >= numCols) {
            return true;
        }

        // 既存のブロックに衝突した場合
        if (checkY >= 0 && checkY < numRows && board[checkY][checkX] !== 0) {
            return true;
        }
    }

    return false;
}

function addToBoard() {
    const x = Math.floor(posX / blockSize);
    const y = Math.floor(posY / blockSize);
    const colorIndex = tetrominoColors.indexOf(currentTetromino.color) + 1;

    for (const block of currentTetromino.shape) {
        const boardX = x + block.x;
        const boardY = numRows - 1 - (y + block.y);

        if (boardY >= 0 && boardY < numRows && boardX >= 0 && boardX < numCols) {
            board[boardY][boardX] = colorIndex;
        }
    }

    // ライン消去をチェック
    clearLines();
    
    stageGroup.remove(boardGroup);
    boardGroup = drawBoard();
    stageGroup.add(boardGroup);
}

function resetTetromino() {
    stageGroup.remove(currentTetromino.group); // 前のテトリミノを削除
    
    // ネクストピースを現在のピースにする
    currentTetromino = nextTetromino;
    nextTetromino = createTetromino();
    updateNextPieceDisplay();
    
    posX = 4 * blockSize;
    posY = (numRows - 1) * blockSize;
    stageGroup.add(currentTetromino.group);
    
    // ゲームオーバーチェック
    if (checkCollision()) {
        showGameOver();
    }
}

// キーボード操作の追加
document.addEventListener('keydown', (event) => {
    // ゲームが開始されていない、ライン消去アニメーション中、またはゲームオーバー中は操作を無効化
    if (!isGameStarted || clearAnimationStart || isGameOver) return;
    
    if (event.key === 'ArrowLeft') {
        // 左移動
        posX -= blockSize;
        if (checkCollision()) {
            posX += blockSize; // 衝突したら戻す
        }
    } else if (event.key === 'ArrowRight') {
        // 右移動
        posX += blockSize;
        if (checkCollision()) {
            posX -= blockSize; // 衝突したら戻す
        }
    } else if (event.key === 'ArrowDown') {
        // 高速落下
        posY -= blockSize;
        if (checkCollision()) {
            posY += blockSize;
            addToBoard();
            resetTetromino();
        }
    } else if (event.key === ' ') {
        // 瞬間落下（ハードドロップ）
        while (!checkCollision()) {
            posY -= blockSize;
        }
        posY += blockSize; // 衝突位置から1つ戻す
        addToBoard();
        resetTetromino();
    } else if (event.key === 'ArrowUp' || event.key === 'z' || event.key === 'Z') {
        // 回転
        rotateTetromino();
    }
    
    // Tetrominoの位置を即座に更新
    currentTetromino.group.position.set(posX, posY, 0);
});

// テトリミノの回転機能
function rotateTetromino() {
    // 元の形状を保存
    const originalShape = JSON.parse(JSON.stringify(currentTetromino.shape));
    
    // 回転の中心を計算
    let minX = Math.min(...currentTetromino.shape.map(block => block.x));
    let maxX = Math.max(...currentTetromino.shape.map(block => block.x));
    let minY = Math.min(...currentTetromino.shape.map(block => block.y));
    let maxY = Math.max(...currentTetromino.shape.map(block => block.y));
    let centerX = (minX + maxX) / 2;
    let centerY = (minY + maxY) / 2;
    
    // 形状を回転（時計回り）
    for (let i = 0; i < currentTetromino.shape.length; i++) {
        let relX = currentTetromino.shape[i].x - centerX;
        let relY = currentTetromino.shape[i].y - centerY;
        currentTetromino.shape[i].x = Math.round(-relY + centerX);
        currentTetromino.shape[i].y = Math.round(relX + centerY);
    }
    
    // 衝突チェック
    if (checkCollision()) {
        // 衝突したら元に戻す
        currentTetromino.shape = originalShape;
    } else {
        // 回転が成功したら3Dオブジェクトを更新
        stageGroup.remove(currentTetromino.group);
        const color = currentTetromino.color;
        const group = new THREE.Group();
        
        for (let i = 0; i < currentTetromino.shape.length; i++) {
            const cubeGeometry = new THREE.BoxGeometry(
                blockSize,
                blockSize,
                blockSize
            );
            const cubeMaterial = new THREE.MeshPhongMaterial({
                color: color,
                specular: 0x222222,
                shininess: 30,
            });
            const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
            
            // 黒い線（エッジ）を追加
            const edgeGeometry = new THREE.EdgesGeometry(cubeGeometry);
            const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
            const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
            cube.add(edges);
            
            cube.position.set(
                currentTetromino.shape[i].x * blockSize,
                currentTetromino.shape[i].y * blockSize,
                0
            );
            group.add(cube);
        }
        
        currentTetromino.group = group;
        stageGroup.add(currentTetromino.group);
        currentTetromino.group.position.set(posX, posY, 0);
    }
}

// パーティクルのランダム速度を保存
const particleVelocities = new Map();

// ライン消去エフェクトを描画
function drawClearingEffect(progress) {
    const effectGroup = new THREE.Group();
    
    // 消去ライン数に応じて段階的に派手に
    const lineCount = clearingLines.length;
    let particlesPerBlock;
    let particleSpeedMultiplier;
    let particleSizeMultiplier;
    
    switch(lineCount) {
        case 1:
            particlesPerBlock = 5;     // 1段: 控えめ
            particleSpeedMultiplier = 0.7;
            particleSizeMultiplier = 0.8;
            break;
        case 2:
            particlesPerBlock = 8;     // 2段: 中程度
            particleSpeedMultiplier = 1.0;
            particleSizeMultiplier = 1.0;
            break;
        case 3:
            particlesPerBlock = 10;    // 3段: 派手（減らした）
            particleSpeedMultiplier = 1.3;
            particleSizeMultiplier = 1.2;
            break;
        case 4:
            particlesPerBlock = 12;    // 4段(テトリス): 超派手（大幅に減らした）
            particleSpeedMultiplier = 1.6;
            particleSizeMultiplier = 1.5;
            break;
        default:
            particlesPerBlock = 10;
            particleSpeedMultiplier = 1.0;
            particleSizeMultiplier = 1.0;
    }
    
    // テトリス（4段）の時は特別な演出
    if (lineCount === 4 && progress < 0.2) {
        // 画面全体に金色のフラッシュ
        const flashGeometry = new THREE.PlaneGeometry(
            numCols * blockSize * 2,
            numRows * blockSize * 2
        );
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: (1 - progress * 5) * 0.3,
            emissive: 0xFFD700,
            emissiveIntensity: 2
        });
        const screenFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        screenFlash.position.set(
            (numCols / 2 - 0.5) * blockSize,
            (numRows / 2 - 0.5) * blockSize,
            blockSize * 2
        );
        effectGroup.add(screenFlash);
    }
    
    for (const rowIndex of clearingLines) {
        for (let col = 0; col < numCols; col++) {
            if (board[rowIndex][col]) {
                const blockKey = `${rowIndex}-${col}`;
                
                // 消去段数に応じたパーティクル数
                const particleCount = particlesPerBlock;
                
                // 初回のみ速度を生成
                if (!particleVelocities.has(blockKey)) {
                    const velocities = [];
                    for (let p = 0; p < particleCount; p++) {
                        // 段数に応じた爆発力
                        const angle = Math.random() * Math.PI * 2;
                        const power = (Math.random() * 15 + 5) * particleSpeedMultiplier;
                        velocities.push({
                            x: Math.cos(angle) * power,
                            y: (Math.random() - 0.2) * 20 * particleSpeedMultiplier, // 上方向に強く
                            z: Math.sin(angle) * power,
                            rotSpeed: Math.random() * 20 - 10
                        });
                    }
                    particleVelocities.set(blockKey, velocities);
                }
                
                const velocities = particleVelocities.get(blockKey);
                
                for (let p = 0; p < particleCount; p++) {
                    // 3段以上の場合、一部のパーティクルをスキップ（パフォーマンス最適化）
                    if (lineCount >= 3 && p % 2 === 0 && Math.random() > 0.5) {
                        continue;
                    }
                    
                    // パーティクルサイズを段数に応じて調整
                    const size = (Math.random() * 0.15 + 0.05) * particleSizeMultiplier;
                    const particleGeometry = new THREE.SphereGeometry(
                        blockSize * size * (1 - progress * 0.3)
                    );
                    
                    // 虹色に変化する色
                    const hue = (progress + p / particleCount) % 1;
                    const particleColor = new THREE.Color().setHSL(hue, 1, 0.6);
                    
                    const particleMaterial = new THREE.MeshBasicMaterial({
                        color: particleColor,
                        transparent: true,
                        opacity: (1 - progress) * 0.9,
                        emissive: particleColor,
                        emissiveIntensity: 2
                    });
                    
                    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
                    
                    // 重力を考慮した物理的な動き
                    const vel = velocities[p];
                    const gravity = -15;
                    const time = progress * 0.6;
                    
                    particle.position.set(
                        col * blockSize + vel.x * time,
                        (numRows - 1 - rowIndex) * blockSize + vel.y * time + 0.5 * gravity * time * time,
                        vel.z * time
                    );
                    
                    // 虹色に変化する軌跡（段数に応じて調整、軽量化）
                    const trailCount = Math.min(lineCount, 2); // 最大2本に制限
                    for (let t = 0; t < trailCount; t++) {
                        const trailProgress = progress - (t * 0.05);
                        if (trailProgress > 0 && trailProgress < 0.7) {
                            const trailTime = trailProgress * 0.6;
                            
                            // 軌跡を線で表現（軽量化）
                            const points = [];
                            const currentPos = new THREE.Vector3(
                                col * blockSize + vel.x * trailTime,
                                (numRows - 1 - rowIndex) * blockSize + vel.y * trailTime + 0.5 * gravity * trailTime * trailTime,
                                vel.z * trailTime
                            );
                            const prevTime = trailTime - 0.02;
                            const prevPos = new THREE.Vector3(
                                col * blockSize + vel.x * prevTime,
                                (numRows - 1 - rowIndex) * blockSize + vel.y * prevTime + 0.5 * gravity * prevTime * prevTime,
                                vel.z * prevTime
                            );
                            points.push(prevPos, currentPos);
                            
                            const trailGeometry = new THREE.BufferGeometry().setFromPoints(points);
                            const trailHue = (trailProgress + p / particleCount) % 1;
                            const trailColor = new THREE.Color().setHSL(trailHue, 1, 0.6);
                            
                            const trailMaterial = new THREE.LineBasicMaterial({
                                color: trailColor,
                                transparent: true,
                                opacity: (1 - trailProgress) * 0.6,
                                linewidth: 3
                            });
                            
                            const trail = new THREE.Line(trailGeometry, trailMaterial);
                            effectGroup.add(trail);
                        }
                    }
                    
                    // パーティクルを回転
                    particle.rotation.x = vel.rotSpeed * progress;
                    particle.rotation.y = vel.rotSpeed * progress * 1.3;
                    particle.rotation.z = vel.rotSpeed * progress * 0.7;
                    
                    effectGroup.add(particle);
                }
                
                // 爆発の中心に明るい閃光（4段消去時はより大きく）
                if (progress < 0.3) {
                    const flashSize = lineCount === 4 ? 1.5 : 1; // テトリス時は大きく
                    const flashGeometry = new THREE.SphereGeometry(
                        blockSize * flashSize * (1 - progress * 3)
                    );
                    const flashMaterial = new THREE.MeshBasicMaterial({
                        color: lineCount === 4 ? 0xFFD700 : 0xFFFFFF, // テトリス時は金色
                        transparent: true,
                        opacity: (1 - progress * 3) * (lineCount === 4 ? 1 : 0.8),
                        emissive: lineCount === 4 ? 0xFFD700 : 0xFFFFFF,
                        emissiveIntensity: lineCount === 4 ? 3 : 2
                    });
                    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
                    flash.position.set(
                        col * blockSize,
                        (numRows - 1 - rowIndex) * blockSize,
                        0
                    );
                    effectGroup.add(flash);
                }
                
                // 元のブロックを点滅させながらフェードアウト
                const cubeGeometry = new THREE.BoxGeometry(
                    blockSize,
                    blockSize,
                    blockSize
                );
                
                // 点滅効果（sin波で明滅）
                const blinkSpeed = 15; // 点滅速度
                const blinkIntensity = Math.sin(progress * Math.PI * blinkSpeed) * 0.3 + 0.7;
                const fadeOut = Math.max(0, 1 - progress * 1.5);
                
                const originalColor = tetrominoColors[board[rowIndex][col] - 1];
                // 点滅時は白く光る
                const blinkColor = progress < 0.5 
                    ? new THREE.Color(originalColor).lerp(new THREE.Color(0xFFFFFF), blinkIntensity * 0.5)
                    : originalColor;
                
                const cubeMaterial = new THREE.MeshBasicMaterial({
                    color: blinkColor,
                    transparent: true,
                    opacity: fadeOut * blinkIntensity,
                    emissive: blinkColor,
                    emissiveIntensity: blinkIntensity
                });
                const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
                
                if (progress < 0.5) { // エッジも早めに消す
                    const edgeGeometry = new THREE.EdgesGeometry(cubeGeometry);
                    const edgeMaterial = new THREE.LineBasicMaterial({ 
                        color: 0x000000, 
                        linewidth: 2,
                        transparent: true,
                        opacity: 1 - progress * 2
                    });
                    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
                    cube.add(edges);
                }
                
                cube.position.set(
                    col * blockSize,
                    (numRows - 1 - rowIndex) * blockSize,
                    0
                );
                
                effectGroup.add(cube);
            }
        }
    }
    
    return effectGroup;
}

// ライン消去機能の追加
function clearLines() {
    const linesToClear = [];
    
    for (let row = numRows - 1; row >= 0; row--) {
        let isFullLine = true;
        for (let col = 0; col < numCols; col++) {
            if (board[row][col] === 0) {
                isFullLine = false;
                break;
            }
        }
        
        if (isFullLine) {
            linesToClear.push(row);
        }
    }
    
    if (linesToClear.length > 0) {
        // エフェクトアニメーションを開始
        clearingLines = linesToClear;
        clearAnimationStart = Date.now();
        
        // スコア計算（テトリス方式）
        const lineScores = [0, 100, 300, 500, 800];
        score += lineScores[Math.min(linesToClear.length, 4)] * level;
        lines += linesToClear.length;
        
        // レベルアップ（10ライン毎）
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            dropSpeed = Math.max(100, 500 - (level - 1) * 50); // レベルが上がるとスピードアップ
        }
        
        updateDisplay();
    }
}

// アニメーション終了時にラインを実際に削除
function finishLineClear() {
    // ラインを削除（逆順でソートして下から削除）
    clearingLines.sort((a, b) => b - a);
    for (const row of clearingLines) {
        board.splice(row, 1);
        board.unshift(new Array(numCols).fill(0));
    }
    
    // ボードを再描画
    stageGroup.remove(boardGroup);
    boardGroup = drawBoard();
    stageGroup.add(boardGroup);
    
    // エフェクト状態をリセット
    clearingLines = [];
    clearAnimationStart = null;
    particleVelocities.clear(); // パーティクル速度もクリア
}

// ゲームオーバー画面を表示
function showGameOver() {
    isGameOver = true;
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-lines').textContent = lines;
    document.getElementById('final-level').textContent = level;
    document.getElementById('game-over').style.display = 'block';
    
    // ゲーム画面にぼかしを追加
    renderer.domElement.classList.add('game-over-blur');
}

// ゲームをリセット
function resetGame() {
    // ボードをリセット
    board = createBoard(numRows, numCols);
    stageGroup.remove(boardGroup);
    boardGroup = drawBoard();
    stageGroup.add(boardGroup);
    
    // スコアをリセット
    score = 0;
    lines = 0;
    level = 1;
    dropSpeed = 500;
    updateDisplay();
    
    // ゲームオーバー画面を隠す
    document.getElementById('game-over').style.display = 'none';
    isGameOver = false;
    
    // ぼかしを解除
    renderer.domElement.classList.remove('game-over-blur');
    
    // 新しいテトリミノを生成
    stageGroup.remove(currentTetromino.group);
    currentTetromino = createTetromino();
    nextTetromino = createTetromino();
    stageGroup.add(currentTetromino.group);
    updateNextPieceDisplay();
    posX = 4 * blockSize;
    posY = (numRows - 1) * blockSize;
}

// ゲーム開始機能
function startGame() {
    // スタート画面を隠す
    document.getElementById('game-start').style.display = 'none';
    
    // ぼかしを解除
    renderer.domElement.classList.remove('game-not-started');
    
    // ステージ回転アニメーションを開始
    stageAnimation = {
        startTime: Date.now(),
        duration: 1800  // 1.8秒でステージが前進しながら回転
    };
    
    // ゲーム状態を初期化
    isGameStarted = true;
    isGameOver = false;
    board = createBoard(numRows, numCols);
    
    // 最初のテトリミノを生成
    currentTetromino = createTetromino();
    nextTetromino = createTetromino();
    stageGroup.add(currentTetromino.group);
    updateNextPieceDisplay();
    
    posX = 4 * blockSize;
    posY = (numRows - 1) * blockSize;
    lastDropTime = Date.now();
    
    // スコアをリセット
    score = 0;
    lines = 0;
    level = 1;
    dropSpeed = 500;
    updateDisplay();
}

// イベントリスナーを設定
// スタートボタンのイベントリスナー
const startBtn = document.getElementById('start-btn');
if (startBtn) {
    startBtn.addEventListener('click', () => {
        console.log('Start button clicked');
        startGame();
    });
} else {
    console.error('Start button not found');
}

// コンティニューボタンのイベントリスナー
const continueBtn = document.getElementById('continue-btn');
if (continueBtn) {
    continueBtn.addEventListener('click', () => {
        resetGame();
    });
}

// 初期状態でキャンバスにぼかしを適用
renderer.domElement.classList.add('game-not-started');

animate();