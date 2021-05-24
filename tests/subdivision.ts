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

import {
  vertex as phongVertex,
  fragment as phongFragment
} from '../shaders/phong';

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
const phongShader = renderer.createShader(phongVertex, phongFragment);
const gridGeometry = renderer.createGeometry(
  createGrid(),
  WebGL2RenderingContext.LINES
);

const simplex = new Set<vec3>([
  vec3.fromValues(-1.0 + 0.25, 1.0, 1.0),
  vec3.fromValues(1.0 + 0.25, 1.0, -1.0),
  vec3.fromValues(1.0 + 0.25, -1.0, 1.0),
  vec3.fromValues(-1.0 + 0.25, -1.0, -1.0)
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
      shader: phongShader,
      uniforms: { albedo: vec4.fromValues(1.0, 0.0, 0.0, 1.0) },
      state: {}
    },
    geometry: renderer.createGeometry(createMeshFromPolytop(polytop, false)),
    transform: new Transform(vec3.fromValues(0.25, 0.0, 0.0))
  }
];

const shape = new Sphere(Math.sqrt(3), new Transform(vec3.fromValues(0.25, 0.0, 0.0)));

fromEvent(document, 'keydown')
  .pipe(filter((e: KeyboardEvent) => ['s'].includes(e.key)))
  .subscribe(() => {
    epa.subdivide(polytop, shape);

    renderer.destroyGeometry(drawables[1].geometry);
    drawables[1].geometry = renderer.createGeometry(
      createMeshFromPolytop(polytop, false)
    );
    console.log(Array.from(polytop));
  });

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
