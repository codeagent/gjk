import { fromEvent, Subject } from 'rxjs';
import { map, filter, takeUntil } from 'rxjs/operators';
import { quat, vec3, vec4 } from 'gl-matrix';

import { ViewportInterface } from './viewport.interface';

import {
  ArcRotationCameraController,
  Camera,
  createGrid,
  Drawable,
  Geometry,
  loadObj,
  MeshCollection,
  Renderer,
  RenderTarget,
  Transform,
  AxesController
} from '../graphics';

import {
  vertex as phongVertex,
  fragment as phongFragment
} from '../shaders/phong';

import {
  vertex as flatVertex,
  fragment as flatFragment
} from '../shaders/flat';

import objects from '../objects/objects.obj';

import { ShapeInterface } from '../shape';
import { ObjectPanel } from './panels';
import { createShape, toEuler } from './tools';
import { epa } from '../epa';
import { createMeshFromPolytop } from '../mesh';

export default class implements ViewportInterface {
  private renderer: Renderer;
  private meshes: MeshCollection;
  private idFrameBuffer: RenderTarget;
  private axes: AxesController;
  private shapePanel: ObjectPanel;
  private cameraController: ArcRotationCameraController;
  private drawables: Drawable[] = [];
  private geometries = new Map<string, Geometry>();
  private shape: ShapeInterface;
  private connected = false;
  private polytop: epa.Polytop;
  private dt = 0;
  private release$ = new Subject();

  connect(canvas: HTMLCanvasElement): void {
    if (!this.renderer) {
      this.boostrap(canvas);
    }

    this.connected = true;
    this.shapePanel = new ObjectPanel(
      document.getElementById('object-1-panel'),
      {
        objectType: 'box',
        position: vec3.fromValues(0.0, 0.0, 0.0),
        orientation: vec3.fromValues(0.0, 0.0, 0.0)
      }
    );
    this.shapePanel.onChanges().subscribe(e => {
      this.drawables[1].transform.position = e.position;
      this.drawables[1].transform.rotation = quat.fromEuler(
        quat.create(),
        e.orientation[0],
        e.orientation[1],
        e.orientation[2]
      );

      this.shape = createShape(
        e.objectType,
        this.drawables[1].transform,
        this.meshes
      );

      this.createPolytop();

      this.drawables[1].geometry = this.renderer.createGeometry(
        createMeshFromPolytop(this.polytop, false)
      );
    });

    fromEvent(document, 'keydown')
      .pipe(
        takeUntil(this.release$),
        filter((e: KeyboardEvent) => ['s'].includes(e.key))
      )
      .subscribe(() => {
        const t = performance.now();
        this.subdivide();
        this.dt = performance.now() - t;
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
    for (let type of ['sphere', 'box', 'cylinder', 'cone', 'hull1', 'hull2']) {
      this.geometries.set(
        type,
        this.renderer.createGeometry(this.meshes[type])
      );
    }

    const shapeTransform = new Transform();
    this.shape = createShape('sphere', shapeTransform, this.meshes);
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
        transform: shapeTransform
      }
    ];
    this.axes = new AxesController(this.renderer, camera, shapeTransform);

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
    const w0 = vec3.create();
    this.shape.support(w0, d);

    const w1 = vec3.create();
    vec3.negate(d, d);
    this.shape.support(w1, d);

    return epa.createHexahedronFromLineSegment(w0, w1, this.shape);
  }

  private subdivide() {
    epa.subdivide(this.polytop, this.shape);
    this.renderer.destroyGeometry(this.drawables[1].geometry);
    this.drawables[1].geometry = this.renderer.createGeometry(
      createMeshFromPolytop(this.polytop, false)
    );
    epa.checkAdjacency(this.polytop);
  }
}
