import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

// === Global variables ===
let scene, camera, renderer, controls;
const models = [];
let modelEntries = [];
const separationDistance = 0.5; // adjust layer spacing (in your model units)

// === Init ===
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

  // === Lights ===
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(50, 50, 50).normalize();
  scene.add(dirLight);

  // === Controls ===
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // === Environment (HDRI) ===
  new RGBELoader()
    .setPath("assets/")
    .load("minedump_flats_4k.hdr", (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
      scene.environment = texture;
      loadModels();
    });

  animate();
  window.addEventListener("resize", onWindowResize);
}

// === Load models from JSON ===
async function loadModels() {
  const loader = new GLTFLoader();
  const dateDisplay = document.getElementById("date-display");
  const checkboxContainer = document.getElementById("checkboxContainer");

  try {
    const response = await fetch("models.json");
    modelEntries = await response.json();

    modelEntries.sort((a, b) => a.file.localeCompare(b.file));

    // Load all models in parallel
    const loadingPromises = modelEntries.map((entry) =>
      loader.loadAsync(`models/${entry.file}`)
    );

    const loadedGltfs = await Promise.all(loadingPromises);

    loadedGltfs.forEach((gltf, index) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = child.receiveShadow = true;
        }
      });
      model.userData.index = index;
      model.visible = true;
      scene.add(model);
      models.push(model);

      // === UI: create checkbox for this layer ===
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `layer${index}`;
      checkbox.checked = true;
      checkbox.addEventListener("change", () => {
        model.visible = checkbox.checked;
      });

      const label = document.createElement("label");
      label.htmlFor = checkbox.id;
      label.textContent = modelEntries[index].displayName || `Layer ${index + 1}`;

      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(label);
    });

    setupSlider();
    focusCameraOnScene();
    dateDisplay.textContent = "Wizualizacja warstw gotowa.";
  } catch (error) {
    console.error("Błąd podczas ładowania modeli:", error);
    dateDisplay.textContent = "Błąd ładowania modeli!";
  }
}

// === Slider logic (layer separation) ===
function setupSlider() {
  const slider = document.getElementById("slider");
  slider.min = 0;
  slider.max = 1;
  slider.step = 0.01;
  slider.value = 0;

  slider.addEventListener("input", (event) => {
    const value = parseFloat(event.target.value);
    updateLayerPositions(value);
  });
}

// === Move layers apart based on slider ===
function updateLayerPositions(value) {
  models.forEach((model, i) => {
    model.position.y = i * value * separationDistance;
  });
}

// === Auto-fit camera to scene ===
function focusCameraOnScene() {
  const box = new THREE.Box3();
  for (const model of models) {
    if (model) box.expandByObject(model);
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

// === Render loop ===
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
