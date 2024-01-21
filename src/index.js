import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "@fontsource/press-start-2p";

require("./main.css");

// Constants.
const GIRL_JUMP_SPEED = 20;

const TREES_SPAWN_X = 20;
const TREES_MAX_SCALE = 1;
const TREES_MIN_SCALE = 0.5;
const TREES_SPAWN_MAX_INTERVAL = 2;
const TREES_SPAWN_MIN_INTERVAL = 2;

const BIRD_MIN_Y = 5;
const BIRD_MAX_Y = 6;
const BIRD_SPAWN_X = -5;
const BIRD_SPAWN_INTERVAL = 14;
const BIRD_SPEED = 2;

const GRAVITY = -52;
const FLOOR_SPEED = -10;
const SKYSPHERE_ROTATE_SPEED = 0.02;
const SCORE_INCREASE_SPEED = 20;

// Global variables.
const scene = new THREE.Scene();
let infoElement;
const clock = new THREE.Clock();
const mixers = [];
let girl;
let trees;
let floor;
let bird;
let skySphere;
let directionalLight;
let jump = false;
let vel = 0;
let nextTreesSpawnTime = 0;
let nextBirdResetTime = 0;
let score = 0;
let isGameOver = true;
const treesGroup = new THREE.Group();
scene.add(treesGroup);
let renderer;
let camera;

function createInfoElement() {
  infoElement = document.createElement("div");
  infoElement.id = "info";
  infoElement.innerHTML = "Press any key to start!";
  document.body.appendChild(infoElement);
}
createInfoElement();

function createCamera() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(-3, 1, 10);
  camera.lookAt(3, 3, 0);
}
createCamera();

function createRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.body.appendChild(renderer.domElement);
}
createRenderer();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  update(delta);

  renderer.render(scene, camera);
}
animate();

function createLighting() {
  directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  scene.add(directionalLight);

  const light = new THREE.AmbientLight(0x7f7f7f); // soft white light
  scene.add(light);
}
createLighting();

function load3DModels() {
  // Instantiate a loader.
  const loader = new GLTFLoader();

  // Load T-Rex model.
  loader.load(
    "models/girl/scene.gltf",
    function (gltf) {
      girl = gltf.scene;

      girl.scale.setScalar(0.02);
      girl.rotation.y = Math.PI / 2;

      scene.add(girl);

      const mixer = new THREE.AnimationMixer(girl);
      const clip = THREE.AnimationClip.findByName(gltf.animations, "CINEMA_4D___");
      if (clip) {
        const action = mixer.clipAction(clip);
        action.play();
      }
      mixers.push(mixer);
    },
  );
  loader.load(
    "models/fox/scene.gltf",
    function (gltf) {
      let fox = gltf.scene;

      fox.scale.setScalar(0.03);
      fox.position.x = -1.5
      fox.rotation.y = Math.PI / -6;

      scene.add(fox);

      const mixer = new THREE.AnimationMixer(fox);
      const clip = THREE.AnimationClip.findByName(gltf.animations, "GltfAnimation 0");
      if (clip) {
        const action = mixer.clipAction(clip);
        action.play();
      }
      mixers.push(mixer);
    },
  );

  // Load bird (flying) model.
  loader.load("models/bird/scene.gltf", function (gltf) {
    bird = gltf.scene;

    bird.rotation.y = Math.PI / 3;
    bird.scale.multiplyScalar(0.5);

    respawnBird();

    scene.add(bird);

    const mixer = new THREE.AnimationMixer(bird);
    const clip = THREE.AnimationClip.findByName(gltf.animations, "Take 001");
    const action = mixer.clipAction(clip);
    action.play();
    mixers.push(mixer);
  });

  loader.load(
    "models/trees/scene.gltf",
    function (gltf) {
      gltf.scene.scale.setScalar(0.5);
      gltf.scene.rotation.y = -Math.PI / 2;

      trees = gltf.scene;
    }
  );
}
load3DModels();

function createFloor() {
  const geometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
  const texture = THREE.ImageUtils.loadTexture("ground.jpg");
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(100, 100);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xc4733b,
  });

  floor = new THREE.Mesh(geometry, material);
  floor.material.side = THREE.DoubleSide;
  floor.rotation.x = -Math.PI / 2;

  floor.castShadow = false;
  floor.receiveShadow = true;

  scene.add(floor);
}
createFloor();

