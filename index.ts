import './style.css';

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
} from './graphics';

import {
  vertex as phongVertex,
  fragment as phongFragment
} from './shaders/phong';

import { vertex as flatVertex, fragment as flatFragment } from './shaders/flat';

import tetra from './objects/tetra.obj';

import { AxesController } from './graphics/gizmos/axes-controller';
import { closestPointToTetrahedron } from './gjk';
import { createTetra } from './mesh';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const renderer = new Renderer(
  canvas.getContext('webgl2', {
    preserveDrawingBuffer: true
  })
);
const phongShader = renderer.createShader(phongVertex, phongFragment);
const flatShader = renderer.createShader(flatVertex, flatFragment);
const meshes = loadObj(tetra);

const points = [
  vec3.fromValues(-0.38184, 0.417004, 0.39807),
  vec3.fromValues(-1.58184, 0.14915, -1.36724),
  vec3.fromValues(0.35428, -0.02641, -0.0),
  vec3.fromValues(-0.16882, 0.53806, 0.12956)
];
const objGeometry = renderer.createGeometry(
  createTetra(points[0], points[1], points[2], points[3]),
  WebGL2RenderingContext.LINES
);
const icoGeometry = renderer.createGeometry(meshes['Ico']);
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
      shader: flatShader,
      uniforms: {
        albedo: vec4.fromValues(0.8, 0.8, 0.8, 1.0)
      },
      state: { cullFace: false }
    },
    geometry: objGeometry,
    transform: new Transform(vec3.create(), vec3.fromValues(1.0, 1.0, 1.0))
  },
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
      uniforms: {
        albedo: vec4.fromValues(1.0, 0.2, 0.0, 1.0)
      },
      state: { cullFace: false }
    },
    geometry: icoGeometry,
    transform: new Transform(vec3.create(), vec3.fromValues(0.01, 0.01, 0.01))
  }
];

const tetraAxes = new AxesController(renderer, camera, drawables[0].transform);
const pointAxes = new AxesController(
  renderer,
  camera,
  new Transform([2, 1, 3])
);

console.log(meshes);
fromEvent(document, 'keydown')
  .pipe(
    filter((e: KeyboardEvent) => ['q', 'w', 'e'].includes(e.key)),
    map(
      (e: KeyboardEvent) => ({ q: 'none', w: 'movement', e: 'rotation' }[e.key])
    )
  )
  .subscribe(mode => (tetraAxes.mode = pointAxes.mode = mode));

// Loop
const draw = () => {
  cameraController.update();
  renderer.setRenderTarget(null);
  renderer.clear();

  for (const drawable of drawables) {
    renderer.drawGeometry(camera, drawable);
  }
  renderer.clear(WebGL2RenderingContext.DEPTH_BUFFER_BIT);
  tetraAxes.draw('viewport');
  pointAxes.draw('viewport');

  renderer.setRenderTarget(idFrameBuffer);
  renderer.clear();
  tetraAxes.draw('id');
  pointAxes.draw('id');

  const pixes = renderer.readAsIdMap();
  tetraAxes.update(pixes);
  pointAxes.update(pixes);

  const transformed = points.map(e =>
    vec3.transformMat4(vec3.create(), e, tetraAxes.targetTransform.transform)
  );

  drawables[2].transform.position = closestPointToTetrahedron(
    transformed[0],
    transformed[1],
    transformed[2],
    transformed[3],
    pointAxes.targetTransform.position
  );

  requestAnimationFrame(draw);
};
draw();
