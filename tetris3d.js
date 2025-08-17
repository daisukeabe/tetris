const container = document.getElementById("container");
const renderer = new THREE.WebGLRenderer();
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// リサイズ処理
function handleResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // メインカメラのアスペクト比を更新
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    // レンダラーのサイズを更新
    renderer.setSize(width, height);
    
    // NEXTピース表示のリサイズ
    if (typeof nextContainer !== 'undefined' && nextContainer) {
        const nextWidth = nextContainer.clientWidth;
        const nextHeight = nextContainer.clientHeight;
        if (typeof nextRenderer !== 'undefined' && nextRenderer) {
            nextRenderer.setSize(nextWidth, nextHeight);
        }
        if (typeof nextCamera !== 'undefined' && nextCamera) {
            nextCamera.aspect = nextWidth / nextHeight;
            nextCamera.updateProjectionMatrix();
        }
    }
}

// ウィンドウリサイズイベントにリスナーを追加
window.addEventListener('resize', handleResize);

// 初期サイズ設定は後で呼び出す

const camera = new THREE.PerspectiveCamera(
    80,  // 視野角をさらに広く（広角レンズ風）
    container.clientWidth / container.clientHeight,
    0.1,
    1000
);

// カメラは最初から正面の位置に固定
camera.position.set(4.5, 9.5, 14);  // 正面の位置
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

// Three.jsオブジェクト/リソースを確実に破棄するユーティリティ
function disposeMaterial(mat) {
    if (!mat) return;
    // テクスチャがあれば破棄
    for (const key in mat) {
        const val = mat[key];
        if (val && val.isTexture) {
            val.dispose();
        }
    }
    if (typeof mat.dispose === 'function') mat.dispose();
}

function disposeObject3D(obj) {
    if (!obj) return;
    obj.traverse((child) => {
        if (child.geometry && typeof child.geometry.dispose === 'function') {
            child.geometry.dispose();
        }
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(disposeMaterial);
            } else {
                disposeMaterial(child.material);
            }
        }
    });
}

// サウンドエフェクトの初期化
const putSound = new Audio('sound/put.m4a');
const sparkSound = new Audio('sound/spark.m4a');
const bgMusic = new Audio('sound/open.m4a');
const dangerMusic = new Audio('sound/caution.m4a');  // ピンチ時のBGM
const endMusic = new Audio('sound/end.m4a');
const continueMusic = new Audio('sound/conte.m4a');
putSound.volume = 0.30;  // 音量を30%に設定
sparkSound.volume = 0.40;  // 音量を40%に設定
bgMusic.volume = 0.05;  // BGMは5%に設定
dangerMusic.volume = 0.10;  // ピンチBGMも10%に設定
endMusic.volume = 0.10;  // エンディングBGMも10%に設定
continueMusic.volume = 0.15;  // コンティニューBGMは15%に設定
bgMusic.loop = false;  // ループしない
dangerMusic.loop = true;  // ループする
endMusic.loop = false;  // ループしない
continueMusic.loop = false;  // ループしない

// 音声ファイルをプリロード
putSound.load();
sparkSound.load();
bgMusic.load();
dangerMusic.load();
endMusic.load();
continueMusic.load();

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

// 背面のみ薄い壁面を追加
const backWallGeometry = new THREE.PlaneGeometry(
    numCols * blockSize,
    numRows * blockSize
);
const backWallMaterial = new THREE.MeshBasicMaterial({
    color: 0x4FC3F7,  // 明るいスカイブルー（線と同じ色）
    transparent: true,
    opacity: 0.02,  // 2%の透明度（背面のみ薄く）
    side: THREE.DoubleSide,
    depthWrite: false  // 深度バッファに書き込まない
});
const backWallMesh = new THREE.Mesh(backWallGeometry, backWallMaterial);
backWallMesh.position.set(
    (numCols * blockSize / 2) - blockSize / 2,
    (numRows * blockSize / 2) - blockSize / 2,
    -blockSize / 2  // 背面の位置
);
stageGroup.add(backWallMesh);

// その他の面（上下左右）は10%の透明度
const sideWallMaterial = new THREE.MeshBasicMaterial({
    color: 0x4FC3F7,  // 明るいスカイブルー（線と同じ色）
    transparent: true,
    opacity: 0.20,  // 20%の透明度
    side: THREE.DoubleSide,
    depthWrite: false
});

// 左壁
const leftWallGeometry = new THREE.PlaneGeometry(blockSize, numRows * blockSize);
const leftWallMesh = new THREE.Mesh(leftWallGeometry, sideWallMaterial);
leftWallMesh.rotation.y = Math.PI / 2;
leftWallMesh.position.set(
    -blockSize / 2,
    (numRows * blockSize / 2) - blockSize / 2,
    0
);
stageGroup.add(leftWallMesh);

// 右壁
const rightWallMesh = new THREE.Mesh(leftWallGeometry, sideWallMaterial);
rightWallMesh.rotation.y = Math.PI / 2;
rightWallMesh.position.set(
    numCols * blockSize - blockSize / 2,
    (numRows * blockSize / 2) - blockSize / 2,
    0
);
stageGroup.add(rightWallMesh);

// 上壁
const topWallGeometry = new THREE.PlaneGeometry(numCols * blockSize, blockSize);
const topWallMesh = new THREE.Mesh(topWallGeometry, sideWallMaterial);
topWallMesh.rotation.x = Math.PI / 2;
topWallMesh.position.set(
    (numCols * blockSize / 2) - blockSize / 2,
    numRows * blockSize - blockSize / 2,
    0
);
stageGroup.add(topWallMesh);

// 下壁
const bottomWallMesh = new THREE.Mesh(topWallGeometry, sideWallMaterial);
bottomWallMesh.rotation.x = Math.PI / 2;
bottomWallMesh.position.set(
    (numCols * blockSize / 2) - blockSize / 2,
    -blockSize / 2,
    0
);
stageGroup.add(bottomWallMesh);

// EdgesGeometryを使用（これは辺のみを作成し、対角線は含まない）
const edges = new THREE.EdgesGeometry(frameGeometry);
const lineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x4FC3F7,  // 明るいスカイブルー
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
    color: 0x1a1a3e,  // より明るい紺色
    side: THREE.DoubleSide
});
const background = new THREE.Mesh(bgGeometry, bgMaterial);
background.position.set(
    (numCols * blockSize / 2) - blockSize / 2,
    (numRows * blockSize / 2) - blockSize / 2,
    -blockSize / 2 - 0.01  // グリッド線より後ろに配置
);
stageGroup.add(background);

// 背景画像をランダムに選択して表示
const backgroundImages = ['bg01.jpg', 'bg02.jpg', 'bg03.jpg', 'bg04.jpg'];
const randomBgImage = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];

// 背景画像のメッシュを保存する変数
let bgImageMesh = null;
let bgImageTargetRotation = 0;  // 目標の回転角度
let bgImageCurrentRotation = 0;  // 現在の回転角度

// テクスチャローダーで画像を読み込み
const textureLoader = new THREE.TextureLoader();
textureLoader.load(
    `img/${randomBgImage}`,
    function(texture) {
        // 背景画像用の大きな平面を作成
        const bgImageGeometry = new THREE.PlaneGeometry(
            numCols * blockSize * 8,  // さらに大きく
            numRows * blockSize * 4   // 縦横比を調整
        );
        const bgImageMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.7,  // 適度な透明度
            side: THREE.DoubleSide
        });
        bgImageMesh = new THREE.Mesh(bgImageGeometry, bgImageMaterial);
        bgImageMesh.position.set(
            (numCols * blockSize / 2) - blockSize / 2,
            (numRows * blockSize / 2) - blockSize / 2,
            -blockSize * 10  // 後ろに配置
        );
        scene.add(bgImageMesh);  // sceneに直接追加（stageGroupではなく）
        
        console.log('背景画像を読み込みました:', randomBgImage);
    },
    undefined,
    function(error) {
        console.error('背景画像の読み込みエラー:', error);
    }
);

