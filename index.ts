import './style.css';

import { fromEvent } from 'rxjs';
import { map, filter } from 'rxjs/operators';

import {
  ArcRotationCameraController,
  Camera,
  createGrid,
  loadObj,
  Renderer,
  Transform
} from './graphics';

import {
  vertex as phongVertex,
  fragment as phongFragment
} from './shaders/phong';

import { vertex as flatVertex, fragment as flatFragment } from './shaders/flat';

import monkey from './objects/monkey.obj';
import { vec3, vec4 } from 'gl-matrix';
import { AxesController } from './graphics/gizmos/axes-controller';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const renderer = new Renderer(
  canvas.getContext('webgl2', {
    preserveDrawingBuffer: true
  })
);
const phongShader = renderer.createShader(phongVertex, phongFragment);
const flatShader = renderer.createShader(flatVertex, flatFragment);
const meshes = loadObj(monkey);
console.log(meshes);
const objGeometry = renderer.createGeometry(meshes['Suzanne']);
const gridGeometry = renderer.createGeometry(
  createGrid(),
  WebGL2RenderingContext.LINES
);

const camera = new Camera(45.0, canvas.width / canvas.height, 0.25, 100.0);
camera.position = [5.0, 5.0, 5.0];
const cameraController = new ArcRotationCameraController(canvas, camera);
const idFrameBuffer = renderer.createIdRenderTarget();
const drawables = [
  {
    material: {
      shader: phongShader,
      uniforms: {
        albedo: vec4.fromValues(0.8, 0.8, 0.8, 1.0)
      },
      state: { cullFace: false }
    },
    geometry: objGeometry,
    transform: new Transform(vec3.create(), vec3.fromValues(0.1, 0.1, 0.1))
  },
  {
    material: {
      shader: flatShader,
      uniforms: { albedo: vec4.fromValues(0.0, 0.0, 0.0, 1.0) },
      state: {}
    },
    geometry: gridGeometry,
    transform: new Transform()
  }
];
const axesController = new AxesController(
  renderer,
  camera,
  drawables[0].transform
);

fromEvent(document, 'keydown')
  .pipe(
    filter((e: KeyboardEvent) => ['q', 'w', 'e'].includes(e.key)),
    map(
      (e: KeyboardEvent) => ({ q: 'none', w: 'movement', e: 'rotation' }[e.key])
    )
  )
  .subscribe(mode => (axesController.mode = mode));
// Loop
let t = Date.now();
let dt = 0.0;
const draw = () => {
  cameraController.update();
  renderer.setRenderTarget(null);
  renderer.clear();

  for (const drawable of drawables) {
    renderer.drawGeometry(camera, drawable);
  }
  renderer.clear(WebGL2RenderingContext.DEPTH_BUFFER_BIT);
  axesController.draw('viewport');

  renderer.setRenderTarget(idFrameBuffer);
  renderer.clear();
  axesController.draw('id');
  const pixes = renderer.readAsIdMap();
  axesController.update(pixes);

  requestAnimationFrame(draw);
  dt = (Date.now() - t) * 1.0e-3;
  t = Date.now();
};
draw();
