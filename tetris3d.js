const container = document.getElementById("container");
const renderer = new THREE.WebGLRenderer();
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(5, 10, 15);
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

const numRows = 20;
const numCols = 10;

const tetrominoShapes = {
    I: [[[1, 1, 1, 1]]],
    J: [[[1, 0, 0], [1, 1, 1]], [[1, 1], [1, 0], [1, 0]], [[1, 1, 1], [0, 0, 1]], [[0, 1], [0, 1], [1, 1]]],
    L: [[[0, 0, 1], [1, 1, 1]], [[1, 0], [1, 0], [1, 1]], [[1, 1, 1], [1, 0, 0]], [[1, 1], [0, 1], [0, 1]]],
    O: [[[1, 1], [1, 1]]],
    S: [[[0, 1, 1], [1, 1, 0]], [[1, 0], [1, 1], [0, 1]]],
    T: [[[0, 1, 0], [1, 1, 1]], [[1, 0], [1, 1], [1, 0]], [[1, 1, 1], [0, 1, 0]], [[0, 1], [1, 1], [0, 1]]],
    Z: [[[1, 1, 0], [0, 1, 1]], [[0, 1], [1, 1], [1, 0]]],
};

function createTetromino() {
    const shapes = Object.keys(tetrominoShapes);
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const tetromino = {
        shape: shape,
        matrix: tetrominoShapes[shape][0],
        pos: new THREE.Vector3(Math.floor(numCols / 2) - 1, numRows - 1, 0),
    };
    return tetromino;
}
const tetromino = createTetromino();

function drawTetromino(tetromino) {
    const blockSize = 1;
    const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    const tetromino3D = new THREE.Group();
    for (let row = 0; row < tetromino.matrix.length; row++) {
        for (let col = 0; col < tetromino.matrix[row].length; col++) {
            if (tetromino.matrix[row][col]) {
                const cube = new THREE.Mesh(geometry, material);
                cube.position.set(
                    (tetromino.pos.x + col) * blockSize,
                    (tetromino.pos.y - row) * blockSize,
                    0
                );
                tetromino3D.add(cube);
            }
        }
    }
    return tetromino3D;
}

const tetromino3D = drawTetromino(tetromino);
scene.add(tetromino3D);

let fallingSpeed = 0.1;
let prevTime = performance.now();
function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    if (currentTime - prevTime > 1000 / 60) {
        tetromino3D.position.y -= fallingSpeed;
        prevTime = currentTime;
    }

    renderer.render(scene, camera);
}



animate();