// 背景の外枠（青色）を追加
const bgEdges = new THREE.EdgesGeometry(bgGeometry);
const bgEdgeMaterial = new THREE.LineBasicMaterial({ 
    color: 0x4FC3F7,  // 明るいスカイブルー
    linewidth: 2
});
const bgFrame = new THREE.LineSegments(bgEdges, bgEdgeMaterial);
bgFrame.position.copy(background.position);
stageGroup.add(bgFrame);

// 白いグリッド線を追加（背景と同じ深さに配置）
const gridGroup = new THREE.Group();
const gridMaterial = new THREE.LineBasicMaterial({ 
    color: 0x4FC3F7,  // 枠と同じ水色
    opacity: 0.2,
    transparent: true
});

const gridZ = -blockSize / 2 + 0.02; // 背景の少し手前に表示

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
nextRenderer.setSize(nextContainer.clientWidth, nextContainer.clientHeight);
nextContainer.appendChild(nextRenderer.domElement);

const nextCamera = new THREE.PerspectiveCamera(
    55, 
    nextContainer.clientWidth / nextContainer.clientHeight, 
    0.1, 
    1000
);
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

// カメラシェイク用の変数
let cameraShakeStart = null;
let cameraShakeDuration = 0;
let cameraShakeIntensity = 0;
const originalCameraPosition = { x: 4.5, y: 9.5, z: 14 };

// 危険レベル警告用の変数
let isDangerLevel = false;
let warningFlashStart = null;

// コンティニュー中フラグ
let isContinuing = false;
let fadeAnimationActive = false;
let dangerMusicFadeInterval = null;

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
                
                // より濃い色の線（エッジ）を追加
                const blockColor = tetrominoColors[board[row][col] - 1];
                const edgeGeometry = new THREE.EdgesGeometry(cubeGeometry);
                const darkerColor = new THREE.Color(blockColor).multiplyScalar(0.5); // 50%の明度
                const edgeMaterial = new THREE.LineBasicMaterial({ 
                    color: darkerColor,
                    linewidth: 2,
                    opacity: 1,
                    transparent: false
                });
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

// boardGroupの初期化は後で行う（tetrominoColorsの定義後）
let boardGroup;

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
    0x00F0FF,  // I - シアン（明るい水色）
    0xFFEB3B,  // O - イエロー（鮮やかな黄色）
    0x76FF03,  // S - ライムグリーン（明るい緑）
    0xF44336,  // Z - レッド（鮮明な赤）
    0x2196F3,  // J - ブルー（鮮やかな青）
    0xFF9800,  // L - オレンジ（ビビッドオレンジ）
    0x9C27B0,  // T - パープル（鮮やかな紫）
];

// ここでboardGroupを初期化
boardGroup = drawBoard();
stageGroup.add(boardGroup);

function createTetromino() {
    const shapeIndex = Math.floor(Math.random() * tetrominoShapes.length);
    const shape = JSON.parse(JSON.stringify(tetrominoShapes[shapeIndex])); // Deep copy the shape
    const color = tetrominoColors[shapeIndex];
    const name = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'][shapeIndex]; // テトロミノ名を追加
    const rotationState = 0; // 回転状態を追加（0, 1, 2, 3）

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
            transparent: true,
            opacity: 0  // 初期状態は透明
        });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        
        // より濃い色の線（エッジ）を追加
        const edgeGeometry = new THREE.EdgesGeometry(cubeGeometry);
        const darkerColor = new THREE.Color(color).multiplyScalar(0.5); // 50%の明度
        const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: darkerColor, 
            linewidth: 2,
            transparent: true,
            opacity: 0  // エッジも初期状態は透明
        });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        cube.add(edges);
        
        cube.position.set(
            shape[i].x * blockSize,
            shape[i].y * blockSize,
            0
        );
        group.add(cube);
    }

    // フェードインアニメーション
    fadeInTetromino(group);
    
    return { group, shape, color, name, rotationState };
}

// テトリミノの変数（ゲーム開始時まで生成しない）
let currentTetromino = null;
let nextTetromino = null;
let ghostTetromino = null;  // ゴーストピース用
let showGhostPiece = false;  // ゴーストピース表示フラグ（デフォルトOFF）

let posX = 4 * blockSize;  // 初期位置を中央に設定
let posY = (numRows - 1) * blockSize;
let dropSpeed = 500; // ミリ秒ごとの落下速度
let lastDropTime = Date.now();

// Next piece表示を更新
function updateNextPieceDisplay() {
    if (nextRotationGroup) {
        nextScene.remove(nextRotationGroup);
        disposeObject3D(nextRotationGroup);
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
        
        // より濃い色の線（エッジ）を追加
        const edgeGeometry = new THREE.EdgesGeometry(cubeGeometry);
        const darkerColor = new THREE.Color(nextTetromino.color).multiplyScalar(0.5); // 50%の明度
        const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: darkerColor,
            linewidth: 2
        });
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
    
    // 背景画像の傾き機能を無効化
    // if (bgImageMesh) {
    //     // 現在の回転を目標値に近づける（スムーズな動き）
    //     bgImageCurrentRotation += (bgImageTargetRotation - bgImageCurrentRotation) * 0.15;
    //     bgImageMesh.rotation.y = bgImageCurrentRotation;  // Y軸で回転
    //     
    //     // キーが押されていない場合は中心に戻す
    //     if (Math.abs(bgImageTargetRotation) > 0.001) {
    //         bgImageTargetRotation *= 0.9;  // 徐々に中心に戻る
    //     }
    // }
    
    // ステージアニメーション処理
    if (stageAnimation) {
        const elapsed = currentTime - stageAnimation.startTime;
        const progress = Math.min(elapsed / stageAnimation.duration, 1);
        
        // イージング関数（ease-in-out: 最初と最後ゆっくり、真ん中速い）
        const easeProgress = progress < 0.5 
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
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
        
        // 前のエフェクトを削除して破棄
        if (clearEffectGroup) {
            stageGroup.remove(clearEffectGroup);
            disposeObject3D(clearEffectGroup);
        }
        
        // 新しいエフェクトを描画
        clearEffectGroup = drawClearingEffect(progress);
        stageGroup.add(clearEffectGroup);
        
        // アニメーション終了
        if (progress >= 1) {
            stageGroup.remove(clearEffectGroup);
            disposeObject3D(clearEffectGroup);
            clearEffectGroup = null;
            finishLineClear();
        }
    } else if (!isGameOver && currentTetromino) {
        // 通常の落下処理（ゲームオーバー中は停止）
        if (currentTime - lastDropTime > dropSpeed) {
            posY -= blockSize; // 下に移動

            if (checkCollision()) {
                posY += blockSize; // 衝突した場合は元の位置に戻す
                addToBoard();
                // ライン消去がない場合のみ新しいテトロミノを生成
                if (!clearAnimationStart) {
                    resetTetromino();
                }
            } else {
                updateGhostPiece(); // 落下時にゴーストピース更新
            }

            lastDropTime = currentTime;
        }

        // Tetrominoの位置を更新（currentTetrominoが存在する場合のみ）
        if (currentTetromino.group) {
            currentTetromino.group.position.set(posX, posY, 0);
        }
    }

    // カメラシェイク処理
    if (cameraShakeStart) {
        const elapsed = currentTime - cameraShakeStart;
        const progress = Math.min(elapsed / cameraShakeDuration, 1);
        
        if (progress < 1) {
            // シェイクの強度を時間とともに減衰
            const currentIntensity = cameraShakeIntensity * (1 - progress);
            
            // ランダムな振動を生成
            const shakeX = (Math.random() - 0.5) * currentIntensity;
            const shakeY = (Math.random() - 0.5) * currentIntensity;
            
            // カメラ位置を振動させる
            camera.position.x = originalCameraPosition.x + shakeX;
            camera.position.y = originalCameraPosition.y + shakeY;
        } else {
            // シェイク終了後、元の位置に戻す
            camera.position.x = originalCameraPosition.x;
            camera.position.y = originalCameraPosition.y;
            cameraShakeStart = null;
        }
    }
    
    // 危険レベル警告の点滅処理
    if (isDangerLevel && warningFlashStart) {
        const elapsed = currentTime - warningFlashStart;
        // 0.5秒周期で点滅
        const flashCycle = Math.sin(elapsed * 0.006) * 0.5 + 0.5; // 0～1の値
        
        // 不透明度を70%～100%で変化させる
        bgMaterial.transparent = true;
        bgMaterial.opacity = 0.7 + (flashCycle * 0.3); // 0.7～1.0で変化
        bgMaterial.needsUpdate = true;
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

    // ライン消去をチェック（消去があるか確認）
    const hasLinesToClear = checkForFullLines();
    
    // ラインが消えない時のみ着地音を再生
    if (!hasLinesToClear) {
        const sound = putSound.cloneNode();
        sound.volume = 0.30;  // クローンにも音量を設定
        sound.play().catch(e => {
            console.log('着地音の再生エラー:', e);
        });
    }
    
    // ライン消去処理
    clearLines();
    
    stageGroup.remove(boardGroup);
    disposeObject3D(boardGroup);
    boardGroup = drawBoard();
    stageGroup.add(boardGroup);
    
    // 危険レベルチェック
    checkDangerLevel();
}

