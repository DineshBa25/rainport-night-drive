import * as THREE from 'three';

const palettes = [
  { wall: '#111d2d', seams: '#2c435c', windows: ['#acd9f6', '#a1f1ec', '#627fbe', '#f4daba'], accent: 0x73cee0, pitch: 2.1, rows: 3.15, pattern: 'glass' },
  { wall: '#201731', seams: '#3a2c51', windows: ['#caa8ec', '#a5a8e4', '#eebaad', '#a8d4f1'], accent: 0xb49aed, pitch: 2.8, rows: 3.45, pattern: 'grid' },
  { wall: '#221c22', seams: '#483236', windows: ['#f5c58a', '#efac89', '#ffdcb3', '#accbeb'], accent: 0xe6a978, pitch: 2.6, rows: 3.65, pattern: 'stone' },
  { wall: '#142423', seams: '#2b423e', windows: ['#aff5da', '#73c9c3', '#dbebc8', '#f5c2a5'], accent: 0x76c2a7, pitch: 2.4, rows: 3.25, pattern: 'glass' },
  { wall: '#1b1c2b', seams: '#374052', windows: ['#ecdbc0', '#f5a9ae', '#aab6ee', '#b3e9ee'], accent: 0xe691a9, pitch: 2.8, rows: 3.45, pattern: 'brick' },
  { wall: '#101a2b', seams: '#23364f', windows: ['#aecfff', '#7fbbe9', '#e3e9f9', '#ffc797'], accent: 0x81a5f1, pitch: 2.18, rows: 3.22, pattern: 'grid' },
];

