import * as THREE from 'three';

const clamp01 = (value) => Math.max(0, Math.min(1, value));
function ease(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

// The waterfront sits low. Long, shallow hills climb toward the east and north of downtown.
export function groundHeight(x, z) {
  const inland = ease((x + 286) / 474);
  const westSlope = 8.8 * inland;
  const crest = 5.2 * Math.exp(-(((x - 92) / 150) ** 2 + ((z - 123) / 171) ** 2));
  const hills = inland * (2.1 * Math.sin((z + 12) / 89) + 1.45 * Math.sin((z - x * .43) / 59));
  return westSlope + crest + hills;
}

export function createTerrain(material, span = 950, eastEdge = span / 2) {
  const steps = Math.ceil(span / 6);
  const width=eastEdge+span/2;
  const geometry = new THREE.PlaneGeometry(width, span, Math.ceil(width/6), steps);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate((eastEdge-span/2)/2,0,0);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    positions.setY(i, groundHeight(positions.getX(i), positions.getZ(i)));
  }
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .82, ...extra });
}

function ribbon(scene, mat, x0, x1, z0, z1, elevation, step = 4, offset = 0) {
  const positions = [];
  const uv = [];
  const indices = [];
  const segments = Math.max(1, Math.ceil((z1 - z0) / step));
  for (let i = 0; i <= segments; i++) {
    const z = THREE.MathUtils.lerp(z0, z1, i / segments);
    const y = elevation(z) + offset;
    positions.push(x0, y, z, x1, y, z);
    uv.push(0, (z - z0) / 12, 1, (z - z0) / 12);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  scene.add(new THREE.Mesh(geometry, mat));
}

function sidewall(scene, mat, x, z0, z1, deckHeight, low, high) {
  const positions = [];
  const indices = [];
  const segments = Math.ceil((z1 - z0) / 4);
  for (let i = 0; i <= segments; i++) {
    const z = THREE.MathUtils.lerp(z0, z1, i / segments);
    const y = deckHeight(z);
    positions.push(x, y + low, z, x, y + high, z);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  scene.add(new THREE.Mesh(geometry, mat));
}

function signage(label, shield = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 224;
  const context = canvas.getContext('2d');
  context.fillStyle = '#115442';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#e2f4e9';
  context.lineWidth = 10;
  context.strokeRect(13, 13, 742, 198);
  if (shield) {
    context.fillStyle = '#346598';
    context.beginPath();
    context.roundRect(37, 45, 126, 132, 22);
    context.fill();
    context.fillStyle = '#ac3953';
    context.fillRect(49, 53, 102, 24);
    context.font = '700 78px system-ui';
    context.fillStyle = '#f5faf8';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('5', 100, 125);
  }
  context.font = shield ? '700 58px system-ui' : '700 69px system-ui';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#f5faf8';
  context.fillText(label, shield ? 454 : 384, 108, shield ? 544 : 690);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide });
}

function sign(scene, mat, steel, x, y, z, direction, width = 7.4) {
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width, 2.16), mat);
  face.position.set(x, y + 2.9, z);
  face.rotation.y = direction < 0 ? Math.PI : 0;
  scene.add(face);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.108, 3.7, .108), steel);
    leg.position.set(x + side * width * .31, y + 1.85, z + direction * .10);
    scene.add(leg);
  }
}

function distantApproachSigns(scene, steel, block, axisX, startZ, endZ) {
  const freeway = signage('FREEWAY', true);
  const entrance = signage('R-5 ENTRANCE');
  for (const end of [startZ, endZ]) {
    const direction = end === endZ ? 1 : -1;
    const x = axisX + direction * 8;
    const z = end - direction * 2.5;
    sign(scene, entrance, steel, x, groundHeight(x, z), z, direction, 5.1);
  }
  for (const [x, z, direction] of [
    [axisX - 9.6, -block * 2 + 13, -1],
    [axisX + 9.6, block * 2 - 13, 1],
    [axisX - 9.6, -block + 15, -1],
    [axisX + 9.6, block - 15, 1],
  ]) {
    sign(scene, freeway, steel, x, groundHeight(x, z), z, direction, 5.7);
  }
}

