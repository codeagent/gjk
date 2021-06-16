import { fromEvent, Subject } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { quat, vec3, vec4 } from 'gl-matrix';

import { ViewportInterface } from './viewport.interface';

import {
  ArcRotationCameraController,
  Camera,
  createGrid,
  Drawable,
  loadObj,
  MeshCollection,
  Renderer,
  RenderTarget,
  Transform,
  AxesController
} from '../graphics';
import {
  phongVertex,
  phongFragment,
  flatVertex,
  flatFragment
} from '../shaders';
import { objects } from '../objects';
import { ObjectPanel } from './panels';
import { createShape, toEuler, createMeshFromPolytop } from './tools';
import {
  Polytop,
  createHexahedronFromLineSegment,
  ShapeInterface,
  SupportPoint,
  EmptyShape,
  MinkowskiDifference,
  subdivide,
  checkAdjacency
} from '../src';

export default class implements ViewportInterface {
  private renderer: Renderer;
  private meshes: MeshCollection;
  private idFrameBuffer: RenderTarget;
  private axes: AxesController;
  private shapePanel: ObjectPanel;
  private cameraController: ArcRotationCameraController;
  private drawables: Drawable[] = [];
  private shapeTransform = new Transform(vec3.fromValues(-0.25, -0.25, -0.25));
  private shape: ShapeInterface<SupportPoint>;
  private connected = false;
  private polytop: Polytop;
  private release$ = new Subject();

  connect(canvas: HTMLCanvasElement): void {
    if (!this.renderer) {
      this.boostrap(canvas);
    }

    this.connected = true;
    this.shapePanel = new ObjectPanel(
      document.getElementById('object-1-panel'),
      {
        objectType: 'sphere',
        position: this.shapeTransform.position,
        orientation: vec3.fromValues(0.0, 0.0, 0.0)
      }
    );
    this.shapePanel.onChanges().subscribe(e => {
      this.shapeTransform.position = e.position;
      this.shapeTransform.rotation = quat.fromEuler(
        quat.create(),
        e.orientation[0],
        e.orientation[1],
        e.orientation[2]
      );
      this.shape = this.createShape(e.objectType);
      this.subdivide();
    });
  }

  frame(): void {
    if (!this.connected) {
      return;
    }

    this.draw();
    this.update();
  }

  disconnect(): void {
    this.connected = false;
    this.release$.next();
    this.shapePanel.release();
  }

  private draw() {
    this.renderer.setRenderTarget(null);
    this.renderer.clear();

    for (const drawable of this.drawables) {
      this.renderer.drawGeometry(this.cameraController.camera, drawable);
    }

    this.renderer.clear(WebGL2RenderingContext.DEPTH_BUFFER_BIT);
    this.axes.draw('viewport');

    this.renderer.setRenderTarget(this.idFrameBuffer);
    this.renderer.clear();
    this.axes.draw('id');
  }

  private update() {
    this.cameraController.update();

    const pixes = this.renderer.readAsIdMap();
    this.axes.update(pixes);

    this.shapePanel.write({
      ...this.shapePanel.state,
      position: this.axes.targetTransform.position,
      orientation: toEuler(this.axes.targetTransform.rotation)
    });
  }

  private boostrap(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(
      canvas.getContext('webgl2', {
        preserveDrawingBuffer: true
      })
    );

    this.meshes = loadObj(objects);
    const phongShader = this.renderer.createShader(phongVertex, phongFragment);
    const flatShader = this.renderer.createShader(flatVertex, flatFragment);
    const gridGeometry = this.renderer.createGeometry(
      createGrid(),
      WebGL2RenderingContext.LINES
    );
    const camera = new Camera(45.0, canvas.width / canvas.height, 0.25, 100.0);
    camera.position = [5.0, 5.0, 5.0];

    //
    this.idFrameBuffer = this.renderer.createIdRenderTarget();
    this.cameraController = new ArcRotationCameraController(canvas, camera);

    this.shape = this.createShape('sphere');
    this.polytop = this.createPolytop();

    this.drawables = [
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
        geometry: this.renderer.createGeometry(
          createMeshFromPolytop(this.polytop, false)
        ),
        transform: new Transform()
      }
    ];

    this.axes = new AxesController(this.renderer, camera, this.shapeTransform);
    this.axes.action$.subscribe(() => {
      this.subdivide();
    });

    fromEvent(document, 'keydown')
      .pipe(
        filter((e: KeyboardEvent) => ['q', 'w', 'e'].includes(e.key)),
        map(
          (e: KeyboardEvent) =>
            ({ q: 'none', w: 'movement', e: 'rotation' }[e.key])
        )
      )
      .subscribe(mode => (this.axes.mode = mode));
  }

  private createPolytop() {
    const d = vec3.fromValues(1.0, 0.0, 0.0);
    const w0 = this.shape.support(
      {
        support0: vec3.create(),
        support1: vec3.create(),
        diff: vec3.create()
      },
      d
    );

    vec3.negate(d, d);

    const w1 = this.shape.support(
      {
        support0: vec3.create(),
        support1: vec3.create(),
        diff: vec3.create()
      },
      d
    );

    return createHexahedronFromLineSegment(w0, w1, this.shape);
  }

  private subdivide(times = 64) {
    this.polytop = this.createPolytop();
    while (times-- >= 0) {
      try {
        subdivide(this.polytop, this.shape);
      } catch {}
    }
    this.renderer.destroyGeometry(this.drawables[1].geometry);
    this.drawables[1].geometry = this.renderer.createGeometry(
      createMeshFromPolytop(this.polytop, false)
    );
    checkAdjacency(this.polytop);
  }

  private createShape(type: string) {
    const shape0 = createShape(type, this.shapeTransform, this.meshes);
    const shape1 = new EmptyShape();
    return new MinkowskiDifference(shape0, shape1);
  }
}