// ピンチBGMを再生
function startDangerMusicWithCrossfade() {
    // 既存のフェードアウトをクリア
    if (dangerMusicFadeInterval) {
        clearInterval(dangerMusicFadeInterval);
        dangerMusicFadeInterval = null;
    }
    dangerMusic.volume = 0.10; // 音量を確実にリセット
    dangerMusic.currentTime = 0;
    dangerMusic.play().catch(e => {
        console.log('ピンチBGM再生エラー:', e);
    });
}

// ピンチBGMを停止（フェードアウト付き）
function stopDangerMusic() {
    // 既存のフェードアウトをクリア
    if (dangerMusicFadeInterval) {
        clearInterval(dangerMusicFadeInterval);
    }
    
    // フェードアウト処理
    const fadeOutDuration = 500; // 0.5秒でフェードアウト
    const fadeOutSteps = 20;
    const fadeOutInterval = fadeOutDuration / fadeOutSteps;
    const startVolume = dangerMusic.volume;
    const volumeStep = startVolume / fadeOutSteps;
    
    let currentStep = 0;
    dangerMusicFadeInterval = setInterval(() => {
        currentStep++;
        dangerMusic.volume = Math.max(0, startVolume - (volumeStep * currentStep));
        
        if (currentStep >= fadeOutSteps) {
            clearInterval(dangerMusicFadeInterval);
            dangerMusicFadeInterval = null;
            dangerMusic.pause();
            dangerMusic.currentTime = 0;
            dangerMusic.volume = 0.10; // 次回再生用に音量を戻す
        }
    }, fadeOutInterval);
}

// 危険レベルをチェックする関数
function checkDangerLevel() {
    // 各列の最高点を確認
    let maxHeight = 0;
    for (let col = 0; col < numCols; col++) {
        for (let row = 0; row < numRows; row++) {
            if (board[row][col] !== 0) {
                // rowは下から数えているので、高さは(numRows - row)
                const height = numRows - row;
                if (height > maxHeight) {
                    maxHeight = height;
                }
                break; // この列の最高点が見つかったので次の列へ
            }
        }
    }
    
    // 2/3以上（約13.3以上）積み上がったら危険レベル
    const dangerThreshold = Math.floor(numRows * 2 / 3); // 13
    const wasInDanger = isDangerLevel;
    isDangerLevel = maxHeight >= dangerThreshold;
    
    // 新たに危険レベルに入った時に点滅開始とBGM切り替え
    if (isDangerLevel && !wasInDanger) {
        warningFlashStart = Date.now();
        // 通常BGMを停止してピンチBGMを再生
        bgMusic.pause();
        startDangerMusicWithCrossfade();
    } else if (!isDangerLevel && wasInDanger) {
        // 危険レベルから脱出したら点滅停止とBGM停止
        warningFlashStart = null;
        // 背景を元の状態に戻す
        bgMaterial.transparent = false;
        bgMaterial.opacity = 1.0;
        bgMaterial.needsUpdate = true;
        // ピンチBGMを停止
        stopDangerMusic();
    }
}

// ゴーストピースを作成/更新
function updateGhostPiece() {
    if (!currentTetromino || !isGameStarted) return;
    
    // 既存のゴーストピースを削除
    if (ghostTetromino) {
        stageGroup.remove(ghostTetromino);
        disposeObject3D(ghostTetromino);
        ghostTetromino = null;
    }
    
    // ゴーストピースが無効の場合は何もしない
    if (!showGhostPiece) return;
    
    // 落下地点を計算（ハードドロップと同じロジック）
    const originalY = posY;
    const originalX = posX;
    
    // 下に落とせるところまで落とす
    while (!checkCollision()) {
        posY -= blockSize;
    }
    posY += blockSize; // 衝突位置から1つ戻す
    
    const ghostY = posY;
    
    // 元の位置に戻す
    posY = originalY;
    posX = originalX;
    
    // 現在位置と同じ場合はゴーストを表示しない
    if (Math.abs(originalY - ghostY) < blockSize) {
        return;
    }
    
    // ゴーストピースを作成
    ghostTetromino = new THREE.Group();
    
    for (let i = 0; i < currentTetromino.shape.length; i++) {
        // ワイヤーフレームボックスを作成（実寸）
        const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
        
        // マテリアルを二重にして見やすく
        // 1. 半透明の面
        const faceMaterial = new THREE.MeshBasicMaterial({ 
            color: currentTetromino.color,  // テトロミノと同じ色
            transparent: true,
            opacity: 0.15,  // もっと見えるように
            side: THREE.DoubleSide
        });
        const faceMesh = new THREE.Mesh(geometry, faceMaterial);
        
        // 2. エッジライン
        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: currentTetromino.color,  // テトロミノと同じ色のエッジ
            transparent: true,
            opacity: 0.3,  // エッジも少し濃く
            linewidth: 1
        });
        const wireframe = new THREE.LineSegments(edges, edgeMaterial);
        
        // 両方の位置を設定（z座標のnullチェック）
        const blockX = currentTetromino.shape[i].x * blockSize;
        const blockY = currentTetromino.shape[i].y * blockSize;
        const blockZ = (currentTetromino.shape[i].z || 0) * blockSize;  // z座標がない場合は0
        
        faceMesh.position.set(blockX, blockY, blockZ);
        wireframe.position.set(blockX, blockY, blockZ);
        
        ghostTetromino.add(faceMesh);
        ghostTetromino.add(wireframe);
    }
    
    // ゴーストピースの位置を設定
    ghostTetromino.position.set(posX, ghostY, 0);
    
    // ステージグループに追加
    stageGroup.add(ghostTetromino);
}

function resetTetromino() {
    stageGroup.remove(currentTetromino.group); // 前のテトリミノを削除
    disposeObject3D(currentTetromino.group);
    
    // ゴーストピースも削除
    if (ghostTetromino) {
        stageGroup.remove(ghostTetromino);
        disposeObject3D(ghostTetromino);
        ghostTetromino = null;
    }
    
    // ネクストピースを現在のピースにする
    currentTetromino = nextTetromino;
    nextTetromino = createTetromino();
    updateNextPieceDisplay();
    
    posX = 4 * blockSize;
    posY = (numRows - 1) * blockSize;
    stageGroup.add(currentTetromino.group);
    
    // 新しいゴーストピースを作成
    updateGhostPiece();
    
    // 新しいテトリミノもフェードイン（ネクストから来たものなので再度フェードイン）
    fadeInTetromino(currentTetromino.group);
    
    // ゲームオーバーチェック
    if (checkCollision()) {
        showGameOver();
    }
}