// A paired ramp at each end leads to an overpass. Its surface is tracked separately
// from the street beneath, so cross traffic can pass along the ground-level grid.
export function createFreeway(scene, { block = 76, extent = 304 } = {}) {
  const axisX = block * 2;
  const startZ = -extent + 25;
  const endZ = extent - 25;
  const halfWidth = 8.7;
  const rampLength = 47;
  const rise = 7.3;
  const uplift = (z) => rise * ease(Math.min(z - startZ, endZ - z) / rampLength);
  const deckHeight = (z) => groundHeight(axisX, z) + uplift(z) + .037;
  const asphalt = material(0x202a3d, { emissive: 0x0a1828, emissiveIntensity: .68, roughness: .92 });
  const concrete = material(0x4b5668, {
    emissive: 0x1a2637, emissiveIntensity: .57, side: THREE.DoubleSide, roughness: .94,
  });
  const steel = material(0x354659, { metalness: .25, emissive: 0x122539, emissiveIntensity: .65 });
  const white = new THREE.MeshBasicMaterial({ color: 0xabbcd0 });
  const amber = new THREE.MeshBasicMaterial({ color: 0xe3ba69 });
  const guideLight = new THREE.MeshBasicMaterial({ color: 0x89b4cd, toneMapped: false });

  ribbon(scene, asphalt, axisX - halfWidth, axisX + halfWidth, startZ, endZ, deckHeight);
  ribbon(scene, concrete, axisX - halfWidth, axisX + halfWidth, startZ + 3, endZ - 3, deckHeight, 4, -.47);
  const barrierStart = startZ + 12;
  const barrierEnd = endZ - 12;
  const exitOpening = z => z > -143 && z < -100;
  for (const side of [-1, 1]) {
    const edge = axisX + side * (halfWidth - .22);
    const rails=side>0?[[barrierStart,-143],[-100,barrierEnd]]:[[barrierStart,barrierEnd]];
    for(const [from,to] of rails){
      sidewall(scene, concrete, edge, from, to, deckHeight, -.50, .90);
      sidewall(scene, concrete, edge + side * .42, from, to, deckHeight, -.45, .90);
      ribbon(scene, concrete, edge - .24, edge + .24, from, to, deckHeight, 4, .90);
    }
    const line = axisX + side * (halfWidth - .83);
    if(side>0){
      ribbon(scene,white,line-.071,line+.071,startZ+2,-143,deckHeight,4,.019);
      ribbon(scene,white,line-.071,line+.071,-100,endZ-2,deckHeight,4,.019);
    }else ribbon(scene,white,line-.071,line+.071,startZ+2,endZ-2,deckHeight,4,.019);
    for (let z = startZ + 5; z + 4.6 < endZ; z += 12.4) {
      const lane = axisX + side * 4.23;
      ribbon(scene, white, lane - .065, lane + .065, z, z + 4.6, deckHeight, 4, .020);
    }
  }
  for (const side of [-1, 1]) {
    const median = axisX + side * .24;
    ribbon(scene, amber, median - .061, median + .061, startZ + 3, endZ - 3, deckHeight, 4, .021);
  }
  distantApproachSigns(scene, steel, block, axisX, startZ, endZ);

  const supports = [];
  for (let z = startZ + rampLength + 11; z < endZ - rampLength; z += 24) {
    const nearestIntersection = Math.abs(z - Math.round(z / block) * block);
    if (nearestIntersection < 12) continue;
    const ground = groundHeight(axisX, z);
    const deck = deckHeight(z);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(1.2, deck - ground - .51, 1.24), concrete);
    stem.position.set(axisX, (ground + deck - .51) * .5, z);
    supports.push(z);
    scene.add(stem);
    const head = new THREE.Mesh(new THREE.BoxGeometry(9.4, .66, 1.53), concrete);
    head.position.set(axisX, deck - .61, z);
    scene.add(head);
  }

  const lights = [];
  for (let z = barrierStart + 6; z < barrierEnd; z += 14) {
    for (const side of [-1, 1]) {
      if(side>0&&exitOpening(z))continue;
      lights.push([axisX + side * (halfWidth - .20), deckHeight(z) + .89, z]);
    }
  }
  const marker = new THREE.InstancedMesh(new THREE.BoxGeometry(.19, .13, .34), guideLight, lights.length);
  const matrix = new THREE.Matrix4();
  lights.forEach(([x, y, z], i) => {
    matrix.makeTranslation(x, y, z);
    marker.setMatrixAt(i, matrix);
  });
  scene.add(marker);

  sign(scene,signage('SHORE LINK  ↗'),steel,axisX+8.4,deckHeight(-82),-82,-1,6.2);
  const exitSign = signage('DOWNTOWN', true);
  for (const [z, direction] of [[endZ - 31, -1], [startZ + 31, 1]]) {
    sign(scene, exitSign, steel, axisX + direction * (halfWidth - .22), deckHeight(z), z, direction, 5.3);
  }

  function inBounds(z) { return z >= startZ && z <= endZ; }
  function surfaceAt(x, z, wasOnFreeway = false) {
    const onDeck = inBounds(z) && Math.abs(x - axisX) < halfWidth
      && (wasOnFreeway || uplift(z) < .39);
    return onDeck ? { y: deckHeight(z), onFreeway: true } : { y: groundHeight(x, z), onFreeway: false };
  }
  function blocks(x, z, wasOnFreeway = false) {
    if (!inBounds(z)) return false;
    const lateral = Math.abs(x - axisX);
    if (wasOnFreeway) return lateral > halfWidth - .58 && uplift(z) > .38 && !(x>axisX&&exitOpening(z));
    const deck = uplift(z);
    return (deck > .49 && deck < 2.54 && lateral < halfWidth + .26)
      || (lateral < 1.2 && supports.some((pillarZ) => Math.abs(z - pillarZ) < 1.14));
  }
  return { axisX, startZ, endZ, halfWidth, surfaceAt, blocks };
}
