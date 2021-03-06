import { fromEvent, BehaviorSubject, Subject } from 'rxjs';
import { map, filter, bufferTime, takeUntil } from 'rxjs/operators';
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
  phongVertex,
  phongFragment,
  flatVertex,
  flatFragment
} from '../shaders';

import { objects } from '../objects';

import { areIntersect, SupportPoint, ShapeInterface } from '../src';
import { ObjectPanel, GjkPanel } from './panels';
import { createShape, toEuler } from './tools';

export default class IntersectionView implements ViewportInterface {
  public readonly simplex = new Set<SupportPoint>();

  get changed$() {
    return this._changed$.asObservable();
  }

  private renderer: Renderer;
  private meshes: MeshCollection;
  private idFrameBuffer: RenderTarget;
  private axes1: AxesController;
  private axes2: AxesController;
  private object1Panel: ObjectPanel;
  private object2Panel: ObjectPanel;
  private gjkPanel: GjkPanel;
  private cameraController: ArcRotationCameraController;
  private drawables: Drawable[] = [];
  private geometries = new Map<string, Geometry>();
  private shape1: ShapeInterface;
  private shape2: ShapeInterface;
  private connected = false;
  private dt = 0;
  private dt$ = new BehaviorSubject<number>(0);
  private release$ = new Subject();
  public readonly _changed$ = new Subject();

  connect(canvas: HTMLCanvasElement): void {
    if (!this.renderer) {
      this.boostrap(canvas);
    }

    this.connected = true;
    this.object1Panel = new ObjectPanel(
      document.getElementById('object-1-panel'),
      {
        objectType: 'box',
        position: vec3.fromValues(0.0, 0.0, 0.0),
        orientation: vec3.fromValues(0.0, 0.0, 0.0)
      }
    );
    this.object2Panel = new ObjectPanel(
      document.getElementById('object-2-panel'),
      {
        objectType: 'box',
        position: vec3.fromValues(-1.0, 1.0, 1.0),
        orientation: vec3.fromValues(0.0, 0.0, 0.0)
      }
    );

    this.object1Panel.onChanges().subscribe(e => {
      this.drawables[1].transform.position = e.position;
      this.drawables[1].transform.rotation = quat.fromEuler(
        quat.create(),
        e.orientation[0],
        e.orientation[1],
        e.orientation[2]
      );
      this.drawables[1].geometry = this.geometries.get(e.objectType);
      this.shape1 = createShape(
        e.objectType,
        this.drawables[1].transform,
        this.meshes
      );

      this._changed$.next();
    });
    this.object2Panel.onChanges().subscribe(e => {
      this.drawables[2].transform.position = e.position;
      this.drawables[2].transform.rotation = quat.fromEuler(
        quat.create(),
        e.orientation[0],
        e.orientation[1],
        e.orientation[2]
      );
      this.drawables[2].geometry = this.geometries.get(e.objectType);
      this.shape2 = createShape(
        e.objectType,
        this.drawables[2].transform,
        this.meshes
      );

      this._changed$.next();
    });

    this.gjkPanel = new GjkPanel(document.getElementById('gjk-panel'), {
      time: 0.0,
      simplexSize: 0,
      maxIterations: 25,
      epsilon: 0.01
    });

    this.dt$
      .pipe(
        takeUntil(this.release$),
        bufferTime(250),
        map((v: number[]) => v.reduce((acc, e) => acc + e / v.length, 0))
      )
      .subscribe(e => (this.dt = e));
  }

  frame(): void {
    if (!this.connected) {
      return;
    }

    this.draw();
    this.update();
    this.test();
  }

  disconnect(): void {
    this.connected = false;
    this.release$.next();
    this.object1Panel.release();
    this.object2Panel.release();
    this.gjkPanel.release();
  }

  private draw() {
    this.renderer.setRenderTarget(null);
    this.renderer.clear();

    for (const drawable of this.drawables) {
      this.renderer.drawGeometry(this.cameraController.camera, drawable);
    }

    this.renderer.clear(WebGL2RenderingContext.DEPTH_BUFFER_BIT);
    this.axes1.draw('viewport');
    this.axes2.draw('viewport');

    this.renderer.setRenderTarget(this.idFrameBuffer);
    this.renderer.clear();
    this.axes1.draw('id');
    this.axes2.draw('id');
  }

  private update() {
    this.cameraController.update();

    const pixes = this.renderer.readAsIdMap();
    this.axes1.update(pixes);
    this.axes2.update(pixes);

    this.gjkPanel.write({
      ...this.gjkPanel.state,
      simplexSize: this.simplex.size,
      time: this.dt
    });
  }

  private test() {
    this.simplex.clear();
    const t = performance.now();
    const dir = vec3.create();
    vec3.subtract(
      dir,
      this.axes1.targetTransform.position,
      this.axes2.targetTransform.position
    );
    const are = areIntersect(
      this.simplex,
      this.shape1,
      this.shape2,
      dir,
      this.gjkPanel.state.epsilon,
      this.gjkPanel.state.maxIterations
    );
    this.dt$.next(performance.now() - t);

    this.drawables[1].material.uniforms[
      'albedo'
    ] = this.drawables[2].material.uniforms['albedo'] = are
      ? vec4.fromValues(1.0, 1.0, 0.2, 1.0)
      : vec4.fromValues(0.0, 0.2, 1.0, 1.0);
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
        geometry: this.geometries.get('box'),
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
        geometry: this.geometries.get('box'),
        transform: new Transform(vec3.fromValues(4.0, 2.0, -4.0))
      }
    ];
    this.axes1 = new AxesController(
      this.renderer,
      camera,
      this.drawables[1].transform
    );
    this.axes2 = new AxesController(
      this.renderer,
      camera,
      this.drawables[2].transform
    );

    this.axes1.action$.subscribe(() => {
      this.object1Panel.write({
        ...this.object1Panel.state,
        position: this.axes1.targetTransform.position,
        orientation: toEuler(this.axes1.targetTransform.rotation)
      });
      this._changed$.next();
    });
    this.axes2.action$.subscribe(() => {
      this.object2Panel.write({
        ...this.object2Panel.state,
        position: this.axes2.targetTransform.position,
        orientation: toEuler(this.axes2.targetTransform.rotation)
      });
      this._changed$.next();
    });

    fromEvent(document, 'keydown')
      .pipe(
        filter((e: KeyboardEvent) => ['q', 'w', 'e'].includes(e.key)),
        map(
          (e: KeyboardEvent) =>
            ({ q: 'none', w: 'movement', e: 'rotation' }[e.key])
        )
      )
      .subscribe(mode => (this.axes1.mode = this.axes2.mode = mode));
  }
}
