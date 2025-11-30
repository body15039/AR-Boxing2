// utils/targets.js
const TARGET_TYPES = {
  REGULAR: { color: 0x00B4FF, points: 10, speed: 0.02 },
  BONUS:   { color: 0xFFD700, points: 50, speed: 0.015, scale: 1.3 },
  DANGER:  { color: 0xFF2D00, points: -20, speed: 0.025, scale: 1.1 },
  EXPLOSIVE: { color: 0xFF8C00, points: 30, speed: 0.02, scale: 1.2 }
};

export class TargetManager {
  constructor(scene, camera, handProxy) {
    this.scene = scene;
    this.camera = camera;
    this.handProxy = handProxy;
    this.targets = [];
    
    // Set punch callback
    handProxy.onPunch = (punchPos) => this.checkCollision(punchPos);
  }
  
  spawnTarget() {
    // Determine type by probability
    const r = Math.random();
    let type;
    if (r < 0.1) type = 'BONUS';
    else if (r < 0.15) type = 'DANGER';
    else if (r < 0.2) type = 'EXPLOSIVE';
    else type = 'REGULAR';
    
    const config = TARGET_TYPES[type];
    const geometry = type === 'BONUS' 
      ? new THREE.RingGeometry(0.1, 0.15, 16) 
      : new THREE.SphereGeometry(0.1 * (config.scale || 1), 16, 16);
      
    const material = new THREE.MeshStandardMaterial({ 
      color: config.color,
      emissive: config.color,
      emissiveIntensity: 0.3,
      metalness: 0.2,
      roughness: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position in front of camera
    mesh.position.copy(this.camera.position)
      .add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(2))
      .add(new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 1.5, 0));
    
    mesh.userData = { type, config, startTime: performance.now() };
    this.scene.add(mesh);
    this.targets.push(mesh);
  }
  
  update() {
    const cameraPos = this.camera.position;
    const now = performance.now();
    
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const target = this.targets[i];
      const { config } = target.userData;
      
      // Move toward camera
      target.position.lerp(cameraPos, config.speed);
      target.rotation.x += 0.02;
      target.rotation.y += 0.03;
      
      // Remove if too close (missed danger = game over)
      if (target.position.distanceTo(cameraPos) < 0.3) {
        if (target.userData.type === 'DANGER') {
          // Game over!
          const event = new CustomEvent('gameOver');
          window.dispatchEvent(event);
        }
        this.removeTarget(i);
      }
      
      // Auto-remove after 10s
      if (now - target.userData.startTime > 10000) {
        this.removeTarget(i);
      }
    }
  }
  
  checkCollision(punchPos) {
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const target = this.targets[i];
      if (target.position.distanceTo(punchPos) < 0.3) {
        const points = target.userData.config.points;
        window.dispatchEvent(new CustomEvent('score', { detail: points }));
        
        // Explosion effect for explosive targets
        if (target.userData.type === 'EXPLOSIVE') {
          this.explodeNearby(target.position, 0.8);
        }
        
        this.removeTarget(i);
        break; // One punch, one target
      }
    }
  }
  
  explodeNearby(center, radius) {
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const target = this.targets[i];
      if (target.userData.type !== 'EXPLOSIVE' && 
          target.position.distanceTo(center) < radius) {
        window.dispatchEvent(new CustomEvent('score', { detail: 10 }));
        this.removeTarget(i);
      }
    }
  }
  
  removeTarget(index) {
    this.scene.remove(this.targets[index]);
    this.targets.splice(index, 1);
  }
}