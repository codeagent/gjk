import { ViewportInterface } from '../viewport';

import { fromEvent, Subscription } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { vec3, vec4 } from 'gl-matrix';

import {
  ArcRotationCameraController,
  Camera,
  createGrid,
  loadObj,
  Renderer,
  RenderTarget,
  Shader,
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
import { ObjectPanel } from '../planes/object-panel';

export class Viewport implements ViewportInterface {
  private connected = false;
  private renderer: Renderer;
  private phongShader: Shader;
  private flatShader: Shader;
  private gridGeometry: Shader;
  private cameraController: ArcRotationCameraController;
  private idFrameBuffer: RenderTarget;
  private axes0: AxesController;
  private axes1: AxesController;
  private modeSubscription: Subscription;
  private object1Panel: ObjectPanel;
  private object2Panel: ObjectPanel;

  connect(canvas: HTMLCanvasElement): void {
    this.connected = true;

    const renderer = new Renderer(
      canvas.getContext('webgl2', {
        preserveDrawingBuffer: true
      })
    );

    const phongShader = renderer.createShader(phongVertex, phongFragment);
    const flatShader = renderer.createShader(flatVertex, flatFragment);
    const meshes = loadObj(objects);

    const object0 = renderer.createGeometry(meshes['object1']);
    const object1 = renderer.createGeometry(meshes['object2']);
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
  }
  disconnect(canvas: HTMLCanvasElement): void {
    this.connected = false;
  }
}