// キーボード操作の追加
document.addEventListener('keydown', (event) => {
    // ゲームが開始されていない、ライン消去アニメーション中、ゲームオーバー中、またはコンティニュー中は操作を無効化
    if (!isGameStarted || clearAnimationStart || isGameOver || isContinuing) return;
    
    if (event.key === 'ArrowLeft') {
        // 左移動
        posX -= blockSize;
        if (checkCollision()) {
            posX += blockSize; // 衝突したら戻す
        } else {
            updateGhostPiece(); // ゴーストピース更新
        }
        // 背景を左に回転（無効化）
        // bgImageTargetRotation = 0.1;  // 左移動時は右に少し回転（視差効果）
    } else if (event.key === 'ArrowRight') {
        // 右移動
        posX += blockSize;
        if (checkCollision()) {
            posX -= blockSize; // 衝突したら戻す
        } else {
            updateGhostPiece(); // ゴーストピース更新
        }
        // 背景を右に回転（無効化）
        // bgImageTargetRotation = -0.1;  // 右移動時は左に少し回転（視差効果）
    } else if (event.key === 'ArrowDown') {
        // 高速落下
        posY -= blockSize;
        if (checkCollision()) {
            posY += blockSize;
            addToBoard();
            // ライン消去がない場合のみ新しいテトロミノを生成
            if (!clearAnimationStart) {
                resetTetromino();
            }
        } else {
            updateGhostPiece(); // ゴーストピース更新
        }
    } else if (event.key === ' ') {
        // 瞬間落下（ハードドロップ）
        while (!checkCollision()) {
            posY -= blockSize;
        }
        posY += blockSize; // 衝突位置から1つ戻す
        addToBoard();
        // ライン消去がない場合のみ新しいテトロミノを生成
        if (!clearAnimationStart) {
            resetTetromino();
        }
    } else if (event.key === 'ArrowUp' || event.key === 'z' || event.key === 'Z') {
        // 回転
        rotateTetromino();
        updateGhostPiece(); // 回転後にゴーストピース更新
    }
    
    // Tetrominoの位置を即座に更新
    currentTetromino.group.position.set(posX, posY, 0);
});

// キーを離した時の処理（背景の動き無効化）
// document.addEventListener('keyup', (event) => {
//     if (!isGameStarted || isGameOver) return;
//     
//     // 左右キーを離したら背景を中心に戻す
//     if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
//         bgImageTargetRotation = 0;  // 中心に戻す
//     }
// });

