import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

// --- Zmienne globalne ---
let scene, camera, renderer, controls;
const models = [];
let modelDisplayNames = []; // POPRAWKA: Prawidłowa nazwa zmiennej
let currentModelIndex = 0;

// --- Inicjalizacja ---
init();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );
  camera.position.set(0, 5, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(50, 50, 50).normalize();
  scene.add(directionalLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  new RGBELoader()
    .setPath("assets/")
    .load("minedump_flats_4k.hdr", function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
      scene.environment = texture;
      loadModels();
    });

  animate();
  window.addEventListener("resize", onWindowResize);
}

async function loadModels() {
  const loader = new GLTFLoader();
  const dateDisplay = document.getElementById("date-display");

  try {
    const response = await fetch("models.json");
    const modelEntries = await response.json();

    modelEntries.sort((a, b) => a.file.localeCompare(b.file));

    // Teraz ta linijka będzie działać poprawnie
    modelDisplayNames = modelEntries.map((entry) => entry.displayName);

    const loadingPromises = modelEntries.map((entry) =>
      loader.loadAsync(`models/${entry.file}`)
    );

    const loadedGltfs = await Promise.all(loadingPromises);

    loadedGltfs.forEach((gltf, index) => {
      const model = gltf.scene;
      models[index] = model;
      model.visible = index === 0;
      scene.add(model);
    });

    setupSlider(modelEntries.length);
    focusCameraOnScene();
    updateDateDisplay(0);
  } catch (error) {
    console.error("Błąd podczas ładowania modeli:", error);
    dateDisplay.textContent = "Błąd ładowania modeli!";
  }
}

function updateDateDisplay(index) {
  const dateDisplay = document.getElementById("date-display");
  if (modelDisplayNames[index]) {
    dateDisplay.textContent = modelDisplayNames[index];
  }
}

function setupSlider(modelCount) {
  const slider = document.getElementById("slider");
  slider.min = 0;
  slider.max = modelCount - 1;
  slider.value = 0;

  slider.addEventListener("input", (event) => {
    const index = parseInt(event.target.value);
    showModel(index);
    updateDateDisplay(index);
  });
}

function showModel(index) {
  if (currentModelIndex === index) return;

  if (models[currentModelIndex]) {
    models[currentModelIndex].visible = false;
  }
  if (models[index]) {
    models[index].visible = true;
  }

  currentModelIndex = index;
}

function focusCameraOnScene() {
  const box = new THREE.Box3();

  for (const model of models) {
    if (model) {
      box.expandByObject(model);
    }
  }

  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  controls.target.copy(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  cameraZ *= 1.7;

  camera.position.set(center.x, center.y + size.y / 2, center.z + cameraZ);
  camera.lookAt(center);

  controls.update();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