const glassColumns = 10;
const glassRows = 17;
function makeFacade(palette, rand) {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 510;
  const ctx = canvas.getContext('2d');
  const cellW = canvas.width / glassColumns;
  const cellH = canvas.height / glassRows;
  ctx.fillStyle = palette.wall;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < glassRows; row++) {
    const rowBrightness = .45 + rand() * .47;
    const mechanical = row % 10 === 9;
    const floor = row * cellH;
    for (let column = 0; column < glassColumns; column++) {
      const x = column * cellW;
      const wide = palette.pattern === 'glass';
      const openingW = wide ? 26 : palette.pattern === 'brick' ? 17 : 20;
      const openingH = wide ? 21 : palette.pattern === 'stone' ? 15 : 17;
      const inset = (cellW - openingW) / 2;
      ctx.fillStyle = '#0a1020';
      ctx.fillRect(x + inset, floor + 4, openingW, openingH);
      const occupied = !mechanical && rand() > (wide ? .31 : .44);
      if (occupied) {
        const tone = palette.windows[Math.floor(rand() * palette.windows.length)];
        ctx.fillStyle = tone;
        ctx.globalAlpha = rowBrightness * (.50 + rand() * .49);
        ctx.fillRect(x + inset + 1, floor + 5, openingW - 2, openingH - 3);
        ctx.globalAlpha *= .4;
        ctx.fillRect(x + inset - 1, floor + openingH + 3, openingW + 2, 4);
        ctx.globalAlpha = 1;
        if (rand() < .21) {
          ctx.fillStyle = '#1c2534';
          ctx.globalAlpha = .55;
          ctx.fillRect(x + inset + 1, floor + 5, openingW - 2, 6 + rand() * 9);
          ctx.globalAlpha = 1;
        }
      }
      ctx.fillStyle = palette.seams;
      ctx.fillRect(x, floor + cellH - 3, cellW, mechanical ? 3 : 1);
      ctx.fillRect(x, floor, palette.pattern === 'stone' ? 3 : 1, cellH);
      if (palette.pattern === 'brick') {
        ctx.globalAlpha = .3;
        ctx.fillRect(x, floor + cellH * .49, cellW, 1);
        ctx.globalAlpha = 1;
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function builder() {
  return { position: [], uv: [] };
}

function triangle(buffer, a, b, c, uva, uvb, uvc) {
  buffer.position.push(...a, ...b, ...c);
  buffer.uv.push(...uva, ...uvb, ...uvc);
}

function shellPoints(x, y, z, width, depth, chamfer) {
  const w = width / 2;
  const d = depth / 2;
  const corner = Math.min(w, d) * chamfer;
  if (!corner) return [
    [x - w, y, z - d], [x - w, y, z + d], [x + w, y, z + d], [x + w, y, z - d],
  ];
  return [
    [x - w, y, z - d + corner], [x - w, y, z + d - corner],
    [x - w + corner, y, z + d], [x + w - corner, y, z + d],
    [x + w, y, z + d - corner], [x + w, y, z - d + corner],
    [x + w - corner, y, z - d], [x - w + corner, y, z - d],
  ];
}

export function createArchitecture(scene, { rand, groundHeight = () => 0 }) {
  const facadeBuffers = palettes.map(builder);
  const roofBuffer = builder();
  const mats = palettes.map(palette => {
    const map = makeFacade(palette, rand);
    return new THREE.MeshStandardMaterial({
      color: 0x7f91a8,
      map,
      emissive: 0xc5d7f1,
      emissiveMap: map,
      emissiveIntensity: 1.24,
      metalness: palette.pattern === 'glass' ? .34 : .09,
      roughness: palette.pattern === 'glass' ? .44 : .75,
    });
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x263246, metalness: .19, roughness: .76, emissive: 0x1b2639, emissiveIntensity: .45,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x384859, metalness: .34, roughness: .48, emissive: 0x182434, emissiveIntensity: .61,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x716068, metalness: .08, roughness: .8, emissive: 0x301e24, emissiveIntensity: .43,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x37506e, metalness: .42, roughness: .2, emissive: 0x516486, emissiveIntensity: .34,
  });
  const globe = new THREE.MeshBasicMaterial({ color: 0xf1bd81, toneMapped: false });
  const accents = palettes.map(palette => new THREE.MeshBasicMaterial({ color: palette.accent, toneMapped: false }));
  const dimAccents = palettes.map(palette => new THREE.MeshBasicMaterial({
    color: new THREE.Color(palette.accent).multiplyScalar(.53), toneMapped: false,
  }));
  const batches = new Map();

  function bar(mat, x, y, z, width, height, depth, yaw = 0) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push([x, y, z, width, height, depth, yaw]);
  }

  function segment(type, x, z, bottom, height, width, depth, chamfer = 0, taper = 1, lean = 0) {
    const lows = shellPoints(x, bottom, z, width, depth, chamfer);
    const highs = shellPoints(x + lean, bottom + height, z, width * taper, depth * taper, chamfer);
    const palette = palettes[type];
    const surface = facadeBuffers[type];
    const floors = Math.max(1, Math.round(height / palette.rows));
    const rowStart = Math.floor(rand() * glassRows) / glassRows;
    for (let i = 0; i < lows.length; i++) {
      const j = (i + 1) % lows.length;
      const edgeWidth = Math.hypot(lows[i][0] - lows[j][0], lows[i][2] - lows[j][2]);
      const columns = Math.max(1, Math.round(edgeWidth / palette.pitch));
      const u = Math.floor(rand() * glassColumns) / glassColumns;
      const u2 = u + columns / glassColumns;
      const v2 = rowStart + floors / glassRows;
      // The perimeter points run counterclockwise from above; this keeps wall normals outside.
      triangle(surface, lows[i], lows[j], highs[i], [u, rowStart], [u2, rowStart], [u, v2]);
      triangle(surface, lows[j], highs[j], highs[i], [u2, rowStart], [u2, v2], [u, v2]);
    }
    for (let i = 1; i < highs.length - 1; i++) {
      triangle(roofBuffer, highs[0], highs[i], highs[i + 1], [0, 0], [1, 0], [1, 1]);
    }
  }

  function edgeBand(mat, x, y, z, width, depth, thickness = .15, strip = .14) {
    for (const side of [-1, 1]) {
      bar(mat, x, y, z + side * depth / 2, width, thickness, strip);
      bar(mat, x + side * width / 2, y, z, strip, thickness, depth);
    }
  }

  function lobby(x, z, y, w, d, palette, masonry) {
    const stone = masonry ? stoneMat : trimMat;
    bar(stone, x, y + .26, z, w + .75, .47, d + .75);
    const panes = 5;
    const spacing = (w * .83) / panes;
    for (const direction of [-1, 1]) {
      for (let pane = 0; pane < panes; pane++) {
        const at = x + (pane - (panes - 1) * .5) * spacing;
        bar(glass, at, y + 1.67, z + direction * (d / 2 + .07), spacing * .81, 2.13, .14);
        bar(pane % 2 === 0 ? globe : dimAccents[palette],
          at, y + 2.8, z + direction * (d / 2 + .16), spacing * .62, .10, .12);
      }
      const sideSpacing = d * .76 / 4;
      for (let pane = 0; pane < 4; pane++) {
        const at = z + (pane - 1.5) * sideSpacing;
        bar(glass, x + direction * (w / 2 + .07), y + 1.67, at, .14, 2.13, sideSpacing * .8);
        bar(dimAccents[palette], x + direction * (w / 2 + .16), y + 2.8, at, .10, .10, sideSpacing * .62);
      }
      bar(stone, x, y + 3.21, z + direction * (d / 2 + .47), w * .54, .22, 1.45);
      bar(dimAccents[palette], x, y + 3.08, z + direction * (d / 2 + 1.15), w * .43, .075, .05);
    }
  }

  function ribs(x, z, y, w, d, h, mat, pieces, width) {
    for (let i = 0; i < pieces; i++) {
      const fraction = .08 + .84 * (i / (pieces - 1));
      const atX = x - w / 2 + fraction * w;
      const atZ = z - d / 2 + fraction * d;
      for (const side of [-1, 1]) {
        bar(mat, atX, y + h / 2, z + side * (d / 2 + width * .35), width, h, width * .8);
        bar(mat, x + side * (w / 2 + width * .35), y + h / 2, atZ, width * .8, h, width);
      }
    }
  }

  const featurePalettes = [
    [0x55ffe2, 0xc9fff5], [0xff4c9d, 0xffc267], [0x9e76ff, 0x67c9ff], [0xffae52, 0xffe4b4],
  ].map(pair => pair.map(color => new THREE.MeshBasicMaterial({ color, toneMapped: false })));

  function featureTower(x, z, y, w, d, h, style, palette) {
    const [primary, secondary] = featurePalettes[style];
    const podium = 7;
    const start = y + podium;
    segment(palette, x, z, y, podium, w, d, .05);
    lobby(x, z, y, w, d, palette, false);
    const shaftWidth = w * .83, shaftDepth = d * .86;
    const shaft = (h - podium) * .79, crown = y + podium + shaft;
    segment(palette, x, z, start, shaft, shaftWidth, shaftDepth);
    if (style === 0) {
      // The taller cyan outline reads as one continuous frame from downtown.
      for (const side of [-1, 1]) for (const end of [-1, 1]) {
        bar(primary, x + side * shaftWidth / 2, start + shaft / 2,
          z + end * shaftDepth / 2, .24, shaft, .24);
      }
      edgeBand(primary, x, crown, z, shaftWidth, shaftDepth, .27, .23);
      segment(palette, x, z, crown, h - podium - shaft, w * .56, d * .59, .21, .76);
      bar(secondary, x, y + h + 3, z, .23, 6, .23);
    } else if (style === 1) {
      // Magenta and warm-white belts trace the hotel terraces and its rooftop pavilion.
      for (const fraction of [.1, .54, .59, .87, .94, 1]) {
        edgeBand(fraction === .59 || fraction === .94 ? secondary : primary,
          x, start + shaft * fraction, z, shaftWidth + .22, shaftDepth + .22, .27, .24);
      }
      const crownHeight = h - podium - shaft;
      segment(palette, x, z, crown, crownHeight, w * .68, d * .68, .07);
      edgeBand(primary, x, y + h, z, w * .68, d * .68, .32, .28);
      edgeBand(secondary, x, y + h - 2.4, z, w * .68, d * .68, .18, .19);
    } else {
      // Vertical violet or amber fins climb to three illuminated setbacks.
      ribs(x, z, start + shaft * .10, shaftWidth, shaftDepth, shaft * .9, primary, style === 2 ? 5 : 7, .21);
      const rise = (h - podium - shaft) / 3;
      for (let level = 0; level < 3; level++) {
        const scale = .79 - level * .15;
        segment(palette, x, z, crown + rise * level, rise, w * scale, d * scale);
        edgeBand(level === 1 ? primary : secondary, x, crown + rise * (level + 1),
          z, w * scale, d * scale, .24, .22);
      }
    }
  }

  function tower(x, z, width, depth, height, style, color, feature = -1) {
    const levels = [-.5, 0, .5].flatMap(a => [-.5, 0, .5].map(b => groundHeight(
      x + a * (width + .75), z + b * (depth + .75),
    )));
    const y = Math.max(...levels) + .22;
    const palette = (style * 2 + color + Math.floor(rand() * 3)) % palettes.length;
    const bright = accents[palette];
    const subdued = dimAccents[palette];
    const tall = height > 70;
    const type = feature >= 0 ? feature % featurePalettes.length : Math.floor(rand() * (tall ? 5 : 6));
    const foundation = Math.min(...levels) - .20;
    bar(type === 1 || type === 5 ? stoneMat : roofMat,
      x, (y + .3 + foundation) / 2, z, width + .55, y + .3 - foundation, depth + .55);

    if (feature >= 0) {
      featureTower(x, z, y, width, depth, height, type, palette);
      return;
    }

    if (type === 0) {
      // Deep glass spine with offset floor plates, inspired by the downtown high-rise silhouettes.
      const main = height * .84;
      const slab = height * .37;
      segment(palette, x, z, y, main, width * .81, depth, .16, 1);
      segment((palette + 5) % palettes.length, x + width * .31, z - depth * .08, y, slab, width * .38, depth * .73, .14);
      segment(palette, x - width * .04, z, y + main, height - main, width * .58, depth * .79, .21);
      const edge = width * .40;
      for (const side of [-1, 1]) {
        bar(subdued, x + side * edge, y + main * .54, z + depth * .47, .13, main * .78, .16);
      }
      bar(bright, x - width * .04, y + height + .27, z + depth * .37, width * .51, .23, .19);
      lobby(x, z, y, width * .80, depth, palette, false);
    } else if (type === 1) {
      // Warm masonry setbacks rise to an illuminated stone lantern.
      const main = height * .68, shoulder = height * .22;
      segment(palette, x, z, y, main, width, depth, .06);
      ribs(x, z, y + 3.46, width, depth, main - 3.46, stoneMat, 6, .22);
      edgeBand(stoneMat, x, y + main, z, width + .35, depth + .35, .34, .47);
      segment(palette, x, z, y + main, shoulder, width * .77, depth * .77, .11);
      edgeBand(subdued, x, y + main + shoulder, z, width * .77, depth * .77, .13, .20);
      segment(palette, x, z, y + main + shoulder, height * .10, width * .48, depth * .46, .12, .76);
      if (tall) {
        segment(palette, x, z, y + height, height * .105, width * .36, depth * .35, .14, .26);
        bar(globe, x, y + height * 1.11, z, .57, .6, .57);
      }
      lobby(x, z, y, width, depth, palette, true);
    } else if (type === 2) {
      // Tapered rain-glass envelope with a distinct crown and diagonal upper setback.
      const podium = 5.2 + height * .06;
      segment((palette + 5) % palettes.length, x, z, y, podium, width, depth, .16);
      const middle = height * .72;
      segment(palette, x, z, y + podium, middle, width * .88, depth * .84, .30, .81, -width * .039);
      segment(palette, x - width * .039, z, y + podium + middle, Math.max(2.6, height - podium - middle),
        width * .715, depth * .684, .34, .71, width * .054);
      const upper = y + height;
      bar(bright, x + width * .012, upper + .09, z + depth * .24, width * .35, .20, .20);
      bar(subdued, x + width * .012, upper + .06, z - depth * .24, width * .35, .13, .13);
      lobby(x, z, y, width, depth, palette, false);
    } else if (type === 3) {
      // Paired shafts, a taller lit balcony stack on one side, and metal spandrels on the other.
      const podium = height * .19;
      segment(palette, x, z, y, podium, width, depth, .09);
      segment(palette, x - width * .18, z, y + podium, height - podium, width * .59, depth * .79, .14);
      segment((palette + 1) % palettes.length, x + width * .24, z + depth * .055, y + podium, height * .59, width * .48, depth * .71, .16);
      for (let i = 1; i <= 4; i++) {
        bar(i === 4 ? bright : subdued, x + width * .22,
          y + podium + height * .13 * i, z + depth * .411, width * .36, .158, .22);
      }
      edgeBand(trimMat, x - width * .18, y + height, z, width * .59, depth * .79, .15, .33);
      bar(bright, x - width * .18, y + height + .11, z + depth * .39, width * .47, .14, .18);
      lobby(x, z, y, width, depth, palette, true);
    } else if (type === 4) {
      // Concrete office grid with a lower garden terrace and staggered lantern floors.
      const mid = height * .42;
      segment(palette, x, z, y, mid, width, depth, .06);
      segment(palette, x - width * .11, z, y + mid, height * .35, width * .77, depth * .89, .08);
      segment((palette + 1) % palettes.length, x - width * .13, z - depth * .092, y + height * .77,
        height * .23, width * .62, depth * .64, .12);
      edgeBand(trimMat, x, y + mid, z, width, depth, .22, .38);
      edgeBand(subdued, x - width * .11, y + height * .772, z, width * .77, depth * .89);
      bar(bright, x - width * .13, y + height + .12, z - depth * .404, width * .54, .15, .15);
      lobby(x, z, y, width, depth, palette, false);
    } else {
      // Lower brick lofts with pronounced cornices contrast against the glass towers.
      const band = height * .84;
      segment(palette, x, z, y, band, width, depth, .08);
      ribs(x, z, y + 3.45, width, depth, band - 3.45, stoneMat, 4, .17);
      edgeBand(stoneMat, x, y + band, z, width + .37, depth + .37, .49, .48);
      segment(palette, x + width * .035, z, y + band, height * .16, width * .72, depth * .68, .08);
      bar(subdued, x + width * .035, y + height + .12, z + depth * .34, width * .58, .12, .14);
      lobby(x, z, y, width, depth, palette, true);
    }

    if (rand() > .32) {
      const roofBase = type === 0 ? .54 : .43;
      bar(roofMat, x + width * .08, y + height + .76, z,
        width * .27, 1.37, depth * roofBase);
      const service = rand() > .58;
      if (service) bar(trimMat, x - width * .08, y + height + .51, z - depth * .11, .85, .93, 1.38);
    }
  }

  function addMerged(name, buffer, material) {
    if (!buffer.position.length) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(buffer.position, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(buffer.uv, 2));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    scene.add(mesh);
  }

  function finish() {
    facadeBuffers.forEach((buffer, i) => addMerged('Skyline façade ' + (i + 1), buffer, mats[i]));
    addMerged('Skyline roofs', roofBuffer, roofMat);
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3(), scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (const [material, pieces] of batches) {
      const mesh = new THREE.InstancedMesh(geometry, material, pieces.length);
      for (let i = 0; i < pieces.length; i++) {
        const [x, y, z, w, h, d, yaw] = pieces[i];
        matrix.compose(position.set(x, y, z), quaternion.setFromAxisAngle(up, yaw), scale.set(w, h, d));
        mesh.setMatrixAt(i, matrix);
      }
      mesh.name = 'Skyline architectural detail';
      mesh.computeBoundingSphere();
      scene.add(mesh);
    }
  }

  return { tower, finish };
}