// テトリミノの回転機能
function rotateTetromino() {
    // Oテトロミノ（正方形）は回転しない
    if (currentTetromino.name === 'O') {
        return;
    }
    
    // 元の形状と位置を保存
    const originalShape = JSON.parse(JSON.stringify(currentTetromino.shape));
    const originalPosX = posX;
    
    if (currentTetromino.name === 'I') {
        // Iテトロミノの特別な回転処理
        let minX = Math.min(...currentTetromino.shape.map(block => block.x));
        let maxX = Math.max(...currentTetromino.shape.map(block => block.x));
        let minY = Math.min(...currentTetromino.shape.map(block => block.y));
        let maxY = Math.max(...currentTetromino.shape.map(block => block.y));
        
        // 横向きか縦向きかを判定
        if (maxX - minX > maxY - minY) {
            // 横向き→縦向きへの回転
            // 固定された位置に配置（右に1つずらす）
            const baseX = minX + 2;
            const baseY = minY;
            currentTetromino.shape[0] = { x: baseX, y: baseY - 1, z: 0 };
            currentTetromino.shape[1] = { x: baseX, y: baseY, z: 0 };
            currentTetromino.shape[2] = { x: baseX, y: baseY + 1, z: 0 };
            currentTetromino.shape[3] = { x: baseX, y: baseY + 2, z: 0 };
        } else {
            // 縦向き→横向きへの回転
            // 固定された位置に配置（左に1つずらす）
            const baseX = minX - 1;
            const baseY = minY + 1;
            currentTetromino.shape[0] = { x: baseX - 1, y: baseY, z: 0 };
            currentTetromino.shape[1] = { x: baseX, y: baseY, z: 0 };
            currentTetromino.shape[2] = { x: baseX + 1, y: baseY, z: 0 };
            currentTetromino.shape[3] = { x: baseX + 2, y: baseY, z: 0 };
        }
    } else {
        // その他のテトロミノは左上位置を維持する方式
        // 回転前の最小座標を記録
        const oldMinX = Math.min(...currentTetromino.shape.map(block => block.x));
        const oldMinY = Math.min(...currentTetromino.shape.map(block => block.y));
        
        // 一旦原点(0,0)を基準に移動
        for (let i = 0; i < currentTetromino.shape.length; i++) {
            currentTetromino.shape[i].x -= oldMinX;
            currentTetromino.shape[i].y -= oldMinY;
        }
        
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
            // 回転後の座標を計算
            let newX = -relY;
            let newY = relX;
            // 中心点を基準に戻す
            currentTetromino.shape[i].x = Math.round(newX + centerX);
            currentTetromino.shape[i].y = Math.round(newY + centerY);
        }
        
        // 回転後の最小座標を計算
        const newMinX = Math.min(...currentTetromino.shape.map(block => block.x));
        const newMinY = Math.min(...currentTetromino.shape.map(block => block.y));
        
        // 元の位置に戻す（左上の位置を維持）
        for (let i = 0; i < currentTetromino.shape.length; i++) {
            currentTetromino.shape[i].x = currentTetromino.shape[i].x - newMinX + oldMinX;
            currentTetromino.shape[i].y = currentTetromino.shape[i].y - newMinY + oldMinY;
        }
    }
    
    // 回転状態を更新
    if (currentTetromino.rotationState !== undefined) {
        currentTetromino.rotationState = (currentTetromino.rotationState + 1) % 4;
    }
    
    // 壁キック処理（回転後に壁から押し出す）
    let kickOffset = 0;
    
    // 左壁チェック
    const minBlockX = Math.min(...currentTetromino.shape.map(block => block.x));
    if (posX + minBlockX * blockSize < 0) {
        kickOffset = -(posX + minBlockX * blockSize) / blockSize;
    }
    
    // 右壁チェック
    const maxBlockX = Math.max(...currentTetromino.shape.map(block => block.x));
    if (posX + maxBlockX * blockSize >= numCols * blockSize) {
        kickOffset = -((posX + maxBlockX * blockSize - (numCols - 1) * blockSize) / blockSize);
    }
    
    // キックオフセットを適用
    if (kickOffset !== 0) {
        posX += kickOffset * blockSize;
    }
    
    // 衝突チェック
    if (checkCollision()) {
        // 衝突したら元に戻す
        currentTetromino.shape = originalShape;
        posX = originalPosX;
    } else {
        // 回転が成功したら3Dオブジェクトを更新
        stageGroup.remove(currentTetromino.group);
        disposeObject3D(currentTetromino.group);
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
            
            // より濃い色の線（エッジ）を追加
            const edgeGeometry = new THREE.EdgesGeometry(cubeGeometry);
            const darkerColor = new THREE.Color(color).multiplyScalar(0.5); // 50%の明度
            const edgeMaterial = new THREE.LineBasicMaterial({ 
                color: darkerColor,
                linewidth: 2
            });
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
            particlesPerBlock = 10;    // 3段: 派手
            particleSpeedMultiplier = 1.3;
            particleSizeMultiplier = 1.2;
            break;
        case 4:
            particlesPerBlock = 12;    // 4段(テトリス): 豪華だが軽量化
            particleSpeedMultiplier = 1.6;
            particleSizeMultiplier = 1.5;
            break;
        default:
            particlesPerBlock = 10;
            particleSpeedMultiplier = 1.0;
            particleSizeMultiplier = 1.0;
    }
    
    // テトリス（4段）の時は特別な演出
    if (lineCount === 4) {
        // 画面全体に金色のフラッシュ
        if (progress < 0.3) {
            const flashGeometry = new THREE.PlaneGeometry(
                numCols * blockSize * 3,
                numRows * blockSize * 3
            );
            const flashMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFD700,
                transparent: true,
                opacity: (1 - progress * 3.33) * 0.5,
                side: THREE.DoubleSide
            });
            const screenFlash = new THREE.Mesh(flashGeometry, flashMaterial);
            screenFlash.position.set(
                (numCols / 2 - 0.5) * blockSize,
                (numRows / 2 - 0.5) * blockSize,
                blockSize * 2
            );
            effectGroup.add(screenFlash);
        }
        
        // 金色の波紋エフェクト（軽量化）
        for (let ring = 0; ring < 3; ring++) {
            const ringProgress = Math.max(0, progress - ring * 0.1);
            if (ringProgress < 0.5) {
                const ringRadius = ringProgress * 60;
                const ringGeometry = new THREE.RingGeometry(
                    ringRadius,
                    ringRadius + 5,
                    16
                );
                const ringMaterial = new THREE.MeshBasicMaterial({
                    color: ring % 2 === 0 ? 0xFFD700 : 0xFFFFFF,
                    transparent: true,
                    opacity: (1 - ringProgress * 1.67) * 0.6,
                    side: THREE.DoubleSide
                });
                const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
                ringMesh.position.set(
                    (numCols / 2 - 0.5) * blockSize,
                    (numRows / 2 - 0.5) * blockSize,
                    -5 - ring * 3
                );
                effectGroup.add(ringMesh);
            }
        }
        
        // 星型エフェクト（軽量化）
        if (progress < 0.3) {
            for (let star = 0; star < 6; star++) {
                const starAngle = (star / 6) * Math.PI * 2;
                const starDistance = progress * 150;
                const starSize = (1 - progress * 2.5) * blockSize;
                
                if (starSize > 0) {
                    const starGeometry = new THREE.ConeGeometry(
                        starSize * 0.4,
                        starSize * 2,
                        4
                    );
                    const starMaterial = new THREE.MeshBasicMaterial({
                        color: 0xFFFFFF,
                        transparent: true,
                        opacity: (1 - progress * 2.5) * 0.8
                    });
                    const starMesh = new THREE.Mesh(starGeometry, starMaterial);
                    starMesh.position.set(
                        (numCols / 2 - 0.5) * blockSize + Math.cos(starAngle) * starDistance,
                        (numRows / 2 - 0.5) * blockSize + Math.sin(starAngle) * starDistance,
                        15
                    );
                    starMesh.rotation.z = starAngle + Math.PI / 2;
                    effectGroup.add(starMesh);
                }
            }
        }
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
                    // 4段の場合も一部スキップして軽量化
                    if (lineCount === 4 && p % 3 === 0) {
                        continue;
                    }
                    // 3段の場合もスキップ
                    if (lineCount === 3 && p % 2 === 0 && Math.random() > 0.5) {
                        continue;
                    }
                    
                    // パーティクルサイズを段数に応じて調整
                    const size = (Math.random() * 0.15 + 0.05) * particleSizeMultiplier;
                    const particleGeometry = new THREE.SphereGeometry(
                        blockSize * size * (1 - progress * 0.3)
                    );
                    
                    // テトリス時は金色系、それ以外は虹色
                    let particleColor;
                    if (lineCount === 4) {
                        // 金色～白のグラデーション
                        const goldHue = 0.1 + Math.random() * 0.05;
                        const saturation = 0.7 + Math.random() * 0.3;
                        const lightness = 0.5 + Math.random() * 0.4;
                        particleColor = new THREE.Color().setHSL(goldHue, saturation, lightness);
                    } else {
                        const hue = (progress + p / particleCount) % 1;
                        particleColor = new THREE.Color().setHSL(hue, 1, 0.6);
                    }
                    
                    const particleMaterial = new THREE.MeshBasicMaterial({
                        color: particleColor,
                        transparent: true,
                        opacity: (1 - progress) * 0.9
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
                    
                    // テトリス時も軌跡は控えめに（パフォーマンス重視）
                    const trailCount = lineCount === 4 ? 2 : Math.min(lineCount, 2);
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
                            let trailColor;
                            if (lineCount === 4) {
                                // 金色から白へのグラデーション
                                const goldIntensity = 1 - (t / trailCount);
                                trailColor = new THREE.Color(0xFFD700).lerp(new THREE.Color(0xFFFFFF), 1 - goldIntensity);
                            } else {
                                const trailHue = (trailProgress + p / particleCount) % 1;
                                trailColor = new THREE.Color().setHSL(trailHue, 1, 0.6);
                            }
                            
                            const trailMaterial = new THREE.LineBasicMaterial({
                                color: trailColor,
                                transparent: true,
                                opacity: (1 - trailProgress) * 0.6,
                                linewidth: lineCount === 4 ? 5 : 3
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
                
                // 爆発の中心に明るい閃光（4段消去時は大きめ）
                if (progress < 0.25) {
                    const flashSize = lineCount === 4 ? 1.8 : 1;
                    const flashGeometry = new THREE.SphereGeometry(
                        blockSize * flashSize * (1 - progress * 3)
                    );
                    const flashMaterial = new THREE.MeshBasicMaterial({
                        color: lineCount === 4 ? 0xFFD700 : 0xFFFFFF,
                        transparent: true,
                        opacity: (1 - progress * 3) * (lineCount === 4 ? 1 : 0.8)
                    });
                    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
                    flash.position.set(
                        col * blockSize,
                        (numRows - 1 - rowIndex) * blockSize,
                        0
                    );
                    effectGroup.add(flash);
                    
                    // テトリス時の追加エフェクトは削除（パフォーマンス向上）
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
                    opacity: fadeOut * blinkIntensity
                });
                const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
                
                if (progress < 0.5) { // エッジも早めに消す
                    const edgeGeometry = new THREE.EdgesGeometry(cubeGeometry);
                    const darkerColor = new THREE.Color(originalColor).multiplyScalar(0.5); // 50%の明度
                    const edgeMaterial = new THREE.LineBasicMaterial({ 
                        color: darkerColor, 
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

// フルラインがあるかチェックする関数
function checkForFullLines() {
    for (let row = numRows - 1; row >= 0; row--) {
        let isFullLine = true;
        for (let col = 0; col < numCols; col++) {
            if (board[row][col] === 0) {
                isFullLine = false;
                break;
            }
        }
        
        if (isFullLine) {
            return true;  // フルラインが見つかった
        }
    }
    return false;  // フルラインなし
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
        
        // カメラシェイクを開始（ライン数に応じて強度を変える）
        cameraShakeStart = Date.now();
        cameraShakeDuration = 300; // 0.3秒
        cameraShakeIntensity = linesToClear.length * 0.1; // ライン数×0.1の強度
        
        // ライン消去音を再生
        const sound = sparkSound.cloneNode();
        sound.volume = 0.60;  // クローンにも音量を設定
        sound.play().catch(e => {
            console.log('ライン消去音の再生エラー:', e);
        });
        
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
    // 新しいボードを作成
    const newBoard = [];
    
    // 空の行を上に追加（削除される行の数だけ）
    for (let i = 0; i < clearingLines.length; i++) {
        newBoard.push(new Array(numCols).fill(0));
    }
    
    // 削除されない行だけを新しいボードに追加
    for (let row = 0; row < numRows; row++) {
        if (!clearingLines.includes(row)) {
            newBoard.push(board[row]);
        }
    }
    
    // ボードを更新
    board = newBoard;
    
    // ボードを再描画
    stageGroup.remove(boardGroup);
    disposeObject3D(boardGroup);
    boardGroup = drawBoard();
    stageGroup.add(boardGroup);
    
    // エフェクト状態をリセット
    clearingLines = [];
    clearAnimationStart = null;
    particleVelocities.clear(); // パーティクル速度もクリア
    
    // 新しいテトロミノを生成
    resetTetromino();
}

// ゲームオーバー画面を表示
function showGameOver() {
    isGameOver = true;
    
    // 現在のテトロミノを非表示にする
    if (currentTetromino && currentTetromino.group) {
        currentTetromino.group.visible = false;
    }
    
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-lines').textContent = lines;
    document.getElementById('final-level').textContent = level;
    document.getElementById('game-over').style.display = 'block';
    
    // コンティニューボタンを有効化
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
        continueBtn.disabled = false;
    }
    
    // ゲーム画面にぼかしを追加
    renderer.domElement.classList.add('game-over-blur');
    
    // 背景の点滅を停止して100%にする
    isDangerLevel = false;
    warningFlashStart = null;
    bgMaterial.transparent = false;
    bgMaterial.opacity = 1.0;
    bgMaterial.needsUpdate = true;
    
    // BGMを停止
    bgMusic.pause();
    bgMusic.currentTime = 0;
    stopDangerMusic();
    
    // エンディングBGMを再生
    endMusic.play().catch(e => {
        console.log('エンディングBGM再生エラー:', e);
    });
}

// テトリミノをフェードイン
function fadeInTetromino(group) {
    const fadeStartTime = Date.now();
    const fadeDuration = 300; // 0.3秒でフェードイン
    
    const fadeAnimation = () => {
        const elapsed = Date.now() - fadeStartTime;
        const progress = Math.min(elapsed / fadeDuration, 1);
        
        // グループ内の全ブロックの透明度を変更
        group.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.opacity = progress;
                
                // エッジ（線）も一緒にフェードイン
                child.children.forEach(edge => {
                    if (edge.isLineSegments && edge.material) {
                        edge.material.opacity = progress;
                    }
                });
            }
        });
        
        if (progress < 1) {
            requestAnimationFrame(fadeAnimation);
        }
    };
    
    fadeAnimation();
}

// ボード上のブロックをランダムにフェードアウト
function fadeOutBoardBlocks() {
    if (!boardGroup) return;
    
    fadeAnimationActive = true;
    
    // ボード上の全ブロックを収集
    const blocks = [];
    boardGroup.traverse((child) => {
        if (child.isMesh && child.material) {
            blocks.push(child);
        }
    });
    
    // ブロックをシャッフル
    const shuffledBlocks = blocks.sort(() => Math.random() - 0.5);
    
    // 各ブロックを順番にカメラに向かって飛ばす
    shuffledBlocks.forEach((block, index) => {
        setTimeout(() => {
            // フェードアニメーションが停止されている場合はスキップ
            if (!fadeAnimationActive) return;
            
            // ブロックの初期位置を保存
            const initialPosition = {
                x: block.position.x,
                y: block.position.y,
                z: block.position.z
            };
            
            // カメラに向かう速度を設定
            const velocity = {
                x: (Math.random() - 0.5) * 5,  // 少し横方向のランダム性
                y: (Math.random() - 0.3) * 8,  // 少し上方向
                z: 25 + Math.random() * 10      // 強くカメラ方向（手前）に
            };
            
            // 回転速度
            const rotationSpeed = {
                x: Math.random() * 0.2 - 0.1,
                y: Math.random() * 0.2 - 0.1,
                z: Math.random() * 0.2 - 0.1
            };
            
            // フライアウトアニメーション
            const flyStartTime = Date.now();
            const flyDuration = 800; // 0.8秒
            
            const flyAnimation = () => {
                // フェードアニメーションが停止されている場合は中断
                if (!fadeAnimationActive) return;
                
                const elapsed = Date.now() - flyStartTime;
                const progress = Math.min(elapsed / flyDuration, 1);
                
                // イージング関数（加速）
                const easeProgress = progress * progress;
                
                // 位置を更新（カメラに向かって飛ばす）
                block.position.x = initialPosition.x + velocity.x * easeProgress;
                block.position.y = initialPosition.y + velocity.y * easeProgress;
                block.position.z = initialPosition.z + velocity.z * easeProgress;
                
                // 回転
                block.rotation.x += rotationSpeed.x;
                block.rotation.y += rotationSpeed.y;
                block.rotation.z += rotationSpeed.z;
                
                // 透明度を変更
                if (block.material) {
                    block.material.transparent = true;
                    block.material.opacity = 1 - progress;
                    
                    // エッジ（線）も一緒にフェードアウト
                    block.children.forEach(child => {
                        if (child.isLineSegments && child.material) {
                            child.material.transparent = true;
                            child.material.opacity = 1 - progress;
                        }
                    });
                }
                
                // スケールも少し小さくする
                const scale = 1 - progress * 0.3;
                block.scale.set(scale, scale, scale);
                
                if (progress < 1) {
                    requestAnimationFrame(flyAnimation);
                }
            };
            
            flyAnimation();
        }, index * Math.min(50, 1500 / blocks.length)); // ブロック数に応じて間隔を調整（最大1.5秒で全部消える）
    });
}

// ゲームをリセット
function resetGame() {
    // ボードをリセット（デバッグモードの場合は特定の盤面になる）
    board = createBoard(numRows, numCols);
    stageGroup.remove(boardGroup);
    disposeObject3D(boardGroup);
    boardGroup = drawBoard();
    stageGroup.add(boardGroup);
    
    // エンディングBGMのみ停止（コンティニューBGMは流し続ける）
    bgMusic.pause();
    bgMusic.currentTime = 0;
    stopDangerMusic();
    endMusic.pause();
    endMusic.currentTime = 0;
    // continueMusic.pause();  // コンティニューBGMは停止しない
    // continueMusic.currentTime = 0;
    
    // スコアをリセット
    score = 0;
    lines = 0;
    level = 1;
    dropSpeed = 500;
    updateDisplay();
    
    // ゲームオーバー画面は既にフェードアウトで非表示になっているのでスキップ
    isGameOver = false;
    
    // 危険レベルをリセット
    isDangerLevel = false;
    warningFlashStart = null;
    bgMaterial.transparent = false;
    bgMaterial.opacity = 1.0;
    bgMaterial.needsUpdate = true;
    
    // 新しいテトリミノを生成
    if (currentTetromino && currentTetromino.group) {
        stageGroup.remove(currentTetromino.group);
        disposeObject3D(currentTetromino.group);
    }
    // ゴーストピースも削除
    if (ghostTetromino) {
        stageGroup.remove(ghostTetromino);
        disposeObject3D(ghostTetromino);
        ghostTetromino = null;
    }
    currentTetromino = createTetromino();
    nextTetromino = createTetromino();
    stageGroup.add(currentTetromino.group);
    updateNextPieceDisplay();
    posX = 4 * blockSize;
    posY = (numRows - 1) * blockSize;
    // ゴーストピースを作成
    updateGhostPiece();
}

// ゲーム開始機能
function startGame() {
    // スタート画面はすでに非表示になっているのでスキップ
    // BGMは停止しない（ステージ出現中も流し続ける）
    
    // ステージ回転アニメーションを開始
    stageAnimation = {
        startTime: Date.now(),
        duration: 3000  // 3秒でステージが前進しながら回転（ゆっくり）
    };
    
    // ゲーム状態を初期化
    isGameStarted = true;
    isGameOver = false;
    board = createBoard(numRows, numCols);  // 通常の空のボードで開始
    
    // ボードを再描画（デバッグ用の初期状態を表示）
    stageGroup.remove(boardGroup);
    disposeObject3D(boardGroup);
    boardGroup = drawBoard();
    stageGroup.add(boardGroup);
    
    // 既存のテトリミノがあれば破棄
    if (currentTetromino && currentTetromino.group) {
        stageGroup.remove(currentTetromino.group);
        disposeObject3D(currentTetromino.group);
    }
    // 最初のテトリミノを生成
    currentTetromino = createTetromino();
    nextTetromino = createTetromino();
    stageGroup.add(currentTetromino.group);
    updateNextPieceDisplay();
    
    // 最初のブロックを隠しておく
    currentTetromino.group.visible = false;
    
    // 2秒後に最初のブロックを表示してフェードイン
    setTimeout(() => {
        if (currentTetromino && currentTetromino.group) {
            currentTetromino.group.visible = true;
            fadeInTetromino(currentTetromino.group);
            // ゴーストピースも作成
            updateGhostPiece();
        }
    }, 2000);
    
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
        const gameStartDiv = document.getElementById('game-start');
        
        // フェードアウトアニメーションを設定
        gameStartDiv.style.transition = 'opacity 0.5s ease';
        gameStartDiv.style.opacity = '0';
        
        // ぼかしを解除
        renderer.domElement.classList.remove('game-not-started');
        
        // BGMを再生
        bgMusic.play().catch(e => {
            console.log('BGM再生エラー:', e);
        });
        
        // 0.5秒後に完全に非表示
        setTimeout(() => {
            gameStartDiv.style.display = 'none';
        }, 500);
        
        // 1秒待ってからゲーム開始
        setTimeout(() => {
            startGame();
        }, 1000);
    });
} else {
    console.error('Start button not found');
}

