import { fromEvent } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { vec3, vec4 } from 'gl-matrix';

import {
  ArcRotationCameraController,
  Camera,
  createGrid,
  loadObj,
  Renderer,
  Transform
} from '../graphics';

import {
  vertex as flatVertex,
  fragment as flatFragment
} from '../shaders/flat';

import { Sphere } from '../shape';
import { epa } from '../epa';
import { createMeshFromPolytop } from '../mesh';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer(
  canvas.getContext('webgl2', {
    preserveDrawingBuffer: true
  })
);
const flatShader = renderer.createShader(flatVertex, flatFragment);
const gridGeometry = renderer.createGeometry(
  createGrid(),
  WebGL2RenderingContext.LINES
);

const simplex = new Set<vec3>([
  vec3.fromValues(1.0, 1.0, 1.0),
  vec3.fromValues(1.0, 1.0, -1.0),
  vec3.fromValues(-1.0, 1.0, -1.0),
  vec3.fromValues(1.0, -1.0, 1.0)
]);

let polytop = epa.polytopFromSimplex(simplex);
const camera = new Camera(45.0, canvas.width / canvas.height, 0.25, 100.0);
camera.position = [5.0, 5.0, 5.0];
const cameraController = new ArcRotationCameraController(canvas, camera);

const drawables = [
  {
    material: {
      shader: flatShader,
      uniforms: { albedo: vec4.fromValues(0.0, 0.0, 0.0, 1.0) },
      state: {}
    },
    geometry: gridGeometry,
    transform: new Transform()
  },
  {
    material: {
      shader: flatShader,
      uniforms: { albedo: vec4.fromValues(0.0, 0.0, 0.0, 1.0) },
      state: {}
    },
    geometry: renderer.createGeometry(
      createMeshFromPolytop(polytop),
      WebGL2RenderingContext.LINES
    ),
    transform: new Transform()
  }
];

const shape = new Sphere(1.0, new Transform());

fromEvent(canvas, 'mousedown').subscribe();

// Loop

const draw = () => {
  cameraController.update();
  renderer.setRenderTarget(null);
  renderer.clear();

  for (const drawable of drawables) {
    renderer.drawGeometry(camera, drawable);
  }

  //

  requestAnimationFrame(draw);
};
draw();
