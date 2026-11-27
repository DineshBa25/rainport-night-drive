import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const modelURL = import.meta.env.BASE_URL + 'integra.glb';

const cameras = {
  Front: [3.8, 2.08, 5.25],
  Side: [6.9, 1.52, 0],
  Rear: [4, 2.15, -5.4],
  Top: [2.4, 7.35, 2.85],
};

const studios = {
  Softbox: { upper: 0xf5f5ff, lower: 0xb8bdca, key: 0xfff4e7, rim: 0xd9edff, intensity: .78 },
  Daylight: { upper: 0xd5e7ff, lower: 0xe1ddce, key: 0xffedce, rim: 0xeaf6ff, intensity: 1.05 },
  Night: { upper: 0x424874, lower: 0x353046, key: 0xafb8ff, rim: 0xe0a4ff, intensity: 1.08 },
};

const photoStudio = { upper: 0xfcfbfa, lower: 0xaeadab, key: 0xfffaf7, rim: 0xf0f2fa, intensity: .94 };

function makeStudio(preset) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(preset.lower).multiplyScalar(.55);
  const panel = (color, intensity, position, scale) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) }));
    box.position.set(...position);
    box.scale.set(...scale);
    studio.add(box);
  };
  if (preset === photoStudio) {
    panel(0xffffff, 3.5, [-2.52, 4.05, .40], [.89, .12, 9]);
    panel(0xffffff, 4.2, [2.1, 4.1, .6], [1.02, .12, 7.3]);
    panel(0xf8f9ff, 3.15, [-.67, 4.2, 1.8], [.61, .10, 4.3]);
    panel(0xffffff, 3.65, [.35, 3.86, 3.72], [3.6, .10, .66]);
    panel(0xf5f2ef, 1.55, [0, 3.2, -6], [9, 2.4, .18]);
    panel(0xffffff, .75, [0, 3.5, 5.7], [7.5, .70, .18]);
    return studio;
  }
  panel(preset.upper, 1.6, [0, 5, 0], [11, .2, 7]);
  panel(preset.key, 3.4, [-4, 3, 4], [.45, 2.4, 7]);
  panel(preset.rim, 3.05, [4, 2.6, -3], [.35, 1.4, 7]);
  panel(preset.upper, 1.5, [0, 2.5, -7], [8, 3.8, .45]);
  return studio;
}

function groundShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 63);
  gradient.addColorStop(0, 'rgba(0,0,0,.97)');
  gradient.addColorStop(.47, 'rgba(0,0,0,.75)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.85, 6.35),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -.012;
  return shadow;
}

