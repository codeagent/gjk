import { vec3, vec4 } from 'gl-matrix';

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
  loadObj
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

import { createSegment, createTetra, createTriangle } from './tools';
import { Simplex, SupportPoint } from '../src';

export default class implements ViewportInterface {
  private renderer: Renderer;
  private cameraController: ArcRotationCameraController;
  private drawables: Drawable[] = [];
  private connected = false;

  private phongShader: Shader;
  private flatShader: Shader;
  private sphere: Geometry;

  constructor(private readonly simplex: Simplex<SupportPoint>) {}

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
    if (this.simplex) {
      if (this.drawables[1].geometry) {
        this.renderer.destroyGeometry(this.drawables[1].geometry);
      }
      this.drawables[1].geometry = null;
      this.drawables = [this.drawables[0], this.drawables[1]];

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
  }

  private boostrap(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(
      canvas.getContext('webgl2', {
        preserveDrawingBuffer: true
      })
    );

    const meshes = loadObj(objects);
    this.sphere = this.renderer.createGeometry(meshes['sphere']);
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
      }
    ];
  }
}