// コンティニューボタンのイベントリスナー
const continueBtn = document.getElementById('continue-btn');
if (continueBtn) {
    continueBtn.addEventListener('click', () => {
        // 既にコンティニュー中なら何もしない
        if (isContinuing) {
            return;
        }
        
        console.log('Continue button clicked');
        
        // コンティニュー開始フラグを立てる
        isContinuing = true;
        
        // ボタンを無効化
        continueBtn.disabled = true;
        
        // 古いテトロミノを削除
        if (currentTetromino && currentTetromino.group) {
            scene.remove(currentTetromino.group);
            disposeObject3D(currentTetromino.group);
            currentTetromino = null;
        }
        
        const gameOverDiv = document.getElementById('game-over');
        
        // フェードアウトアニメーションを設定
        gameOverDiv.style.transition = 'opacity 0.5s ease';
        gameOverDiv.style.opacity = '0';
        
        // ぼかしを0.5秒で解除
        renderer.domElement.style.transition = 'filter 0.5s ease';
        renderer.domElement.classList.remove('game-over-blur');
        
        // エンディングBGMを停止
        endMusic.pause();
        endMusic.currentTime = 0;
        
        // コンティニューBGMを再生
        console.log('Playing continue music...');
        console.log('Continue music volume:', continueMusic.volume);
        continueMusic.currentTime = 0;  // 最初から再生
        continueMusic.volume = 0.15;  // 音量を再設定
        continueMusic.play().then(() => {
            console.log('Continue music started successfully');
            console.log('Is playing:', !continueMusic.paused);
            console.log('Current volume:', continueMusic.volume);
        }).catch(e => {
            console.log('コンティニューBGM再生エラー:', e);
        });
        
        // ブロックをランダムにフェードアウト
        fadeOutBoardBlocks();
        
        // 2秒後に完全に非表示にしてゲームリセット（ブロックが全て消えるのを待つ）
        setTimeout(() => {
            // フェードアニメーションを停止
            fadeAnimationActive = false;
            
            // ボードをクリアしてからリセット
            board = createBoard(numRows, numCols);
            stageGroup.remove(boardGroup);
            disposeObject3D(boardGroup);
            boardGroup = drawBoard();
            stageGroup.add(boardGroup);
            
            gameOverDiv.style.display = 'none';
            gameOverDiv.style.opacity = '1';  // 次回のために戻す
            resetGame();
            
            // 最初のブロックを隠しておく
            if (currentTetromino && currentTetromino.group) {
                currentTetromino.group.visible = false;
            }
            
            // 1秒後に最初のブロックを表示してフェードイン
            setTimeout(() => {
                if (currentTetromino && currentTetromino.group) {
                    currentTetromino.group.visible = true;
                    fadeInTetromino(currentTetromino.group);
                }
                // フェードイン完了後にコンティニュー終了フラグを下ろす（0.3秒のフェードイン時間を考慮）
                setTimeout(() => {
                    isContinuing = false;
                }, 300);
            }, 1000);
        }, 2000);
    });
}

