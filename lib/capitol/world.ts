import * as THREE from 'three';
import {
  CHARACTERS,
  ZONES,
  canStand,
  nearestZone,
  type Collider,
  type ZoneId,
} from './layout';
export type WorldState = {
  x: number;
  z: number;
  yaw: number;
  zone: ZoneId;
  near: string | null;
  fps: number;
};
export type WorldOptions = {
  onState: (s: WorldState) => void;
  onInteract: (id: string) => void;
  onError: (message: string) => void;
  demHouse: number;
  demSenate: number;
};
export type WorldAPI = {
  teleport: (id: ZoneId) => void;
  pause: (v: boolean) => void;
  motion: (v: boolean) => void;
  daylight: (v: number) => void;
  key: (key: string, down: boolean) => void;
  look: (x: number, y: number) => void;
  capture: () => void;
  setVotes: (chamber: 'house' | 'senate', votes: string[]) => void;
  dispose: () => void;
};
/** Stylized public Capitol spaces; deliberately not a real floor plan. */
export function createWorld(
  canvas: HTMLCanvasElement,
  options: WorldOptions,
): WorldAPI {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#a8cde7');
  scene.fog = new THREE.Fog('#c5dbea', 120, 320);
  const camera = new THREE.PerspectiveCamera(
    68,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    500,
  );
  camera.rotation.order = 'YXZ';
  camera.position.set(-55, 2.5, 0);
  camera.rotation.y = -Math.PI / 2;
  const ambient = new THREE.HemisphereLight('#e7f2ff', '#887758', 2.1);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight('#fff0cc', 3);
  sun.position.set(-80, 110, 55);
  scene.add(sun);
  const walls: Collider[] = [];
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];
  const mat = (c: string, roughness = 0.75) => {
    const m = new THREE.MeshStandardMaterial({ color: c, roughness });
    materials.push(m);
    return m;
  };
  const marble = mat('#e7e4dc'),
    trim = mat('#f7f3e9'),
    stone = mat('#bbb6aa'),
    gold = mat('#b68c45', 0.35),
    wood = mat('#553628'),
    navy = mat('#304d72'),
    grass = mat('#5b8768'),
    leaf = mat('#467953'),
    bark = mat('#6c5743');
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(boxGeo);
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    solid = false,
  ) => {
    const mesh = new THREE.Mesh(boxGeo, m);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    scene.add(mesh);
    if (solid) walls.push({ x, z, w, d });
    return mesh;
  };
  const cylinder = (
    x: number,
    y: number,
    z: number,
    rt: number,
    rb: number,
    h: number,
    m: THREE.Material,
    segments = 24,
  ) => {
    const g = new THREE.CylinderGeometry(rt, rb, h, segments);
    geometries.push(g);
    const a = new THREE.Mesh(g, m);
    a.position.set(x, y, z);
    scene.add(a);
    return a;
  };
  const sphere = (
    x: number,
    y: number,
    z: number,
    r: number,
    m: THREE.Material,
  ) => {
    const g = new THREE.SphereGeometry(r, 20, 12);
    geometries.push(g);
    const a = new THREE.Mesh(g, m);
    a.position.set(x, y, z);
    scene.add(a);
    return a;
  };
  const sign = (
    text: string,
    x: number,
    y: number,
    z: number,
    width = 8,
    angle = 0,
  ) => {
    const c = document.createElement('canvas');
    c.width = 768;
    c.height = 192;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#162b42';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#caa867';
    ctx.lineWidth = 7;
    ctx.strokeRect(10, 10, 748, 172);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f7f1df';
    ctx.font = '500 36px Georgia';
    ctx.fillText(text, 384, 107, 710);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    textures.push(t);
    const m = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide });
    materials.push(m);
    const g = new THREE.PlaneGeometry(width, width / 4);
    geometries.push(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.rotation.y = angle;
    scene.add(mesh);
  };
  const column = (x: number, z: number, height = 12, y = 0) => {
    cylinder(x, y + 0.3, z, 1, 1, 0.6, trim);
    cylinder(x, y + height / 2, z, 0.47, 0.6, height, marble, 16);
    cylinder(x, y + height - 0.2, z, 0.95, 0.8, 0.55, trim);
  };
  const wall = (x: number, z: number, w: number, d: number, h = 12) => {
    box(x, h / 2, z, w, h, d, marble, true);
    box(x, h - 0.25, z, w + 0.15, 0.55, d + 0.15, trim);
    box(x, 0.4, z, w + 0.2, 0.8, d + 0.2, stone);
  };
  const room = (
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    carpet: THREE.Material,
  ) => {
    box(x, -0.05, z, w, 0.12, d, carpet);
    wall(x - w / 2, z, 1, d, h);
    wall(x + w / 2, z, 1, d, h);
    for (const side of [-1, 1]) {
      wall(x - (w + 6) / 4, z + (side * d) / 2, (w - 6) / 2, 1, h);
      wall(x + (w + 6) / 4, z + (side * d) / 2, (w - 6) / 2, 1, h);
    }
    box(x, h, z, w + 1, 0.7, d + 1, marble);
    // Clerestory bands and pilasters give the chambers their two-story enclosure.
    for (let p = -w / 2 + 4; p < w / 2; p += 5) {
      column(x + p, z - d / 2 + 1, h - 1);
      column(x + p, z + d / 2 - 1, h - 1);
    }
  };
  // Grounds, avenues, plazas, benches, paths, and low-poly trees.
  box(0, -0.6, 0, 285, 1, 300, grass);
  box(-45, -0.02, 0, 105, 0.12, 16, stone);
  box(65, -0.02, 0, 130, 0.12, 12, stone);
  box(58, -0.01, 0, 12, 0.14, 245, stone);
  box(0, -0.01, 111, 175, 0.14, 12, stone);
  box(0, -0.01, -111, 175, 0.14, 12, stone);
  for (let i = 0; i < 44; i++) {
    const side = i % 2 ? -1 : 1;
    const x = side * (64 + (i % 4) * 14),
      z = -125 + Math.floor(i / 2) * 12;
    if (x > 70 && Math.abs(z) < 92) continue;
    cylinder(x, 2, z, 0.3, 0.5, 4, bark, 8);
    sphere(x, 5.4, z, 2.8 + (i % 3) * 0.4, leaf);
  }
  for (const z of [-35, 35])
    for (const x of [-35, -65, -95]) {
      box(x, 0.8, z, 5, 0.35, 1.4, wood);
      box(x, 1.5, z + 0.65, 5, 1.1, 0.18, wood);
      for (const dx of [-1.8, 1.8]) box(x + dx, 0.35, z, 0.18, 0.7, 1.2, stone);
    }
  // Raised-looking foundation with a level accessible route through the portico.
  box(0, -0.05, 0, 52, 0.16, 181, stone);
  box(0, 0, 0, 34, 0.1, 176, trim);
  box(0, -0.02, 0, 10, 0.1, 140, marble);
  // Rotunda circular enclosure, with four broad openings.
  cylinder(0, 0.04, 0, 14, 14, 0.13, marble, 64);
  const domeGeo = new THREE.SphereGeometry(
    14,
    48,
    24,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  geometries.push(domeGeo);
  const domeMat = mat('#e9e4d7');
  domeMat.side = THREE.DoubleSide;
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 20;
  scene.add(dome);
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const nearOpening =
      Math.abs(Math.sin(a)) < 0.17 || Math.abs(Math.cos(a)) < 0.17;
    if (!nearOpening) {
      const x = Math.cos(a) * 14,
        z = Math.sin(a) * 14;
      const m = box(x, 9, z, 2.8, 18, 0.7, marble);
      m.rotation.y = -a + Math.PI / 2;
      walls.push({ x, z, w: 2.8, d: 0.7, angle: m.rotation.y });
      column(Math.cos(a) * 13.2, Math.sin(a) * 13.2, 16);
    }
  }
  for (const h of [4, 17, 20]) {
    const g = new THREE.TorusGeometry(14, 0.23, 8, 64);
    geometries.push(g);
    const ring = new THREE.Mesh(g, gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = h;
    scene.add(ring);
  }
  cylinder(0, 36, 0, 4, 5, 6, marble);
  cylinder(0, 39.5, 0, 3.4, 4, 0.8, gold);
  sphere(0, 42, 0, 2.5, marble);
  cylinder(0, 45.5, 0, 0.22, 0.4, 3, stone, 12);
  sphere(0, 47.3, 0, 0.6, stone);
  // Abstract ceiling medallion, not a reproduction of a historic artwork.
  const medallion = cylinder(0, 30.2, 0, 5, 5, 0.12, gold, 48);
  medallion.rotation.x = Math.PI;
  sign('THE ROTUNDA', 0, 4, -13, 8);
  sign('SENATE · NORTH', 0, 3.5, -19, 7);
  sign('HOUSE · SOUTH', 0, 3.5, 20, 7, Math.PI);
  // West portico and east colonnade; central opening stays unobstructed.
  for (const x of [-25, -20])
    for (const z of [-13, -8, 8, 13]) column(x, z, 15);
  box(-23, 15.4, 0, 12, 1, 34, trim);
  box(-23, 16.3, 0, 12, 0.8, 31, marble);
  const pedimentGeo = new THREE.ConeGeometry(18, 4, 3);
  geometries.push(pedimentGeo);
  const pediment = new THREE.Mesh(pedimentGeo, marble);
  pediment.position.set(-23, 18, 0);
  pediment.rotation.y = Math.PI / 2;
  pediment.scale.set(0.45, 1, 1);
  scene.add(pediment);
  for (const z of [-13, -8, 8, 13]) column(22, z, 15);
  box(22, 15.4, 0, 9, 0.8, 34, trim);
  // North and south corridors have intermittent windows and door openings.
  for (const z of [-40, -30, 21, 45]) {
    wall(-6, z, 1, 12, 9);
    wall(6, z, 1, 12, 9);
    box(0, 9, z, 13, 0.5, 12, trim);
  }
  room(0, 69, 50, 45, 15, navy);
  room(0, -66, 44, 40, 15, navy);
  sign('HOUSE OF REPRESENTATIVES', 0, 8, 90, 18, Math.PI);
  sign('UNITED STATES SENATE', 0, 8, -85, 17);
  // Rostrum, public galleries, flags, and doors in each current chamber.
  const flag = (x: number, z: number, y = 1) => {
    cylinder(x, y + 4, z, 0.07, 0.07, 8, gold, 8);
    const blue = mat('#294c80'),
      red = mat('#aa4848');
    for (let i = 0; i < 13; i++)
      box(x + 1.6, y + 6.5 - i * 0.23, z, 3.2, 0.23, 0.06, i % 2 ? trim : red);
    box(x + 0.7, y + 6, z + 0.04, 1.4, 1.2, 0.06, blue);
  };
  for (const [z, dir] of [
    [69, 1],
    [-66, -1],
  ]) {
    box(0, 0.45, z + dir * 15, 17, 0.9, 5, wood);
    box(0, 1.9, z + dir * 16, 7, 2, 2, wood);
    box(0, 3.1, z + dir * 16, 4, 0.35, 2.7, wood);
    flag(-10, z + dir * 17);
    flag(10, z + dir * 17);
    for (const side of [-1, 1]) {
      box(side * 20, 7, z, 3, 0.5, 32, wood);
      box(side * 18.5, 7.8, z, 0.2, 1.3, 32, gold);
    }
  }
  // Seats use instancing: hundreds of visible chairs with only a few draw calls.
  const seatMeshes: Record<string, THREE.InstancedMesh> = {};
  const seats = (
    chamber: 'house' | 'senate',
    centerZ: number,
    total: number,
    dem: number,
  ) => {
    const m = mat('#587397'),
      seat = new THREE.InstancedMesh(boxGeo, m, total),
      back = new THREE.InstancedMesh(boxGeo, m, total),
      desk = new THREE.InstancedMesh(boxGeo, wood, total);
    scene.add(seat, back, desk);
    seatMeshes[chamber] = seat;
    seatMeshes[chamber + 'Back'] = back;
    const dummy = new THREE.Object3D();
    let index = 0;
    const rows = chamber === 'house' ? 12 : 5;
    for (let row = 0; row < rows; row++) {
      const count =
        chamber === 'house' ? Math.round(21 + row * 2.8) : 12 + row * 4;
      const radius = chamber === 'house' ? 7 + row * 1.15 : 6 + row * 2.3;
      for (let j = 0; j < count && index < total; j++) {
        const angle = Math.PI * 0.12 + (j / (count - 1)) * Math.PI * 0.76;
        const dir = chamber === 'house' ? 1 : -1;
        const x = Math.cos(angle) * radius,
          z = centerZ + dir * (12 - Math.sin(angle) * radius);
        dummy.position.set(x, 0.65, z);
        dummy.rotation.y = dir === 1 ? Math.PI - angle : -angle;
        dummy.scale.set(0.72, 0.3, 0.7);
        dummy.updateMatrix();
        seat.setMatrixAt(index, dummy.matrix);
        dummy.position.y = 1.2;
        dummy.scale.set(0.72, 0.9, 0.18);
        dummy.updateMatrix();
        back.setMatrixAt(index, dummy.matrix);
        dummy.position.set(x, 1.45, z + dir * 0.7);
        dummy.scale.set(chamber === 'senate' ? 1.6 : 0.8, 0.16, 0.7);
        dummy.updateMatrix();
        desk.setMatrixAt(index, dummy.matrix);
        const color = new THREE.Color(index < dem ? '#4d83c4' : '#c2676b');
        seat.setColorAt(index, color);
        back.setColorAt(index, color);
        index++;
      }
    }
    // Extra outer-row seats preserve the requested count if row rounding differs.
    while (index < total) {
      dummy.position.set(
        -18 + (index % 36),
        0.7,
        centerZ + (chamber === 'house' ? -16 : 16),
      );
      dummy.scale.set(0.7, 0.4, 0.7);
      dummy.updateMatrix();
      seat.setMatrixAt(index, dummy.matrix);
      back.setMatrixAt(index, dummy.matrix);
      desk.setMatrixAt(index, dummy.matrix);
      seat.setColorAt(
        index,
        new THREE.Color(index < dem ? '#4d83c4' : '#c2676b'),
      );
      index++;
    }
    seat.instanceMatrix.needsUpdate = true;
    back.instanceMatrix.needsUpdate = true;
    desk.instanceMatrix.needsUpdate = true;
  };
  seats('house', 69, 435, options.demHouse);
  seats('senate', -66, 100, options.demSenate);
  // Historic hall and small side rooms.
  room(0, 32, 28, 23, 12, marble);
  sign('NATIONAL STATUARY HALL', 0, 5, 42.2, 13, Math.PI);
  const statueMat = mat('#c5c4bc');
  for (const x of [-10, 10])
    for (const z of [25, 32, 39]) {
      box(x, 0.7, z, 2, 1.4, 2, stone);
      cylinder(x, 2.7, z, 0.35, 0.7, 2.6, statueMat, 12);
      sphere(x, 4.35, z, 0.45, statueMat);
    }
  room(30, -28, 25, 21, 10, mat('#7d4545'));
  room(30, 28, 25, 21, 10, mat('#66827a'));
  // Exterior doors for side-room access and short open porticoes.
  sign('OLD SENATE CHAMBER', 30, 4, -38, 13);
  sign('COMMITTEE HEARING', 30, 4, 38, 12, Math.PI);
  box(30, 0.8, 31, 17, 1.6, 2.5, wood);
  for (let i = 0; i < 7; i++) box(23 + i * 2.3, 1.9, 32, 0.7, 1.1, 0.3, navy);
  box(30, 1.1, 24, 5, 2.2, 1.8, wood);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 6; j++)
      box(22 + j * 3, 1, 17 + i * 2, 1.2, 0.45, 1, wood);
  for (let i = 0; i < 10; i++) {
    const a = (i / 9) * Math.PI;
    box(30 + Math.cos(a) * 8, 1, -28 + Math.sin(a) * 6, 1.6, 1.6, 1.1, wood);
  }
  // Nearby public landmarks are exterior-only masses.
  const landmark = (
    x: number,
    z: number,
    w: number,
    d: number,
    label: string,
  ) => {
    box(x, 9, z, w, 18, d, marble, true);
    box(x, 18.5, z, w + 3, 1, d + 3, trim);
    for (let i = 0; i < 8; i++)
      column(x - w / 2 + 3 + (i * (w - 6)) / 7, z - d / 2 - 3, 15);
    box(x, 15.7, z - d / 2 - 3, w + 3, 1, 7, trim);
    sign(label, x, 10, z - d / 2 - 3.6, w * 0.9);
  };
  landmark(94, 37, 43, 30, 'LIBRARY OF CONGRESS');
  landmark(94, -57, 39, 30, 'SUPREME COURT');
  landmark(-8, 122, 62, 20, 'HOUSE OFFICE BUILDINGS');
  landmark(8, -124, 65, 20, 'SENATE OFFICE BUILDINGS');
  // Public-space information pedestals are interactable by proximity.
  const hotspots = ZONES.map((z) => {
    const x =
      z.id === 'grounds'
        ? -31
        : z.id === 'library'
          ? 94
          : z.id === 'court'
            ? 94
            : z.x + 3;
    const zz = z.id === 'library' ? 12 : z.id === 'court' ? -81 : z.z;
    box(x, 0.7, zz, 1.2, 1.4, 1.2, wood);
    sphere(x, 1.9, zz, 0.25, gold);
    return { id: 'zone:' + z.id, x, z: zz };
  });
  const people: {
    id: string;
    group: THREE.Group;
    legs: THREE.Group[];
    arms: THREE.Group[];
    homeX: number;
    homeZ: number;
    radius: number;
    targetX: number;
    targetZ: number;
    wait: number;
    phase: number;
  }[] = [];
  const headGeo = new THREE.SphereGeometry(0.24, 12, 8),
    limbGeo = new THREE.CylinderGeometry(0.055, 0.065, 1, 7);
  geometries.push(headGeo, limbGeo);
  const dark = mat('#2f3745'),
    neutral = mat('#75828a');
  const nameSprite = (name: string) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 90;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(20,35,53,.9)';
    ctx.fillRect(0, 0, 512, 90);
    ctx.fillStyle = 'white';
    ctx.font = '30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 256, 57, 490);
    const t = new THREE.CanvasTexture(c);
    textures.push(t);
    const m = new THREE.SpriteMaterial({ map: t, depthTest: true });
    materials.push(m);
    const a = new THREE.Sprite(m);
    a.position.y = 3.35;
    a.scale.set(4.8, 0.84, 1);
    return a;
  };
  const addPerson = (
    id: string,
    x: number,
    z: number,
    radius: number,
    color: string,
    label?: string,
  ) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    scene.add(group);
    const m = label ? mat(color) : neutral;
    const head = new THREE.Mesh(headGeo, m);
    head.position.y = 2.55;
    group.add(head);
    const torso = new THREE.Mesh(limbGeo, m);
    torso.position.y = 1.85;
    torso.scale.y = 0.9;
    group.add(torso);
    const legs: THREE.Group[] = [],
      arms: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.14, 1.35, 0);
      const mesh = new THREE.Mesh(limbGeo, dark);
      mesh.position.y = -0.58;
      mesh.scale.y = 1.16;
      leg.add(mesh);
      group.add(leg);
      legs.push(leg);
      const arm = new THREE.Group();
      arm.position.set(side * 0.1, 2.18, 0);
      arm.rotation.z = side * 0.25;
      const a = new THREE.Mesh(limbGeo, m);
      a.position.y = -0.46;
      a.scale.y = 0.92;
      arm.add(a);
      group.add(arm);
      arms.push(arm);
    }
    if (label) group.add(nameSprite(label));
    people.push({
      id,
      group,
      legs,
      arms,
      homeX: x,
      homeZ: z,
      radius,
      targetX: x,
      targetZ: z,
      wait: 0,
      phase: people.length * 1.7,
    });
  };
  for (let i = 0; i < CHARACTERS.length; i++) {
    const c = CHARACTERS[i],
      z = ZONES.find((x) => x.id === c.zone)!;
    let x = z.x + ((i % 3) - 1) * 3,
      zz = z.z + (i % 2 ? 3 : -3);
    if (c.zone === 'senate') {
      const n = CHARACTERS.slice(0, i).filter(
        (p) => p.zone === 'senate',
      ).length;
      x = -8 + n * 4;
      zz = -49;
    }
    if (c.zone === 'house') zz = 53;
    if (c.zone === 'library') {
      x = 84;
      zz = 12;
    }
    addPerson(
      c.id,
      x,
      zz,
      3.5,
      c.party === 'D'
        ? '#3577bd'
        : c.party === 'R'
          ? '#b95a61'
          : c.party === 'I'
            ? '#967a36'
            : '#657477',
      c.name,
    );
  }
  for (let i = 0; i < 22; i++) {
    const z = ZONES[[0, 1, 2, 3, 4][i % 5]];
    addPerson(
      'visitor-' + i,
      z.x + ((i % 4) - 1.5) * 3,
      z.z + ((i % 3) - 1) * 3,
      4,
      '#7a8692',
    );
  }
  let paused = true,
    movingPeople = !window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches,
    yaw = -Math.PI / 2,
    pitch = 0,
    near: string | null = null,
    previous = performance.now(),
    accum = 0,
    frames = 0,
    fps = 60,
    lastState = 0,
    frame = 0,
    drag = false,
    dragX = 0,
    dragY = 0;
  const keys = new Set<string>();
  let rng = 123456789;
  const random = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  const look = (x: number, y: number) => {
    if (paused) return;
    yaw -= x * 0.0025;
    pitch = Math.max(-1.35, Math.min(1.35, pitch - y * 0.0025));
  };
  const onMouse = (e: MouseEvent) => {
    if (document.pointerLockElement === canvas) look(e.movementX, e.movementY);
  };
  const pointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || paused) return;
    drag = true;
    dragX = e.clientX;
    dragY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };
  const pointerMove = (e: PointerEvent) => {
    if (drag && document.pointerLockElement !== canvas) {
      look(e.clientX - dragX, e.clientY - dragY);
      dragX = e.clientX;
      dragY = e.clientY;
    }
  };
  const pointerUp = () => {
    drag = false;
  };
  const keyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.closest('input,textarea,select,button'))
      return;
    if (
      [
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Space',
      ].includes(e.code)
    )
      e.preventDefault();
    keys.add(e.code);
    if (e.code === 'KeyE' && !paused && near) options.onInteract(near);
  };
  const keyUp = (e: KeyboardEvent) => keys.delete(e.code);
  const blur = () => keys.clear();
  document.addEventListener('mousemove', onMouse);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', blur);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  const resize = new ResizeObserver(() => {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (w && h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  });
  resize.observe(canvas);
  const onLost = (e: Event) => {
    e.preventDefault();
    paused = true;
    options.onError(
      'The 3D graphics context was interrupted. Reload to resume, or use the room list and vote simulation.',
    );
  };
  canvas.addEventListener('webglcontextlost', onLost);
  const render = (time: number) => {
    frame = requestAnimationFrame(render);
    const dt = Math.min((time - previous) / 1000, 0.045);
    previous = time;
    if (document.hidden) return;
    if (!paused) {
      let forward =
          (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
          (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0),
        side = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
      if (keys.has('ArrowLeft')) yaw += dt * 1.5;
      if (keys.has('ArrowRight')) yaw -= dt * 1.5;
      const norm = Math.hypot(forward, side) || 1;
      forward /= norm;
      side /= norm;
      const speed = (keys.has('ShiftLeft') ? 19 : 10) * dt;
      const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * side) * speed,
        dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * side) * speed;
      if (canStand(camera.position.x + dx, camera.position.z, walls))
        camera.position.x += dx;
      if (canStand(camera.position.x, camera.position.z + dz, walls))
        camera.position.z += dz;
      camera.rotation.set(pitch, yaw, 0);
      camera.position.y =
        2.5 + (movingPeople && forward ? Math.sin(time * 0.009) * 0.025 : 0);
    }
    if (movingPeople && !paused)
      for (const p of people) {
        const dx = p.targetX - p.group.position.x,
          dz = p.targetZ - p.group.position.z,
          dist = Math.hypot(dx, dz);
        if (dist < 0.15) {
          p.wait -= dt;
          if (p.wait < 0) {
            const a = random() * Math.PI * 2,
              r = Math.sqrt(random()) * p.radius;
            const nx = p.homeX + Math.cos(a) * r,
              nz = p.homeZ + Math.sin(a) * r;
            if (canStand(nx, nz, walls, 0.3)) {
              p.targetX = nx;
              p.targetZ = nz;
            }
            p.wait = 1 + random() * 3;
          }
        } else {
          const amount = Math.min(dist, dt * 0.85);
          const nx = p.group.position.x + (dx / dist) * amount,
            nz = p.group.position.z + (dz / dist) * amount;
          if (canStand(nx, nz, walls, 0.25)) {
            p.group.position.x = nx;
            p.group.position.z = nz;
            p.group.rotation.y = Math.atan2(dx, dz);
          } else {
            p.targetX = p.group.position.x;
            p.targetZ = p.group.position.z;
          }
          const walk = Math.sin(time * 0.007 + p.phase) * 0.45;
          p.legs[0].rotation.x = walk;
          p.legs[1].rotation.x = -walk;
          p.arms[0].rotation.x = -walk * 0.6;
          p.arms[1].rotation.x = walk * 0.6;
        }
      }
    if (time - lastState > 150) {
      lastState = time;
      let distance = 6;
      near = null;
      for (const p of people) {
        if (p.id.startsWith('visitor-')) continue;
        const d = Math.hypot(
          camera.position.x - p.group.position.x,
          camera.position.z - p.group.position.z,
        );
        if (d < distance) {
          near = p.id;
          distance = d;
        }
      }
      for (const p of hotspots) {
        const d = Math.hypot(camera.position.x - p.x, camera.position.z - p.z);
        if (d < distance) {
          near = p.id;
          distance = d;
        }
      }
      options.onState({
        x: camera.position.x,
        z: camera.position.z,
        yaw,
        zone: nearestZone(camera.position.x, camera.position.z).id,
        near,
        fps,
      });
    }
    accum += dt;
    frames++;
    if (accum > 1) {
      fps = Math.round(frames / accum);
      accum = 0;
      frames = 0;
    }
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(render);
  const teleport = (id: ZoneId) => {
    const z = ZONES.find((x) => x.id === id)!;
    const positions: Partial<Record<ZoneId, [number, number]>> = {
      house: [0, 51],
      senate: [0, -49],
      library: [94, 11],
      court: [94, -82],
      'old-senate': [30, -20],
      committee: [30, 20],
    };
    const [x, zz] = positions[id] || [z.x - 4, z.z];
    camera.position.set(x, 2.5, zz);
    yaw = id === 'house' ? Math.PI : id === 'senate' ? 0 : -Math.PI / 2;
    pitch = 0;
    camera.rotation.set(pitch, yaw, 0);
    keys.clear();
  };
  return {
    teleport,
    pause(v) {
      paused = v;
      keys.clear();
      if (v && document.pointerLockElement === canvas)
        document.exitPointerLock();
    },
    motion(v) {
      movingPeople = v;
    },
    daylight(v) {
      const n = Math.max(0.15, Math.min(1, v));
      ambient.intensity = 0.7 + 1.4 * n;
      sun.intensity = 3 * n;
      scene.background = new THREE.Color().lerpColors(
        new THREE.Color('#283d66'),
        new THREE.Color('#a8cde7'),
        n,
      );
    },
    key(k, down) {
      if (down) keys.add(k);
      else keys.delete(k);
    },
    look,
    capture() {
      if (!paused) {
        const result = canvas.requestPointerLock();
        if (result)
          void result.catch(() =>
            options.onError(
              'Mouse capture is unavailable. Drag the scene to look, and use WASD or the on-screen controls.',
            ),
          );
      }
    },
    setVotes(chamber, votes) {
      for (const suffix of ['', 'Back']) {
        const m = seatMeshes[chamber + suffix];
        for (let i = 0; i < votes.length; i++)
          m.setColorAt(
            i,
            new THREE.Color(
              votes[i] === 'yea'
                ? '#5faf95'
                : votes[i] === 'nay'
                  ? '#d18b59'
                  : votes[i] === 'dem'
                    ? '#4d83c4'
                    : votes[i] === 'rep'
                      ? '#c2676b'
                      : '#9aa4af',
            ),
          );
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
    },
    dispose() {
      cancelAnimationFrame(frame);
      resize.disconnect();
      document.removeEventListener('mousemove', onMouse);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerUp);
      canvas.removeEventListener('webglcontextlost', onLost);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
    },
  };
}
