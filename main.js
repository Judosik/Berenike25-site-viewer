import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.153.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.153.0/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer, controls;
let models = [];
let currentModelIndex = 0;

init();
loadModels();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.5, 3);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(5, 5, 5).normalize();
  scene.add(directionalLight);

  // Replace with your spherical environment image path
  const environmentTexture = new THREE.TextureLoader().load('path/to/spherical-photo.jpg');
  scene.background = environmentTexture;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  document.getElementById('slider').addEventListener('input', (event) => {
    const index = parseInt(event.target.value);
    showModel(index);
  });

  animate();
}

function loadModels() {
  const loader = new GLTFLoader();
  for (let i = 0; i < 10; i++) {
    loader.load(`path/to/day${i}.glb`, (gltf) => {
      models[i] = gltf.scene;
      if (i === 0) scene.add(models[0]); // Show the first model initially
    });
  }
}

function showModel(index) {
  if (models[currentModelIndex]) scene.remove(models[currentModelIndex]);
  if (models[index]) scene.add(models[index]);
  currentModelIndex = index;
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
