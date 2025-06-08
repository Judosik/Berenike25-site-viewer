import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'; // <-- NOWY IMPORT

// --- Zmienne globalne ---
let scene, camera, renderer, controls;
const models = [];
let modelDates = [];
let currentModelIndex = 0;


// --- Inicjalizacja ---
init();

/**
 * Główna funkcja inicjująca scenę, renderer, oświetlenie i kontrolery.
 */
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 5, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // ZMIANA: Dodajemy Tone Mapping dla kinowego wyglądu
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0; // Możesz eksperymentować z tą wartością

    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(50, 50, 50).normalize();
    scene.add(directionalLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // ZMIANA: Używamy RGBELoader do wczytania tła HDR
    // Pamiętaj, aby podmienić ścieżkę na prawdziwą i użyć pliku .hdr
    new RGBELoader()
        .setPath('assets/') // Ustawia domyślną ścieżkę dla loadera
        .load('minedump_flats_4k.hdr', function (texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.background = texture;
            scene.environment = texture; // Kluczowe dla realistycznych odbić!

            // Dopiero po załadowaniu tła, ładujemy modele
            loadModels();
        });

    animate();
    window.addEventListener('resize', onWindowResize);
}

/**
 * Asynchronicznie wczytuje modele na podstawie pliku models.json.
 */
async function loadModels() {
    const loader = new GLTFLoader();
    const dateDisplay = document.getElementById('date-display');

    try {
        const response = await fetch('models.json');
        const fileList = await response.json();
        fileList.sort();
        modelDates = fileList.map(filename => filename.replace('.glb', ''));

        // Przygotowujemy tablicę na wszystkie obietnice ładowania i kompilacji
        const setupPromises = fileList.map(filename => 
            loader.loadAsync(`models/${filename}`).then(async (gltf) => {
                // ZMIANA: Pre-kompilacja shaderów, aby uniknąć zacięcia
                await renderer.compileAsync(gltf.scene, camera, scene);
                return gltf; // Zwróć gltf, aby można go było dalej przetwarzać
            })
        );
        
        const loadedGltfs = await Promise.all(setupPromises);

        loadedGltfs.forEach((gltf, index) => {
            const model = gltf.scene;
            models[index] = model;
            model.visible = (index === 0);
            scene.add(model);
        });

        setupSlider(fileList.length);
        focusCameraOnScene();
        updateDateDisplay(0);

    } catch (error) {
        console.error('Błąd podczas ładowania modeli:', error);
        dateDisplay.textContent = 'Błąd ładowania modeli!';
    }
}

/**
 * Konfiguruje suwak na podstawie liczby modeli.
 * @param {number} modelCount - Liczba wczytanych modeli.
 */
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

/**
 * Przełącza widoczność modeli.
 * @param {number} index - Indeks modelu do pokazania.
 */
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

/**
 * Aktualizuje etykietę z numerem dnia i datą.
 * @param {number} index - Indeks bieżącego modelu.
 */
function updateDateDisplay(index) {
  const dateDisplay = document.getElementById("date-display");
  if (modelDates[index]) {
    const dayNumber = index + 1;
    const date = modelDates[index];
    dateDisplay.textContent = `Dzień pomiarowy ${dayNumber} (${date})`;
  }
}

/**
 * Automatycznie ustawia kamerę i kontrolery, aby objąć całą scenę.
 */
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

  // Ustaw cel kontrolerów na środek wszystkich modeli
  controls.target.copy(center);

  // Oblicz odpowiednią odległość kamery
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  cameraZ *= 1.7; // Dodatkowy margines, aby modele nie stykały się z krawędziami

  // Ustaw pozycję kamery
  camera.position.set(center.x, center.y + size.y / 2, center.z + cameraZ);
  camera.lookAt(center);

  controls.update();
}

/**
 * Pętla animacji.
 */
function animate() {
  requestAnimationFrame(animate);
  controls.update(); // Potrzebne dla 'enableDamping'
  renderer.render(scene, camera);
}

/**
 * Obsługa zmiany rozmiaru okna przeglądarki.
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
