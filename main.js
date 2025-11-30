// main.js
import { createHandProxy } from './utils/handProxy.js';
import { TargetManager } from './utils/targets.js';

let renderer, scene, camera, xrSession;
let score = 0;
let gameActive = false;
let gameTime = 0;
let gameLoopId;

const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const arButton = document.getElementById('ar-button');
const gameOverScreen = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart');

// Initialize Three.js
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Lighting
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 10, 10).normalize();
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x666666));

  // Handle window resize
  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// AR Setup
arButton.addEventListener('click', async () => {
  try {
    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test', 'local'],
      optionalFeatures: ['hand-tracking'] // Future-proof
    });

    // Hide AR button
    arButton.style.display = 'none';

    // Configure renderer for XR
    renderer.xr.setReferenceSpaceType('local');
    renderer.xr.setSession(xrSession);

    // Start game
    startGame();
  } catch (e) {
    alert('AR not supported on this device.');
    console.error(e);
  }
});

// Game Logic
function startGame() {
  gameActive = true;
  score = 0;
  gameTime = 0;
  updateScore();
  
  const handProxy = createHandProxy(camera);
  const targetManager = new TargetManager(scene, camera, handProxy);
  
  // Game loop
  gameLoopId = setInterval(() => {
    if (!gameActive) return;
    gameTime += 0.1;
    timerElement.textContent = `TIME: ${gameTime.toFixed(1)}s`;
    
    // Increase difficulty over time (spawn faster)
    const spawnRate = Math.max(0.3, 2.0 - gameTime * 0.02);
    if (Math.random() < 0.1 / spawnRate) {
      targetManager.spawnTarget();
    }
    
    targetManager.update();
  }, 100);

  // Punch on touch (mobile) or mouse down (desktop debug)
  renderer.domElement.addEventListener('pointerdown', () => {
    if (gameActive) handProxy.punch();
  });

  // Render loop
  renderer.setAnimationLoop((timestamp, frame) => {
    if (frame) {
      const refSpace = renderer.xr.getReferenceSpace();
      const pose = frame.getViewerPose(refSpace);
      if (pose) camera.matrix.copy(pose.transform.matrix);
    }
    
    // Update hand proxy (uses device motion)
    handProxy.update();
    
    // Render
    renderer.render(scene, camera);
  });
}

function updateScore(points = 0) {
  score += points;
  if (score < 0) score = 0;
  scoreElement.textContent = `SCORE: ${score}`;
}

function endGame() {
  gameActive = false;
  clearInterval(gameLoopId);
  finalScoreElement.textContent = score;
  gameOverScreen.classList.remove('hidden');
}

// Restart
restartButton.addEventListener('click', () => {
  // Clear scene
  while(scene.children.length > 0) { 
    scene.remove(scene.children[0]); 
  }
  
  // Re-add lighting
  scene.add(new THREE.DirectionalLight(0xffffff, 1));
  scene.add(new THREE.AmbientLight(0x666666));
  
  gameOverScreen.classList.add('hidden');
  arButton.style.display = 'block';
});

// Init
init();