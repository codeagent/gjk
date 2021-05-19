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

import objects from './objects/objects.obj';

import { AxesController } from './graphics/gizmos/axes-controller';
import { gjk } from './gjk';
import {
  createSegment,
  createTetra,
  createTriangle,
  getPositions
} from './mesh';
import { Box, Cone, Cylinder, Polyhedra, Sphere } from './shape';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const renderer = new Renderer(
  canvas.getContext('webgl2', {
    preserveDrawingBuffer: true
  })
);
const phongShader = renderer.createShader(phongVertex, phongFragment);
const flatShader = renderer.createShader(flatVertex, flatFragment);
const meshes = loadObj(objects);

const object0 = renderer.createGeometry(meshes['cylinder']);
const object1 = renderer.createGeometry(meshes['cylinder']);

const gridGeometry = renderer.createGeometry(
  createGrid(),
  WebGL2RenderingContext.LINES
);
const icoGeometry = renderer.createGeometry(meshes['sphere']);

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
    transform: new Transform(vec3.fromValues(2.0, 2.0, -2.0))
  },

  // closests
  {
    material: {
      shader: phongShader,
      uniforms: {
        albedo: vec4.fromValues(1.0, 0.2, 1.0, 1.0)
      },
      state: { cullFace: false }
    },
    geometry: icoGeometry,
    transform: new Transform(
      vec3.fromValues(0.0, 0.0, 0.0),
      vec3.fromValues(0.1, 0.1, 0.1)
    )
  },
  {
    material: {
      shader: phongShader,
      uniforms: {
        albedo: vec4.fromValues(1.0, 0.2, 1.0, 1.0)
      },
      state: { cullFace: false }
    },
    geometry: icoGeometry,
    transform: new Transform(
      vec3.fromValues(0.0, 0.0, 0.0),
      vec3.fromValues(0.1, 0.1, 0.1)
    )
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

// const shape0 = new Polyhedra(getPositions(meshes['box']));
// const shape1 = new Polyhedra(getPositions(meshes['box']));

// const shape0 = new Box(vec3.fromValues(0.5, 0.5, 0.5));
const shape0 = new Cylinder(2.0, 1.0);
const shape1 = new Cylinder(2.0, 1.0);

// for (let p of shape1.hull) {
//   drawables.push({
//     material: {
//       shader: phongShader,
//       uniforms: {
//         albedo: vec4.fromValues(1.0, 1.0, 1.0, 1.0)
//       },
//       state: { cullFace: false }
//     },
//     geometry: icoGeometry,
//     transform: new Transform(p)
//   });
// }

// Loop
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
  const closestPoints: [vec3, vec3] = [vec3.create(), vec3.create()];
  const distance = gjk.closestPoints(
    shape0,
    axes0.targetTransform.transform,
    shape1,
    axes1.targetTransform.transform,
    closestPoints
  );

  if (distance) {
    drawables[3].transform.position = closestPoints[0];
    drawables[4].transform.position = closestPoints[1];
  } else {
    drawables[3].transform.position = drawables[4].transform.position = vec3.create();
  }

  document.getElementById('distance').innerHTML = `${distance}`;

  requestAnimationFrame(draw);
};
draw();