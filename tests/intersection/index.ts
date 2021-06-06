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
} from '../../graphics';

import {
  vertex as phongVertex,
  fragment as phongFragment
} from '../../shaders/phong';

import {
  vertex as flatVertex,
  fragment as flatFragment
} from '../../shaders/flat';

import objects from '../../objects/objects.obj';

import { AxesController } from '../../graphics/gizmos/axes-controller';
import { gjk } from '../../gjk';
import { getPositions } from '../../mesh';
import { Box, Cone, Cylinder, Polyhedra, Sphere } from '../../shape';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const renderer = new Renderer(
  canvas.getContext('webgl2', {
    preserveDrawingBuffer: true
  })
);
const phongShader = renderer.createShader(phongVertex, phongFragment);
const flatShader = renderer.createShader(flatVertex, flatFragment);
const meshes = loadObj(objects);

const object0 = renderer.createGeometry(meshes['hull1']);
const object1 = renderer.createGeometry(meshes['hull2']);
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
    geometry: object0,
    transform: new Transform()
  },
  {
    material: {
      shader: phongShader,
      uniforms: {
        albedo: vec4.fromValues(0.0, 0.2, 1.0, 1.0)
      },
      state: { cullFace: false }
    },
    geometry: object1,
    transform: new Transform(vec3.fromValues(4.0, 2.0, -4.0))
  }
];

const axes0 = new AxesController(renderer, camera, drawables[1].transform);
const axes1 = new AxesController(renderer, camera, drawables[2].transform);

fromEvent(document, 'keydown')
  .pipe(
    filter((e: KeyboardEvent) => ['q', 'w', 'e'].includes(e.key)),
    map(
      (e: KeyboardEvent) => ({ q: 'none', w: 'movement', e: 'rotation' }[e.key])
    )
  )
  .subscribe(mode => (axes0.mode = axes1.mode = mode));

const shape0 = new Polyhedra(
  getPositions(meshes['hull1']),
  axes0.targetTransform
);
const shape1 = new Polyhedra(
  getPositions(meshes['hull2']),
  axes1.targetTransform
);
// const shape0 = new Box(vec3.fromValues(0.5, 0.5, 0.5), axes0.targetTransform);
// const shape1 = new Box(vec3.fromValues(0.5, 0.5, 0.5), axes1.targetTransform);
// const shape0 = new Cylinder(2.0, 1.0, axes0.targetTransform);
// const shape1 = new Cylinder(2.0, 1.0, axes1.targetTransform);
// const shape0 = new Cone(2.0, 1.0, axes0.targetTransform);
// const shape1 = new Cone(2.0, 1.0, axes1.targetTransform);
// const shape0 = new Sphere(1.0, axes0.targetTransform);
// const shape1 = new Sphere(1.0, axes1.targetTransform);

// Loop
const simplex = new Set<gjk.SupportPoint>();

const draw = () => {
  cameraController.update();
  renderer.setRenderTarget(null);
  renderer.clear();

  for (const drawable of drawables) {
    renderer.drawGeometry(camera, drawable);
  }
  renderer.clear(WebGL2RenderingContext.DEPTH_BUFFER_BIT);
  axes0.draw('viewport');
  axes1.draw('viewport');

  renderer.setRenderTarget(idFrameBuffer);
  renderer.clear();
  axes0.draw('id');
  axes1.draw('id');

  const pixes = renderer.readAsIdMap();
  axes0.update(pixes);
  axes1.update(pixes);

  //
  simplex.clear();
  const areIntersect = gjk.areIntersect(shape0, shape1, simplex);
  document.getElementById('distance').innerHTML = `${areIntersect}`;

  drawables[1].material.uniforms['albedo'] = drawables[2].material.uniforms[
    'albedo'
  ] = areIntersect
    ? vec4.fromValues(1.0, 1.0, 0.2, 1.0)
    : vec4.fromValues(0.0, 0.2, 1.0, 1.0);

  requestAnimationFrame(draw);
};
draw();
