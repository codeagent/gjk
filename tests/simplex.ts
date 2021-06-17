import { vec3, vec4 } from 'gl-matrix';
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
  MeshCollection,
  Mesh
} from '../graphics';
import {
  phongVertex,
  phongFragment,
  flatVertex,
  flatFragment
} from '../shaders';
import { objects } from '../objects';
import { createSegment, createTetra, createTriangle } from './tools';
import { convexHull, getDifference, Polytop } from '../src';
import TestViewportBase from './test-viewport-base.class';

export class SimplexView implements ViewportInterface {
  private renderer: Renderer;
  private cameraController: ArcRotationCameraController;
  private drawables: Drawable[] = [];
  private connected = false;
  private meshes: MeshCollection;
  private phongShader: Shader;
  private flatShader: Shader;
  private sphere: Geometry;

  constructor(private readonly viewport: TestViewportBase) {}

  connect(canvas: HTMLCanvasElement): void {
    if (!this.renderer) {
      this.boostrap(canvas);
    }
    this.connected = true;
    this.updateScene();
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
            albedo: vec4.fromValues(1.0, 0.5, 0.0, 1.0)
          },
          state: { cullFace: false }
        },
        geometry: null,
        transform: new Transform()
      },
      {
        material: {
          shader: this.flatShader,
          uniforms: {
            albedo: vec4.fromValues(1.0, 1.0, 1.0, 0.05)
          },
          state: {}
        },
        geometry: null,
        transform: new Transform()
      },
      {
        material: {
          shader: this.phongShader,
          uniforms: {
            albedo: vec4.fromValues(0.0, 0.25, 1.0, 0.25)
          },
          state: {  }
        },
        geometry: null,
        transform: new Transform()
      }
    ];

    this.viewport.changed$
      .pipe(debounceTime(500))
      .subscribe(() => this.updateScene());
  }

  private updateScene() {
    this.drawables = this.drawables.slice(0, 4);
    this.updateSimplex();
    this.updateHull();
  }

  private updateSimplex() {
    if (!this.viewport.simplex) {
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
    for (let p of Array.from(this.viewport.simplex)) {
      this.drawables.push({
        material,
        geometry: this.sphere,
        transform: new Transform(p.diff, vec3.fromValues(0.1, 0.1, 0.1))
      });
    }

    this.drawables[1].geometry = null;
    if (this.viewport.simplex.size === 2) {
      const [w0, w1] = Array.from(this.viewport.simplex);
      this.drawables[1].geometry = this.renderer.createGeometry(
        createSegment(w0.diff, w1.diff),
        WebGL2RenderingContext.LINES
      );
    } else if (this.viewport.simplex.size === 3) {
      const [w0, w1, w2] = Array.from(this.viewport.simplex);
      this.drawables[1].geometry = this.renderer.createGeometry(
        createTriangle(w0.diff, w1.diff, w2.diff),
        WebGL2RenderingContext.LINES
      );
    } else if (this.viewport.simplex.size === 4) {
      const [w0, w1, w2, w3] = Array.from(this.viewport.simplex);
      this.drawables[1].geometry = this.renderer.createGeometry(
        createTetra(w0.diff, w1.diff, w2.diff, w3.diff),
        WebGL2RenderingContext.LINES
      );
    }
  }

  private updateHull() {
    const type1 = document.querySelector<HTMLInputElement>(
      '#object-1-panel select'
    ).value;

    const type2 = document.querySelector<HTMLInputElement>(
      '#object-2-panel select'
    ).value;

    if (this.drawables[2].geometry) {
      this.renderer.destroyGeometry(this.drawables[2].geometry);
    }
    if (this.drawables[3].geometry) {
      this.renderer.destroyGeometry(this.drawables[3].geometry);
    }

    const cloud = getDifference(
      this.meshes[type1],
      this.viewport.axes1.targetTransform,
      this.meshes[type2],
      this.viewport.axes2.targetTransform
    );
    if (cloud.length) {
      const hull = convexHull(cloud);
      this.drawables[2].geometry = this.renderer.createGeometry(
        this.createMeshFromPolytop(hull),
        WebGL2RenderingContext.LINES
      );
      this.drawables[3].geometry = this.renderer.createGeometry(
        this.createMeshFromPolytop(hull, false)
      );
    }
  }

  private createMeshFromPolytop(polytop: Polytop<vec3>, wired = true): Mesh {
    const vertexData = [];
    const indexData = [];
    const COLOR = [0.0, 0.0, 0.0];
    if (wired) {
      for (let face of Array.from(polytop)) {
        for (let i = 0; i < 3; i++) {
          indexData.push(vertexData.length / 6);
          vertexData.push(...face.vertices[i], ...COLOR);
          indexData.push(vertexData.length / 6);
          vertexData.push(...face.vertices[(i + 1) % 3], ...COLOR);
        }
      }
      return {
        vertexFormat: [
          {
            semantics: 'position',
            size: 3,
            type: WebGL2RenderingContext.FLOAT,
            slot: 0,
            offset: 0,
            stride: 24
          },
          {
            semantics: 'color',
            size: 3,
            type: WebGL2RenderingContext.FLOAT,
            slot: 1,
            offset: 12,
            stride: 24
          }
        ],
        vertexData: Float32Array.from(vertexData),
        indexData: Uint16Array.from(indexData)
      };
    } else {
      for (let face of Array.from(polytop)) {
        const normal = vec3.create();
        const e0 = vec3.create();
        const e1 = vec3.create();
        vec3.subtract(e0, face.vertices[1], face.vertices[0]);
        vec3.subtract(e1, face.vertices[2], face.vertices[0]);
        vec3.cross(normal, e0, e1);
        vec3.normalize(normal, normal);
        for (let i = 0; i < 3; i++) {
          indexData.push(vertexData.length / 6);
          vertexData.push(...face.vertices[i], ...normal);
        }
      }
      return {
        vertexFormat: [
          {
            semantics: 'position',
            size: 3,
            type: WebGL2RenderingContext.FLOAT,
            slot: 0,
            offset: 0,
            stride: 24
          },
          {
            semantics: 'normal',
            size: 3,
            type: WebGL2RenderingContext.FLOAT,
            slot: 1,
            offset: 12,
            stride: 24
          }
        ],
        vertexData: Float32Array.from(vertexData),
        indexData: Uint16Array.from(indexData)
      };
    }
  }
}
