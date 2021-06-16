import { vec3, vec4 } from 'gl-matrix';
import { Observable, merge, of } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { ViewportInterface } from './viewport.interface';
import {
  ArcRotationCameraController,
  Camera,
  createGrid,
  Drawable,
  Renderer,
  Transform,
  Shader,
  Geometry,
  loadObj,
  MeshCollection
} from '../graphics';
import {
  phongVertex,
  phongFragment,
  flatVertex,
  flatFragment
} from '../shaders';
import { objects } from '../objects';
import { createSegment, createTetra, createTriangle } from './tools';
import { getDifference, Simplex, SupportPoint } from '../src';

export class SimplexView implements ViewportInterface {
  private renderer: Renderer;
  private cameraController: ArcRotationCameraController;
  private drawables: Drawable[] = [];
  private connected = false;
  private meshes: MeshCollection;
  private phongShader: Shader;
  private flatShader: Shader;
  private sphere: Geometry;

  constructor(
    private readonly simplex: Simplex<SupportPoint>,
    private readonly change$: Observable<void>
  ) {}

  connect(canvas: HTMLCanvasElement): void {
    if (!this.renderer) {
      this.boostrap(canvas);
    }
    this.connected = true;
  }

  frame(): void {
    if (!this.connected) {
      return;
    }

    this.update();
    this.draw();
  }

  disconnect(): void {
    this.connected = false;
  }

  private draw() {
    this.renderer.setRenderTarget(null);
    this.renderer.clear();

    for (const drawable of this.drawables) {
      if (drawable.geometry) {
        this.renderer.drawGeometry(this.cameraController.camera, drawable);
      }
    }
  }

  private update() {
    this.cameraController.update();
  }

  private boostrap(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(
      canvas.getContext('webgl2', {
        preserveDrawingBuffer: true
      })
    );

    this.meshes = loadObj(objects);
    this.sphere = this.renderer.createGeometry(this.meshes['sphere']);
    this.phongShader = this.renderer.createShader(phongVertex, phongFragment);
    this.flatShader = this.renderer.createShader(flatVertex, flatFragment);
    const gridGeometry = this.renderer.createGeometry(
      createGrid(),
      WebGL2RenderingContext.LINES
    );
    const camera = new Camera(45.0, canvas.width / canvas.height, 0.25, 100.0);
    camera.position = [5.0, 5.0, 5.0];

    //
    this.cameraController = new ArcRotationCameraController(canvas, camera);
    this.drawables = [
      {
        material: {
          shader: this.flatShader,
          uniforms: { albedo: vec4.fromValues(0.0, 0.0, 0.0, 1.0) },
          state: {}
        },
        geometry: gridGeometry,
        transform: new Transform()
      },
      {
        material: {
          shader: this.flatShader,
          uniforms: {
            albedo: vec4.fromValues(1.0, 1.0, 0.8, 1.0)
          },
          state: { cullFace: false }
        },
        geometry: null,
        transform: new Transform()
      },
      {
        material: {
          shader: this.phongShader,
          uniforms: {
            albedo: vec4.fromValues(1.0, 1.0, 0.8, 1.0)
          },
          state: { cullFace: false }
        },
        geometry: null,
        transform: new Transform()
      }
    ];

    this.change$.pipe(debounceTime(500)).subscribe(() => {
      this.drawables = this.drawables.slice(0, 3);
      this.updateSimplex();
    });
  }

  private updateSimplex() {
    if (!this.simplex) {
      return;
    }

    if (this.drawables[1].geometry) {
      this.renderer.destroyGeometry(this.drawables[1].geometry);
    }

    const material = {
      shader: this.phongShader,
      uniforms: {
        albedo: vec4.fromValues(1.0, 1.0, 1.0, 1.0)
      },
      state: { cullFace: false }
    };
    for (let p of Array.from(this.simplex)) {
      this.drawables.push({
        material,
        geometry: this.sphere,
        transform: new Transform(p.diff, vec3.fromValues(0.1, 0.1, 0.1))
      });
    }

    this.drawables[1].geometry = null;
    if (this.simplex.size === 2) {
      const [w0, w1] = Array.from(this.simplex);
      this.drawables[1].geometry = this.renderer.createGeometry(
        createSegment(w0.diff, w1.diff),
        WebGL2RenderingContext.LINES
      );
    } else if (this.simplex.size === 3) {
      const [w0, w1, w2] = Array.from(this.simplex);
      this.drawables[1].geometry = this.renderer.createGeometry(
        createTriangle(w0.diff, w1.diff, w2.diff),
        WebGL2RenderingContext.LINES
      );
    } else if (this.simplex.size === 4) {
      const [w0, w1, w2, w3] = Array.from(this.simplex);
      this.drawables[1].geometry = this.renderer.createGeometry(
        createTetra(w0.diff, w1.diff, w2.diff, w3.diff),
        WebGL2RenderingContext.LINES
      );
    }
  }

  // private updateHull() {
  //   const
  //   const cloud = getDifference(
  //     this.meshes[this.object1Panel.state.objectType],
  //     this.axes1.targetTransform,
  //     this.meshes[this.object2Panel.state.objectType],
  //     this.axes2.targetTransform
  //   );
  //   this.drawables[0].geometry = this.renderer.createGeometry(
  //     this.createMeshFromPolytop(hull, true),
  //     WebGL2RenderingContext.LINES
  //   );
  // }
}