// ブロックでタイトルを作成する共通関数
function createBlockText(containerId, text1, text2 = null, useWhite = false) {
    const titleContainer = document.getElementById(containerId);
    if (!titleContainer) return;
    
    // 各文字を5x5のグリッドで表現
    const letters = {
        'D': [
            [1,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,1,1,1,0]
        ],
        'R': [
            [1,1,1,1,0],
            [1,0,0,0,1],
            [1,1,1,1,0],
            [1,0,0,1,0],
            [1,0,0,0,1]
        ],
        'O': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,1,1,1,0]
        ],
        'P': [
            [1,1,1,1,0],
            [1,0,0,0,1],
            [1,1,1,1,0],
            [1,0,0,0,0],
            [1,0,0,0,0]
        ],
        'Z': [
            [1,1,1,1,1],
            [0,0,0,1,0],
            [0,0,1,0,0],
            [0,1,0,0,0],
            [1,1,1,1,1]
        ],
        'N': [
            [1,0,0,0,1],
            [1,1,0,0,1],
            [1,0,1,0,1],
            [1,0,0,1,1],
            [1,0,0,0,1]
        ],
        'E': [
            [1,1,1,1,1],
            [1,0,0,0,0],
            [1,1,1,1,0],
            [1,0,0,0,0],
            [1,1,1,1,1]
        ],
        'G': [
            [0,1,1,1,1],
            [1,0,0,0,0],
            [1,0,1,1,1],
            [1,0,0,0,1],
            [0,1,1,1,0]
        ],
        'A': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [1,1,1,1,1],
            [1,0,0,0,1],
            [1,0,0,0,1]
        ],
        'M': [
            [1,0,0,0,1],
            [1,1,0,1,1],
            [1,0,1,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1]
        ],
        'V': [
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,1,0,1,0],
            [0,0,1,0,0]
        ],
        'S': [
            [0,1,1,1,1],
            [1,0,0,0,0],
            [0,1,1,1,0],
            [0,0,0,0,1],
            [1,1,1,1,0]
        ],
        'T': [
            [1,1,1,1,1],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0]
        ]
    };
    
    const colors = [
        '#FF6B6B', // 赤
        '#4ECDC4', // シアン
        '#FFE66D', // 黄色
        '#A8E6CF', // 緑
        '#FF8B94', // ピンク
        '#C9B1FF', // 紫
        '#FFA500'  // オレンジ
    ];
    
    // タイトル全体のコンテナ
    const titleDiv = document.createElement('div');
    titleDiv.style.display = 'flex';
    titleDiv.style.flexDirection = text2 ? 'row' : 'row';
    titleDiv.style.justifyContent = 'center';
    titleDiv.style.gap = '15px';
    titleDiv.style.marginBottom = '20px';
    
    // 最初の単語
    const word1Div = document.createElement('div');
    word1Div.style.display = 'flex';
    word1Div.style.gap = '8px';
    
    let colorIndex = 0;
    text1.split('').forEach((letter) => {
        if (letter === ' ') {
            const spaceDiv = document.createElement('div');
            spaceDiv.style.width = '20px';
            word1Div.appendChild(spaceDiv);
            return;
        }
        
        const letterDiv = document.createElement('div');
        letterDiv.style.display = 'inline-block';
        
        const grid = letters[letter];
        if (!grid) return;
        
        const color = useWhite ? '#FFFFFF' : colors[colorIndex % colors.length];
        colorIndex++;
        
        for (let row = 0; row < 5; row++) {
            const rowDiv = document.createElement('div');
            rowDiv.style.display = 'flex';
            rowDiv.style.height = '8px';
            
            for (let col = 0; col < 5; col++) {
                const block = document.createElement('div');
                block.style.width = '8px';
                block.style.height = '8px';
                block.style.display = 'inline-block';
                block.style.backgroundColor = grid[row][col] ? color : 'transparent';
                block.style.border = grid[row][col] ? '1px solid rgba(0, 0, 0, 0.3)' : 'none';
                block.style.boxSizing = 'border-box';
                rowDiv.appendChild(block);
            }
            letterDiv.appendChild(rowDiv);
        }
        word1Div.appendChild(letterDiv);
    });
    
    titleDiv.appendChild(word1Div);
    
    // 2番目の単語（あれば）
    if (text2) {
        const word2Div = document.createElement('div');
        word2Div.style.display = 'flex';
        word2Div.style.gap = '8px';
        
        text2.split('').forEach((letter) => {
            if (letter === ' ') {
                const spaceDiv = document.createElement('div');
                spaceDiv.style.width = '20px';
                word2Div.appendChild(spaceDiv);
                return;
            }
            
            const letterDiv = document.createElement('div');
            letterDiv.style.display = 'inline-block';
            
            const grid = letters[letter];
            if (!grid) return;
            
            const color = useWhite ? '#FFFFFF' : colors[colorIndex % colors.length];
            colorIndex++;
            
            for (let row = 0; row < 5; row++) {
                const rowDiv = document.createElement('div');
                rowDiv.style.display = 'flex';
                rowDiv.style.height = '8px';
                
                for (let col = 0; col < 5; col++) {
                    const block = document.createElement('div');
                    block.style.width = '8px';
                    block.style.height = '8px';
                    block.style.display = 'inline-block';
                    block.style.backgroundColor = grid[row][col] ? color : 'transparent';
                    block.style.border = grid[row][col] ? '1px solid rgba(0, 0, 0, 0.3)' : 'none';
                    block.style.boxSizing = 'border-box';
                    rowDiv.appendChild(block);
                }
                letterDiv.appendChild(rowDiv);
            }
            word2Div.appendChild(letterDiv);
        });
        
        titleDiv.appendChild(word2Div);
    }
    
    titleContainer.appendChild(titleDiv);
}

