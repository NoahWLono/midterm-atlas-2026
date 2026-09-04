import * as THREE from 'three';
export type JarAPI = {
  setProbability: (p: number) => void;
  shake: () => void;
  pause: (p: boolean) => void;
  dispose: () => void;
};
export function createJar(
  canvas: HTMLCanvasElement,
  probability: number,
  onReady: () => void,
): JarAPI {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(),
    root = new THREE.Group();
  scene.add(root);
  const camera = new THREE.PerspectiveCamera(
    36,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    50,
  );
  camera.position.set(0, 3.5, 12);
  camera.lookAt(0, 2, 0);
  scene.add(new THREE.HemisphereLight('#ffffff', '#8396b1', 2.5));
  const light = new THREE.DirectionalLight('#ffffff', 4);
  light.position.set(-4, 9, 6);
  scene.add(light);
  const blue = new THREE.DirectionalLight('#c9e5ff', 2);
  blue.position.set(4, 3, -4);
  scene.add(blue);
  const geometries: THREE.BufferGeometry[] = [],
    materials: THREE.Material[] = [];
  const add = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    geometries.push(geo);
    materials.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#d7e9f7',
    transparent: true,
    opacity: 0.11,
    roughness: 0.05,
    metalness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  add(
    new THREE.CylinderGeometry(2.08, 2.05, 4.55, 64, 1, true),
    glass,
    0,
    2.3,
    0,
  );
  const rimMat = new THREE.MeshStandardMaterial({
    color: '#bacddb',
    metalness: 0.4,
    roughness: 0.15,
    transparent: true,
    opacity: 0.75,
  });
  for (const y of [0.1, 4.6]) {
    const rim = add(
      new THREE.TorusGeometry(2.075, 0.065, 10, 64),
      rimMat,
      0,
      y,
      0,
    );
    rim.rotation.x = Math.PI / 2;
  }
  add(
    new THREE.CylinderGeometry(2.08, 2.08, 0.1, 64),
    new THREE.MeshStandardMaterial({
      color: '#cfdae5',
      transparent: true,
      opacity: 0.35,
      roughness: 0.2,
    }),
    0,
    0.06,
  );
  add(
    new THREE.CylinderGeometry(2.3, 2.4, 0.18, 64),
    new THREE.MeshStandardMaterial({ color: '#e0e5ec', roughness: 0.7 }),
    0,
    -0.13,
  );
  // A thin reflected strip makes the curved glass legible without hiding balls.
  const strip = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const reflection = add(
    new THREE.CylinderGeometry(2.09, 2.06, 4.1, 8, 1, true, 0.3, 0.11),
    strip,
    0,
    2.3,
  );
  reflection.rotation.y = 0.3;
  const ballGeo = new THREE.SphereGeometry(0.285, 20, 14),
    ballMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.24,
      metalness: 0.08,
    });
  geometries.push(ballGeo);
  materials.push(ballMat);
  const mesh = new THREE.InstancedMesh(ballGeo, ballMat, 100);
  root.add(mesh);
  const dummy = new THREE.Object3D();
  const balls: Array<{
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
  }> = [];
  let seed = 426;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Deterministic staggered layers: 100 balls, all inside the glass.
  for (let i = 0; i < 100; i++) {
    const layer = Math.floor(i / 19),
      slot = i % 19;
    let x = 0,
      z = 0;
    if (slot > 0) {
      const outer = slot > 6;
      const j = outer ? slot - 7 : slot - 1;
      const count = outer ? 12 : 6;
      const radius = outer ? 1.42 : 0.72;
      const angle = (j / count) * Math.PI * 2 + (layer % 2 ? Math.PI / 12 : 0);
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
    }
    balls.push({ x, y: 0.42 + layer * 0.6, z, vx: 0, vy: 0, vz: 0 });
  }
  let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    physics = false,
    simulationAge = 0,
    rotation = 0.15,
    targetRotation = 0.15,
    drag = false,
    lastX = 0,
    last = performance.now(),
    frame = 0,
    visible = true;
  const setProbability = (p: number) => {
    const count = Math.round(Math.max(0, Math.min(1, p)) * 100);
    for (let i = 0; i < 100; i++) {
      const rank = (i * 37) % 100;
      mesh.setColorAt(i, new THREE.Color(rank < count ? '#337bbc' : '#c45460'));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  setProbability(probability);
  const sync = () => {
    for (let i = 0; i < 100; i++) {
      const b = balls[i];
      dummy.position.set(b.x, b.y, b.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  sync();
  const resize = new ResizeObserver(() => {
    if (canvas.clientWidth && canvas.clientHeight) {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }
  });
  resize.observe(canvas);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });
  observer.observe(canvas);
  const down = (e: PointerEvent) => {
    drag = true;
    lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (drag) {
      targetRotation += (e.clientX - lastX) * 0.012;
      lastX = e.clientX;
    }
  };
  const up = () => {
    drag = false;
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  const render = (time: number) => {
    frame = requestAnimationFrame(render);
    const dt = Math.min((time - last) / 1000, 0.025);
    last = time;
    if (!visible || document.hidden) return;
    rotation += (targetRotation - rotation) * (paused ? 1 : 0.12);
    root.rotation.y = rotation;
    if (physics && !paused) {
      simulationAge += dt;
      for (const b of balls) {
        b.vy -= 9 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
        const r = Math.hypot(b.x, b.z);
        if (r > 1.76) {
          const nx = b.x / r,
            nz = b.z / r;
          b.x = nx * 1.76;
          b.z = nz * 1.76;
          const dot = b.vx * nx + b.vz * nz;
          b.vx -= 1.65 * dot * nx;
          b.vz -= 1.65 * dot * nz;
        }
        if (b.y < 0.39) {
          b.y = 0.39;
          b.vy = Math.abs(b.vy) * 0.45;
          b.vx *= 0.98;
          b.vz *= 0.98;
        }
        if (b.y > 4.22) {
          b.y = 4.22;
          b.vy = -Math.abs(b.vy) * 0.65;
        }
      }
      for (let iteration = 0; iteration < 2; iteration++)
        for (let i = 0; i < 100; i++)
          for (let j = i + 1; j < 100; j++) {
            const a = balls[i],
              b = balls[j],
              dx = b.x - a.x,
              dy = b.y - a.y,
              dz = b.z - a.z,
              d = Math.hypot(dx, dy, dz);
            if (d < 0.57 && d > 0.00001) {
              const nx = dx / d,
                ny = dy / d,
                nz = dz / d,
                push = (0.57 - d) / 2;
              a.x -= nx * push;
              a.y -= ny * push;
              a.z -= nz * push;
              b.x += nx * push;
              b.y += ny * push;
              b.z += nz * push;
              const v =
                (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
              if (v < 0) {
                const impulse = -v * 0.62;
                a.vx -= nx * impulse;
                a.vy -= ny * impulse;
                a.vz -= nz * impulse;
                b.vx += nx * impulse;
                b.vy += ny * impulse;
                b.vz += nz * impulse;
              }
            }
          }
      sync();
      if (simulationAge > 9) physics = false;
    }
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(render);
  onReady();
  return {
    setProbability,
    shake() {
      if (paused) {
        targetRotation += Math.PI / 3;
        return;
      }
      physics = true;
      simulationAge = 0;
      for (const b of balls) {
        b.vx = (random() - 0.5) * 6;
        b.vz = (random() - 0.5) * 6;
        b.vy = 3 + random() * 5;
      }
    },
    pause(v) {
      paused = v;
    },
    dispose() {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      new Set(geometries).forEach((g) => g.dispose());
      new Set(materials).forEach((m) => m.dispose());
      renderer.dispose();
    },
  };
}
