import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
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

const offset = vec3.fromValues(0.25, 0.25, 0.25);
const radius = 2.0;

const shape = new Sphere(Math.sqrt(3 * radius * radius), new Transform(offset));

const simplex = [
  vec3.fromValues(-radius + offset[0], radius + offset[1], radius + offset[2]),
  vec3.fromValues(radius + offset[0], radius + offset[1], -radius + offset[2]),
  vec3.fromValues(radius + offset[0], -radius + offset[1], radius + offset[2]),
  vec3.fromValues(-radius + offset[0], -radius + offset[1], -radius + offset[2])
];

let polytop = epa.createTetrahedron(
  simplex[0],
  simplex[1],
  simplex[2],
  simplex[3]
);

// let polytop = epa.createHexahedronFromTriangle(
//   simplex[0],
//   simplex[1],
//   simplex[2],
//   shape
// );

// let polytop = epa.createHexahedronFromLineSegment(
//   simplex[0],
//   simplex[1],
//   shape
// );

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
      state: { cullFace: false }
    },
    geometry: renderer.createGeometry(createMeshFromPolytop(polytop, false)),
    transform: new Transform(offset)
  }
];

epa.checkAdjacency(polytop);
const subdivide = () => {
  epa.subdivide(polytop, shape);

  renderer.destroyGeometry(drawables[1].geometry);
  drawables[1].geometry = renderer.createGeometry(
    createMeshFromPolytop(polytop, false)
  );

  epa.checkAdjacency(polytop);
};

fromEvent(document, 'keydown')
  .pipe(filter((e: KeyboardEvent) => ['s'].includes(e.key)))
  .subscribe(() => subdivide());

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