// タイトルを作成
createBlockText('block-title', 'DROP', 'ZONE');
createBlockText('gameover-block-title', 'GAME', 'OVER');

// 初期状態でキャンバスにぼかしを適用
renderer.domElement.classList.add('game-not-started');

// 初期リサイズ処理
handleResize();

// モバイルコントロールボタンのイベントリスナー
const mobileControls = {
    'rotate-btn': () => {
        if (!isGameStarted || clearAnimationStart || isGameOver || isContinuing) return;
        rotateTetromino();
        updateGhostPiece(); // 回転後にゴーストピース更新
    },
    'left-btn': () => {
        if (!isGameStarted || clearAnimationStart || isGameOver || isContinuing) return;
        posX -= blockSize;
        if (checkCollision()) {
            posX += blockSize;
        } else {
            updateGhostPiece(); // ゴーストピース更新
        }
    },
    'right-btn': () => {
        if (!isGameStarted || clearAnimationStart || isGameOver || isContinuing) return;
        posX += blockSize;
        if (checkCollision()) {
            posX -= blockSize;
        } else {
            updateGhostPiece(); // ゴーストピース更新
        }
    },
    'down-btn': () => {
        if (!isGameStarted || clearAnimationStart || isGameOver || isContinuing) return;
        posY -= blockSize;
        if (checkCollision()) {
            posY += blockSize;
            addToBoard();
            // ライン消去がない場合のみ新しいテトロミノを生成
            if (!clearAnimationStart) {
                resetTetromino();
            }
        } else {
            updateGhostPiece(); // ゴーストピース更新
        }
    },
    'drop-btn': () => {
        if (!isGameStarted || clearAnimationStart || isGameOver || isContinuing) return;
        while (!checkCollision()) {
            posY -= blockSize;
        }
        posY += blockSize;
        addToBoard();
        // ライン消去がない場合のみ新しいテトロミノを生成
        if (!clearAnimationStart) {
            resetTetromino();
        }
    }
};

// 長押し用の変数
let touchIntervals = {};
let touchTimeouts = {};
let activeTouches = {};

// すべてのタッチをクリアする関数
function clearAllTouches() {
    Object.keys(touchIntervals).forEach(btnId => {
        if (typeof touchIntervals[btnId] === 'number') {
            clearInterval(touchIntervals[btnId]);
        }
        touchIntervals[btnId] = null;
    });
    
    Object.keys(touchTimeouts).forEach(btnId => {
        if (touchTimeouts[btnId]) {
            clearTimeout(touchTimeouts[btnId]);
            touchTimeouts[btnId] = null;
        }
    });
    
    activeTouches = {};
}

// ボタンにイベントリスナーを追加
Object.keys(mobileControls).forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
        // タッチ開始時
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            
            // 既存のインターバルをクリア（安全のため）
            if (touchIntervals[btnId]) {
                if (typeof touchIntervals[btnId] === 'number') {
                    clearInterval(touchIntervals[btnId]);
                }
                touchIntervals[btnId] = null;
            }
            if (touchTimeouts[btnId]) {
                clearTimeout(touchTimeouts[btnId]);
                touchTimeouts[btnId] = null;
            }
            
            // タッチIDを記録
            if (e.touches.length > 0) {
                activeTouches[btnId] = e.touches[0].identifier;
            }
            
            // 即座に1回実行
            mobileControls[btnId]();
            
            // 左右と下ボタンのみ長押し対応
            if (btnId === 'left-btn' || btnId === 'right-btn' || btnId === 'down-btn') {
                // フラグを立てる
                touchIntervals[btnId] = true;
                
                // 200ms後から連続実行開始
                touchTimeouts[btnId] = setTimeout(() => {
                    if (touchIntervals[btnId] && activeTouches[btnId] !== undefined) {
                        // 100ms間隔で連続実行
                        touchIntervals[btnId] = setInterval(() => {
                            if (activeTouches[btnId] !== undefined) {
                                mobileControls[btnId]();
                            } else {
                                // タッチが無効になった場合は停止
                                if (typeof touchIntervals[btnId] === 'number') {
                                    clearInterval(touchIntervals[btnId]);
                                }
                                touchIntervals[btnId] = null;
                            }
                        }, 100);
                    }
                }, 200);
            }
        });
        
        // タッチ移動時（ボタンから外れた場合を検知）
        btn.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            // タッチ位置がボタンから外れたかチェック
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                const rect = btn.getBoundingClientRect();
                const isInside = touch.clientX >= rect.left && 
                                touch.clientX <= rect.right && 
                                touch.clientY >= rect.top && 
                                touch.clientY <= rect.bottom;
                
                if (!isInside && activeTouches[btnId] !== undefined) {
                    // ボタンから外れた場合は停止
                    delete activeTouches[btnId];
                    if (touchIntervals[btnId]) {
                        if (typeof touchIntervals[btnId] === 'number') {
                            clearInterval(touchIntervals[btnId]);
                        }
                        touchIntervals[btnId] = null;
                    }
                    if (touchTimeouts[btnId]) {
                        clearTimeout(touchTimeouts[btnId]);
                        touchTimeouts[btnId] = null;
                    }
                }
            }
        });
        
        // タッチ終了時
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            
            // このボタンのタッチをクリア
            delete activeTouches[btnId];
            
            // 連続実行を停止
            if (touchIntervals[btnId]) {
                if (typeof touchIntervals[btnId] === 'number') {
                    clearInterval(touchIntervals[btnId]);
                }
                touchIntervals[btnId] = null;
            }
            if (touchTimeouts[btnId]) {
                clearTimeout(touchTimeouts[btnId]);
                touchTimeouts[btnId] = null;
            }
        });
        
        // タッチキャンセル時も停止
        btn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            
            // このボタンのタッチをクリア
            delete activeTouches[btnId];
            
            if (touchIntervals[btnId]) {
                if (typeof touchIntervals[btnId] === 'number') {
                    clearInterval(touchIntervals[btnId]);
                }
                touchIntervals[btnId] = null;
            }
            if (touchTimeouts[btnId]) {
                clearTimeout(touchTimeouts[btnId]);
                touchTimeouts[btnId] = null;
            }
        });
        
        // マウスリーブ時も停止（念のため）
        btn.addEventListener('mouseleave', () => {
            delete activeTouches[btnId];
            if (touchIntervals[btnId]) {
                if (typeof touchIntervals[btnId] === 'number') {
                    clearInterval(touchIntervals[btnId]);
                }
                touchIntervals[btnId] = null;
            }
            if (touchTimeouts[btnId]) {
                clearTimeout(touchTimeouts[btnId]);
                touchTimeouts[btnId] = null;
            }
        });
        
        // クリックイベントもサポート（デバッグ用）
        btn.addEventListener('click', mobileControls[btnId]);
    }
});

// ページ全体でタッチ終了時にも全てクリア（安全のため）
document.addEventListener('touchend', () => {
    // アクティブなタッチが無い場合は全てクリア
    if (Object.keys(activeTouches).length === 0) {
        clearAllTouches();
    }
});

// ページ全体でタッチキャンセル時も全てクリア
document.addEventListener('touchcancel', () => {
    clearAllTouches();
});

// ウィンドウがフォーカスを失った時も全てクリア
window.addEventListener('blur', () => {
    clearAllTouches();
});

// ゴーストピース切り替えボタンの処理
const ghostToggleBtn = document.getElementById('ghost-toggle');
if (ghostToggleBtn) {
    // 初期状態を設定（デフォルトOFFなのでactiveクラスは付けない）
    
    // キーボードイベントを防ぐ
    ghostToggleBtn.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
        }
    });
    
    ghostToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showGhostPiece = !showGhostPiece;
        
        if (showGhostPiece) {
            ghostToggleBtn.classList.add('active');
            // ゴーストピースを再表示
            if (currentTetromino && isGameStarted) {
                updateGhostPiece();
            }
        } else {
            ghostToggleBtn.classList.remove('active');
            // ゴーストピースを削除
            if (ghostTetromino) {
                stageGroup.remove(ghostTetromino);
                disposeObject3D(ghostTetromino);
                ghostTetromino = null;
            }
        }
        
        // フォーカスを外す
        ghostToggleBtn.blur();
    });
}

animate();