function createSkySphere(file) {
  const geometry = new THREE.SphereGeometry(500, 60, 40);
  // Invert the geometry on the x-axis so that all of the faces point inward
  geometry.scale(-1, 1, 1);

  const texture = new THREE.TextureLoader().load(file);
  // texture.encoding = THREE.sRGBEncoding;
  const material = new THREE.MeshBasicMaterial({ map: texture });
  skySphere = new THREE.Mesh(geometry, material);

  scene.add(skySphere);
}
createSkySphere("desert2.jpg");

function enableShadow(renderer, light) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  light.castShadow = true;

  //Set up shadow properties for the light
  light.shadow.mapSize.width = 512;
  light.shadow.mapSize.height = 512;
  light.shadow.camera.near = 0.001;
  light.shadow.camera.far = 500;
}
enableShadow(renderer, directionalLight);

function handleInput() {
  const callback = () => {
    if (isGameOver) {
      restartGame();
      return;
    }

    jump = true;
  };

  document.addEventListener("keydown", callback, false);
  renderer.domElement.addEventListener("touchstart", callback);
  renderer.domElement.addEventListener("click", callback);
}
handleInput();

function handleWindowResize() {
  window.addEventListener(
    "resize",
    () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
    },
    false
  );
}
handleWindowResize();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function gameOver() {
  isGameOver = true;

  infoElement.innerHTML = "GAME OVER";
}

function restartGame() {
  isGameOver = false;
  score = 0;

  respawnBird();

  treesGroup.children.length = 0;
}

function respawnBird() {
  nextBirdResetTime = clock.elapsedTime + BIRD_SPAWN_INTERVAL;
  bird.position.x = BIRD_SPAWN_X;
  bird.position.y = randomFloat(BIRD_MIN_Y, BIRD_MAX_Y);
}

function update(delta) {
  if (!trees) return;
  if (!girl) return;
  if (!floor) return;
  if (!bird) return;
  if (isGameOver) return;

  for (const mixer of mixers) {
    mixer.update(delta);
  }

  // T-rex jump.
  if (jump) {
    jump = false;

    // Start jumpping only when T-rex is on the ground.
    if (girl.position.y == 0) {
      vel = GIRL_JUMP_SPEED;
      girl.position.y = vel * delta;
    }
  }

  if (girl.position.y > 0) {
    vel += GRAVITY * delta;
    girl.position.y += vel * delta;
  } else {
    girl.position.y = 0;
  }

  // Spawn new cacti.
  if (clock.elapsedTime > nextTreesSpawnTime) {
    const interval = randomFloat(
      TREES_SPAWN_MIN_INTERVAL,
      TREES_SPAWN_MAX_INTERVAL
    );

    nextTreesSpawnTime = clock.elapsedTime + interval;

    const numTrees = randomInt(3, 5);
    for (let i = 0; i < numTrees; i++) {
      const clone = trees.clone();
      clone.position.x = TREES_SPAWN_X + i * 0.5;
      clone.scale.multiplyScalar(
        randomFloat(TREES_MIN_SCALE, TREES_MAX_SCALE)
      );

      treesGroup.add(clone);
    }
  }

  // Move cacti.
  for (const trees of treesGroup.children) {
    trees.position.x += FLOOR_SPEED * delta;
  }

  // Check collision. GIRL Shape
  const girlAABB = new THREE.Box3(
    new THREE.Vector3(-1, girl.position.y, 0),
    new THREE.Vector3(0, girl.position.y + 2, 0)
  );

  for (const trees of treesGroup.children) {
    const treesAABB = new THREE.Box3();
    treesAABB.setFromObject(trees);

    if (treesAABB.intersectsBox(girlAABB)) {
      gameOver();
      return;
    }
  }

  // Update texture offset to simulate floor moving.
  floor.material.map.offset.add(new THREE.Vector2(delta, 0));

  girl.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = false;
  });

  if (skySphere) {
    skySphere.rotation.y += delta * SKYSPHERE_ROTATE_SPEED;
  }

  if (clock.elapsedTime > nextBirdResetTime) {
    respawnBird();
  } else {
    bird.position.x += delta * BIRD_SPEED;
  }

  score += delta * SCORE_INCREASE_SPEED;
  infoElement.innerHTML = Math.floor(score).toString().padStart(5, "0");
}