function disposeTree(root) {
  const materials = new Set(), textures = new Set();
  root.traverse(object => {
    object.geometry?.dispose();
    if (object.material) for (const material of [].concat(object.material)) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    material.dispose();
  }
  for (const texture of textures) texture.dispose();
}

export function createViewer(host, onStatus, onOrbit) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .84;
  renderer.domElement.setAttribute('aria-label', '3D Acura Integra. Drag to orbit or use arrow keys. Scroll to zoom.');
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('role', 'img');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(groundShadow());
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 50);
  const focus = new THREE.Vector3(0, .68, 0);
  camera.position.fromArray(cameras.Front);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(focus);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 2.9;
  controls.maxDistance = 15;
  controls.minPolarAngle = .11;
  controls.maxPolarAngle = Math.PI / 2 - .035;
  controls.autoRotateSpeed = 1.1;
  controls.update();

  const fill = new THREE.HemisphereLight(0xf4f4ff, 0x676768, 1.7);
  const key = new THREE.DirectionalLight(0xfff4e7, 2.5);
  key.position.set(-4, 6, 4);
  const rim = new THREE.DirectionalLight(0xd9edff, 1.9);
  rim.position.set(4, 3, -4);
  scene.add(fill, key, rim);

  const generator = new THREE.PMREMGenerator(renderer);
  const environments = new Map();
  let car, animation, closed = false, transition, wireframe = false, reference;
  const materialSet = new Set();
  let previousFrame = performance.now();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setStudio(name) {
    const preset = name === 'Photo studio' ? photoStudio : studios[name];
    if (!environments.has(name)) {
      const studio = makeStudio(preset);
      environments.set(name, generator.fromScene(studio, .045));
      disposeTree(studio);
    }
    scene.environment = environments.get(name).texture;
    scene.environmentIntensity = preset.intensity;
    key.color.setHex(preset.key);
    rim.color.setHex(preset.rim);
    fill.intensity = name === 'Night' ? .78 : name === 'Photo studio' ? 1.64 : 1.32;
    key.intensity = name === 'Night' ? 1.45 : name === 'Photo studio' ? 1.09 : 1.82;
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.fov = camera.aspect < 1.24 ? Math.min(59, 35 * 1.24 / camera.aspect) : 35;
    if (reference) {
      const { focalY, center: [xCenter, yCenter] } = reference.framing;
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(.5 / focalY));
      camera.updateProjectionMatrix();
      camera.projectionMatrix.elements[8] = 1 - 2 * xCenter;
      camera.projectionMatrix.elements[9] = 1 - 2 * yCenter;
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    } else camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  setStudio('Softbox');
  const home = new THREE.Spherical();
  const current = new THREE.Spherical();
  const vector = new THREE.Vector3();
  controls.addEventListener('start', () => { transition = undefined; onOrbit(); });
  const keyboard = event => {
    if (reference || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    transition = undefined;
    onOrbit();
    current.setFromVector3(vector.copy(camera.position).sub(controls.target));
    const rotation = .105;
    current.theta += event.key === 'ArrowLeft' ? -rotation : event.key === 'ArrowRight' ? rotation : 0;
    current.phi = THREE.MathUtils.clamp(current.phi + (event.key === 'ArrowUp' ? -rotation : event.key === 'ArrowDown' ? rotation : 0),
      controls.minPolarAngle, controls.maxPolarAngle);
    camera.position.copy(vector.setFromSpherical(current).add(controls.target));
    controls.update();
  };
  renderer.domElement.addEventListener('keydown', keyboard);

  new GLTFLoader().load(modelURL, result => {
    if (closed) { disposeTree(result.scene); return; }
    car = result.scene;
    car.traverse(object => {
      if (object.isMesh) for (const material of [].concat(object.material)) {
        materialSet.add(material);
        material.wireframe = wireframe;
      }
    });
    scene.add(car);
    onStatus('ready');
  }, undefined, () => { if (!closed) onStatus('error'); });

  function tick(now) {
    animation = requestAnimationFrame(tick);
    const delta = Math.min((now - previousFrame) / 1000, .06);
    previousFrame = now;
    if (transition) {
      transition.elapsed += delta;
      const t = Math.min(1, transition.elapsed / .57);
      const ease = 1 - (1 - t) ** 3;
      current.set(
        THREE.MathUtils.lerp(transition.start.radius, home.radius, ease),
        THREE.MathUtils.lerp(transition.start.phi, home.phi, ease),
        THREE.MathUtils.lerp(transition.start.theta, home.theta, ease),
      );
      camera.position.copy(vector.setFromSpherical(current).add(focus));
      if (t === 1) transition = undefined;
    }
    if (!reference) controls.update(delta);
    renderer.render(scene, camera);
  }
  animation = requestAnimationFrame(tick);

  return {
    compare(next) {
      reference = next;
      controls.enabled = !next;
      renderer.domElement.tabIndex = next ? -1 : 0;
      renderer.domElement.setAttribute('aria-label', next
        ? '3D Acura Integra aligned to the ' + next.name + ' reference'
        : '3D Acura Integra. Drag to orbit or use arrow keys. Scroll to zoom.');
      controls.autoRotate = false;
      transition = undefined;
      if (next) {
        const [x, y, z] = next.eye;
        camera.position.set(z, y, x);
        controls.target.set(0, .72, 0);
        camera.lookAt(controls.target);
        setStudio('Photo studio');
      } else {
        camera.position.fromArray(cameras.Front);
        controls.target.copy(focus);
        controls.update();
      }
      resize();
    },
    camera(name) {
      home.setFromVector3(vector.fromArray(cameras[name]).sub(focus));
      const start = new THREE.Spherical().setFromVector3(vector.copy(camera.position).sub(focus));
      home.theta = start.theta + Math.atan2(Math.sin(home.theta - start.theta), Math.cos(home.theta - start.theta));
      if (reducedMotion.matches) camera.position.fromArray(cameras[name]);
      else transition = { start, elapsed: 0 };
    },
    studio: setStudio,
    spin(active) { controls.autoRotate = active; },
    wireframe(active) {
      wireframe = active;
      for (const material of materialSet) material.wireframe = active;
    },
    dispose() {
      closed = true;
      cancelAnimationFrame(animation);
      observer.disconnect();
      controls.dispose();
      disposeTree(scene);
      for (const environment of environments.values()) environment.dispose();
      generator.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
