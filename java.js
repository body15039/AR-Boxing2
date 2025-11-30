// utils/handProxy.js
export function createHandProxy(camera) {
  const punchCooldown = 300; // ms
  let lastPunchTime = 0;
  
  return {
    position: new THREE.Vector3(),
    
    update() {
      // In AR, hand position ≈ camera position + offset
      this.position.copy(camera.position)
        .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.5))
        .add(new THREE.Vector3(0, -0.2, 0)); // Slight downward offset
    },
    
    punch() {
      const now = Date.now();
      if (now - lastPunchTime > punchCooldown) {
        lastPunchTime = now;
        this.onPunch?.(this.position.clone());
      }
    },
    
    onPunch: null // Callback when punch happens
  };
}