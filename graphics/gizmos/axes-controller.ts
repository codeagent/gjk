import { mat3, mat4, quat, vec2, vec3, vec4 } from 'gl-matrix';
import { fromEvent, Subject, merge } from 'rxjs';
import { filter, map, takeUntil } from 'rxjs/operators';

import { Drawable, Material, Renderer, Shader } from '../renderer';
import {
  idVertex,
  idFragment,
  phongVertex,
  phongFragment,
  flatVertex,
  flatFragment
} from '../../shaders';
import { Camera } from '../camera';
import { axes } from '../../objects';
import { loadObj } from '../loader';
import { Transform } from '../transform';
import {
  createXYCircle,
  createXZCircle,
  createYZCircle,
  createXYRect,
  createXZRect,
  createYZRect,
  createAxes
} from './mesh';

enum MouseButton {
  Left = 0,
  Middle = 1
}

const uniqueId = (() => {
  let counter = 0;
  return () => ++counter;
})();

const PERCIEVED_UNIT_DISTANCE = 7.0;

export type DrawContext = 'id' | 'viewport';

class BaseController {
  set hover(hover: boolean) {
    this._hover = hover;
  }

  set scaling(scaling: vec3) {
    this._scaling = scaling;
  }

  get action$() {
    return this._action$.asObservable();
  }

  protected idMaterial: Material;
  protected release$ = new Subject();
  protected cursor = vec2.create();
  protected objectId = uniqueId();
  protected active = false;
  protected _hover = false;
  protected _scaling = vec3.fromValues(1.0, 1.0, 1.0);
  private _action$ = new Subject();

  constructor(
    protected renderer: Renderer,
    protected camera: Camera,
    public targetTransform: Transform,
    protected viewDrawable: Drawable,
    protected idDrawable: Drawable,
    protected axis: vec3
  ) {
    this.idMaterial = {
      shader: renderer.createShader(idVertex, idFragment),
      uniforms: {
        objectId: this.objectId
      },
      state: { cullFace: false }
    };

    fromEvent(this.renderer.context.canvas, 'mousedown')
      .pipe(
        takeUntil(this.release$),
        filter(() => this._hover),
        filter((e: MouseEvent) => e.button === MouseButton.Left),
        map((e: MouseEvent) =>
          vec2.fromValues(
            e.offsetX,
            this.renderer.context.canvas.height - e.offsetY
          )
        )
      )
      .subscribe(e => this.onMouseDown(e));

    fromEvent(this.renderer.context.canvas, 'mouseup')
      .pipe(takeUntil(this.release$))
      .subscribe(() => this.onMouseUp());

    fromEvent(this.renderer.context.canvas, 'mousemove')
      .pipe(
        takeUntil(this.release$),
        filter((e: MouseEvent) => e.button === MouseButton.Left),
        map((e: MouseEvent) =>
          vec2.fromValues(
            e.offsetX,
            this.renderer.context.canvas.height - e.offsetY
          )
        )
      )
      .subscribe((e: vec2) => this.onMouseMove(e));
  }

  update(bitmap: Uint16Array) {
    const id =
      bitmap[
        this.renderer.context.canvas.width * this.cursor[1] + this.cursor[0]
      ];
    const objectId = id & 0x0000ffff;
    this._hover = objectId === this.objectId;

    this.viewDrawable.transform.scale = this.idDrawable.transform.scale = this._scaling;
    this.viewDrawable.transform.position = this.idDrawable.transform.position = this.targetTransform.position;
    this.viewDrawable.transform.rotation = this.idDrawable.transform.rotation = this.targetTransform.rotation;

    if (this.active) {
      this.doAction();
    }
  }

  draw(context: DrawContext) {
    if (context === 'id') {
      this.renderer.drawGeometry(this.camera, {
        ...this.idDrawable,
        material: this.idMaterial
      });
    } else {
      if (this._hover || this.active) {
        this.renderer.drawGeometry(this.camera, this.idDrawable);
      } else {
        this.renderer.drawGeometry(this.camera, this.viewDrawable);
      }
    }
  }

  release() {
    this.renderer.destroyShader(this.idMaterial.shader);
    this.release$.next();
  }

  protected onMouseDown(coords: vec2) {
    this.active = true;
  }

  protected onMouseUp() {
    this.active = false;
  }

  protected onMouseMove(coords: vec2) {
    this.cursor = coords;
  }

  protected doAction() {
    this._action$.next();
  }
}

export class AxisController extends BaseController {
  private offset: vec3;

  private closestPoint(coord: vec2) {
    const invViewProj = mat4.create();
    mat4.multiply(invViewProj, this.camera.projection, this.camera.view);
    mat4.invert(invViewProj, invViewProj);
    const { width, height } = this.renderer.context.canvas;
    const look = vec3.fromValues(
      (coord[0] / width) * 2.0 - 1.0,
      (coord[1] / height) * 2.0 - 1.0,
      1.0
    );
    vec3.transformMat4(look, look, invViewProj);
    vec3.subtract(look, look, this.camera.position);
    vec3.normalize(look, look);

    const dir = vec3.create();
    vec3.transformMat4(dir, this.axis, this.targetTransform.transform);
    vec3.subtract(dir, dir, this.targetTransform.position);

    const st = closest(
      this.targetTransform.position,
      dir,
      this.camera.position,
      look
    );
    return vec3.scaleAndAdd(dir, this.targetTransform.position, dir, st[0]);
  }

  protected onMouseDown(coords: vec2) {
    this.active = true;
    this.offset = this.closestPoint(coords);
    vec3.subtract(this.offset, this.offset, this.targetTransform.position);
  }

  protected doAction() {
    const position = this.closestPoint(this.cursor);
    vec3.subtract(position, position, this.offset);
    this.targetTransform.position = position;
    super.doAction();
  }
}

export class PlaneController extends BaseController {
  private offset: vec3;

  private closestPoint(coord: vec2) {
    const invViewProj = mat4.create();
    mat4.multiply(invViewProj, this.camera.projection, this.camera.view);
    mat4.invert(invViewProj, invViewProj);
    const { width, height } = this.renderer.context.canvas;
    const look = vec3.fromValues(
      (coord[0] / width) * 2.0 - 1.0,
      (coord[1] / height) * 2.0 - 1.0,
      1.0
    );

    vec3.transformMat4(look, look, invViewProj);
    vec3.subtract(look, look, this.camera.position);
    vec3.normalize(look, look);

    const transform = mat3.create();
    mat3.fromMat4(transform, this.targetTransform.transform);
    const normal = vec3.create();
    vec3.transformMat3(normal, this.axis, transform);
    vec3.normalize(normal, normal);

    return linePlane(
      this.camera.position,
      look,
      this.targetTransform.position,
      normal
    );
  }

  protected onMouseDown(coords: vec2) {
    this.active = true;
    this.offset = this.closestPoint(coords);
    vec3.subtract(this.offset, this.offset, this.targetTransform.position);
  }

  protected doAction() {
    const position = this.closestPoint(this.cursor);
    vec3.subtract(position, position, this.offset);
    this.targetTransform.position = position;
    super.doAction();
  }
}

export class CircleController extends BaseController {
  private shoulder = vec3.create();
  private orientation = quat.create();

  private closestPoint(coord: vec2) {
    const invViewProj = mat4.create();
    mat4.multiply(invViewProj, this.camera.projection, this.camera.view);
    mat4.invert(invViewProj, invViewProj);
    const { width, height } = this.renderer.context.canvas;
    const look = vec3.fromValues(
      (coord[0] / width) * 2.0 - 1.0,
      (coord[1] / height) * 2.0 - 1.0,
      1.0
    );

    vec3.transformMat4(look, look, invViewProj);
    vec3.subtract(look, look, this.camera.position);
    vec3.normalize(look, look);

    const transform = mat3.create();
    mat3.fromMat4(transform, this.targetTransform.transform);
    const normal = vec3.create();
    vec3.transformMat3(normal, this.axis, transform);
    vec3.normalize(normal, normal);

    return linePlane(
      this.camera.position,
      look,
      this.targetTransform.position,
      normal
    );
  }

  protected onMouseDown(coords: vec2) {
    this.active = true;
    this.shoulder = this.closestPoint(coords);
    quat.copy(this.orientation, this.targetTransform.rotation);
  }

  protected doAction() {
    const transform = mat3.create();
    mat3.fromMat4(transform, this.targetTransform.transform);
    const axis = vec3.create();
    vec3.transformMat3(axis, this.axis, transform);

    const closest = this.closestPoint(this.cursor);
    const cross = vec3.cross(vec3.create(), this.shoulder, closest);
    const sign = Math.sign(vec3.dot(cross, axis));
    const angle = sign * vec3.distance(closest, this.shoulder);

    const q = quat.create();
    quat.setAxisAngle(q, this.axis, angle);
    quat.multiply(q, this.orientation, q);

    this.targetTransform.rotation = q;

    super.doAction();
  }
}

export class AxesController {
  public mode: 'none' | 'movement' | 'rotation' = 'movement';

  get action$() {
    return this._action$.asObservable();
  }

  private xAxisController: AxisController;
  private yAxisController: AxisController;
  private zAxisController: AxisController;
  private xyPlaneController: PlaneController;
  private xzPlaneController: PlaneController;
  private yzPlaneController: PlaneController;
  private xyCircleController: CircleController;
  private xzCircleController: CircleController;
  private yzCircleController: CircleController;
  private axesDrawable: Drawable;

  private phongShader: Shader;
  private flatShader: Shader;
  private release$ = new Subject();
  private _action$ = new Subject();

  constructor(
    private renderer: Renderer,
    private camera: Camera,
    public readonly targetTransform: Transform
  ) {
    this.phongShader = renderer.createShader(phongVertex, phongFragment);
    this.flatShader = renderer.createShader(flatVertex, flatFragment);

    this.createAxes();
    this.createPlanes();
    this.createCircles();

    merge(
      this.xAxisController.action$,
      this.yAxisController.action$,
      this.zAxisController.action$,
      this.xyCircleController.action$,
      this.xzCircleController.action$,
      this.yzCircleController.action$,
      this.xyPlaneController.action$,
      this.xzPlaneController.action$,
      this.yzPlaneController.action$
    )
      .pipe(takeUntil(this.release$))
      .subscribe(this._action$);

    this.axesDrawable = {
      material: {
        shader: this.flatShader,
        uniforms: { albedo: vec4.fromValues(0.0, 0.0, 0.0, 0.8) },
        state: {}
      },
      geometry: this.renderer.createGeometry(
        createAxes(0.4),
        WebGL2RenderingContext.LINES
      ),
      transform: new Transform()
    };
  }

  update(bitmap: Uint16Array) {
    const scaling = this.getScaling();
    this.xAxisController.scaling = this.yAxisController.scaling = this.zAxisController.scaling = scaling;
    this.xyPlaneController.scaling = this.xzPlaneController.scaling = this.yzPlaneController.scaling = scaling;
    this.xyCircleController.scaling = this.xzCircleController.scaling = this.yzCircleController.scaling = scaling;

    this.xAxisController.update(bitmap);
    this.yAxisController.update(bitmap);
    this.zAxisController.update(bitmap);
    this.xyPlaneController.update(bitmap);
    this.xzPlaneController.update(bitmap);
    this.yzPlaneController.update(bitmap);

    this.xyCircleController.update(bitmap);
    this.xzCircleController.update(bitmap);
    this.yzCircleController.update(bitmap);

    this.axesDrawable.transform.scale = scaling;
    this.axesDrawable.transform.position = this.targetTransform.position;
    this.axesDrawable.transform.rotation = this.targetTransform.rotation;

    if (this.xyPlaneController.hover) {
      // this.xAxisController.hover = this.yAxisController.hover = true;
    }
  }

  draw(context: DrawContext) {
    if (this.mode === 'movement') {
      this.xAxisController.draw(context);
      this.yAxisController.draw(context);
      this.zAxisController.draw(context);
      this.xyPlaneController.draw(context);
      this.xzPlaneController.draw(context);
      this.yzPlaneController.draw(context);
    } else if (this.mode === 'rotation') {
      this.xyCircleController.draw(context);
      this.xzCircleController.draw(context);
      this.yzCircleController.draw(context);
    } else {
      if (context === 'viewport') {
        this.renderer.drawGeometry(this.camera, this.axesDrawable);
      }
    }
  }

  release() {
    this.release$.next();
    this.xAxisController.release();
    this.yAxisController.release();
    this.zAxisController.release();
    this.xyPlaneController.release();
    this.xzPlaneController.release();
    this.yzPlaneController.release();
    this.xyCircleController.release();
    this.xzCircleController.release();
    this.yzCircleController.release();
  }

  private createAxes() {
    const axesCollection = loadObj(axes);

    const xIdDrawable = {
      material: {
        shader: this.phongShader,
        uniforms: { albedo: vec4.fromValues(1.0, 1.0, 0.0, 0.8) },
        state: {}
      },
      geometry: this.renderer.createGeometry(axesCollection['X']),
      transform: new Transform()
    };
    const yIdDrawable = {
      material: {
        shader: this.phongShader,
        uniforms: { albedo: vec4.fromValues(1.0, 1.0, 0.0, 0.8) },
        state: {}
      },
      geometry: this.renderer.createGeometry(axesCollection['Y']),
      transform: new Transform()
    };
    const zIdDrawable = {
      material: {
        shader: this.phongShader,
        uniforms: { albedo: vec4.fromValues(1.0, 1.0, 0.0, 0.8) },
        state: {}
      },
      geometry: this.renderer.createGeometry(axesCollection['Z']),
      transform: new Transform()
    };

    const xViewDrawable = {
      material: {
        shader: this.phongShader,
        uniforms: { albedo: vec4.fromValues(1.0, 0.0, 0.0, 0.8) },
        state: {}
      },
      geometry: this.renderer.createGeometry(axesCollection['X']),
      transform: new Transform()
    };
    const yViewDrawable = {
      material: {
        shader: this.phongShader,
        uniforms: { albedo: vec4.fromValues(0.0, 1.0, 0.0, 0.8) },
        state: {}
      },
      geometry: this.renderer.createGeometry(axesCollection['Y']),
      transform: new Transform()
    };
    const zViewDrawable = {
      material: {
        shader: this.phongShader,
        uniforms: { albedo: vec4.fromValues(0.0, 0.0, 1.0, 0.8) },
        state: {}
      },
      geometry: this.renderer.createGeometry(axesCollection['Z']),
      transform: new Transform()
    };

    this.xAxisController = new AxisController(
      this.renderer,
      this.camera,
      this.targetTransform,
      xViewDrawable,
      xIdDrawable,
      vec3.fromValues(1.0, 0.0, 0.0)
    );
    this.yAxisController = new AxisController(
      this.renderer,
      this.camera,
      this.targetTransform,
      yViewDrawable,
      yIdDrawable,
      vec3.fromValues(0.0, 1.0, 0.0)
    );
    this.zAxisController = new AxisController(
      this.renderer,
      this.camera,
      this.targetTransform,
      zViewDrawable,
      zIdDrawable,
      vec3.fromValues(0.0, 0.0, 1.0)
    );
  }

  private createPlanes() {
    // planes
    const xyPlaneFlatDrawable = {
      material: {
        shader: this.flatShader,
        uniforms: { albedo: vec4.fromValues(1.0, 1.0, 0.0, 0.5) },
        state: { cullFace: false }
      },
      geometry: this.renderer.createGeometry(createXYRect(0.35, false)),
      transform: new Transform()
    };
    const xyPlaneWiredDrawable = {
      material: {
        shader: this.flatShader,
        uniforms: { albedo: vec4.fromValues(0.0, 0.0, 0.0, 1.0) },
        state: {}
      },
      geometry: this.renderer.createGeometry(
        createXYRect(0.35, true),
        WebGL2RenderingContext.LINES
      ),
      transform: new Transform()
    };
    const xzPlaneFlatDrawable = {
      material: {
        shader: this.flatShader,
        uniforms: { albedo: vec4.fromValues(1.0, 1.0, 0.0, 0.5) },
        state: { cullFace: false }
      },
      geometry: this.renderer.createGeometry(createXZRect(0.35, false)),
      transform: new Transform()
    };
    const xzPlaneWiredDrawable = {
      material: {
        shader: this.flatShader,
        uniforms: { albedo: vec4.fromValues(0.0, 0.0, 0.0, 1.0) },
        state: {}
      },
      geometry: this.renderer.createGeometry(
        createXZRect(0.35, true),
        WebGL2RenderingContext.LINES
      ),
      transform: new Transform()
    };

    const yzPlaneFlatDrawable = {
      material: {
        shader: this.flatShader,
        uniforms: { albedo: vec4.fromValues(1.0, 1.0, 0.0, 0.5) },
        state: { cullFace: false }
      },
      geometry: this.renderer.createGeometry(createYZRect(0.35, false)),
      transform: new Transform()
    };
    const yzPlaneWiredDrawable = {
      material: {
        shader: this.flatShader,
        uniforms: { albedo: vec4.fromValues(0.0, 0.0, 0.0, 1.0) },
        state: {}
      },
      geometry: this.renderer.createGeometry(
        createYZRect(0.35, true),
        WebGL2RenderingContext.LINES
      ),
      transform: new Transform()
    };

    this.xyPlaneController = new PlaneController(
      this.renderer,
      this.camera,
      this.targetTransform,
      xyPlaneWiredDrawable,
      xyPlaneFlatDrawable,
      vec3.fromValues(0.0, 0.0, 1.0)
    );

    this.xzPlaneController = new PlaneController(
      this.renderer,
      this.camera,
      this.targetTransform,
      xzPlaneWiredDrawable,
      xzPlaneFlatDrawable,
      vec3.fromValues(0.0, 1.0, 0.0)
    );

    this.yzPlaneController = new PlaneController(
      this.renderer,
      this.camera,
      this.targetTransform,
      yzPlaneWiredDrawable,
      yzPlaneFlatDrawable,
      vec3.fromValues(1.0, 0.0, 0.0)
    );
  }

  private createCircles() {
    const xyCircleFlatDrawable = {
      material: {
        shader: this.flatShader,
        uniforms: { albedo: vec4.fromValues(1.0, 1.0, 0.0, 0.5) },
        state: { cullFace: false }
      },
      geometry: this.renderer.createGeometry(createXYCircle(0.75, false)),
      transform: new Transform()
    };
    const xyCircleWiredDrawable = {
      material: {
        shader: this.flatShader,
        uniforms: { albedo: vec4.fromValues(0.0, 0.0, 0.0, 1.0) },
        state: {}
      },
      geometry: this.renderer.createGeometry(
        createXYCircle(0.75, true),
        WebGL2RenderingContext.LINES
      ),
      transform: new Transform()
    };

    const xzCircleFlatDrawable = {
      material: {
        shader: this.flatShader,
        uniforms: { albedo: vec4.fromValues(1.0, 1.0, 0.0, 0.5) },
        state: { cullFace: false }
      },
      geometry: this.renderer.createGeometry(createXZCircle(0.75, false)),
      transform: new Transform()
    };
    const xzCircleWiredDrawable = {
      material: {
        shader: this.flatShader,
        uniforms: { albedo: vec4.fromValues(0.0, 0.0, 0.0, 1.0) },
        state: {}
      },
      geometry: this.renderer.createGeometry(
        createXZCircle(0.75, true),
        WebGL2RenderingContext.LINES
      ),
      transform: new Transform()
    };

    const yzCircleFlatDrawable = {
      material: {
        shader: this.flatShader,
        uniforms: { albedo: vec4.fromValues(1.0, 1.0, 0.0, 0.5) },
        state: { cullFace: false }
      },
      geometry: this.renderer.createGeometry(createYZCircle(0.75, false)),
      transform: new Transform()
    };
    const yzCircleWiredDrawable = {
      material: {
        shader: this.flatShader,
        uniforms: { albedo: vec4.fromValues(0.0, 0.0, 0.0, 1.0) },
        state: {}
      },
      geometry: this.renderer.createGeometry(
        createYZCircle(0.75, true),
        WebGL2RenderingContext.LINES
      ),
      transform: new Transform()
    };

    this.xyCircleController = new CircleController(
      this.renderer,
      this.camera,
      this.targetTransform,
      xyCircleWiredDrawable,
      xyCircleFlatDrawable,
      vec3.fromValues(0.0, 0.0, 1.0)
    );

    this.xzCircleController = new CircleController(
      this.renderer,
      this.camera,
      this.targetTransform,
      xzCircleWiredDrawable,
      xzCircleFlatDrawable,
      vec3.fromValues(0.0, 1.0, 0.0)
    );

    this.yzCircleController = new CircleController(
      this.renderer,
      this.camera,
      this.targetTransform,
      yzCircleWiredDrawable,
      yzCircleFlatDrawable,
      vec3.fromValues(1.0, 0.0, 0.0)
    );
  }

  private getScaling() {
    const offset = vec3.subtract(
      vec3.create(),
      this.targetTransform.position,
      this.camera.position
    );
    const lookAt = vec3.clone(this.camera.forward);
    vec3.normalize(lookAt, lookAt);
    const distance = vec3.dot(lookAt, offset);
    return vec3.fromValues(
      distance / PERCIEVED_UNIT_DISTANCE,
      distance / PERCIEVED_UNIT_DISTANCE,
      distance / PERCIEVED_UNIT_DISTANCE
    );
  }
}

/**
 * returns [s, t]
 */
const closest = (p0: vec3, d0: vec3, p1: vec3, d1: vec3): vec2 => {
  const r = vec3.sub(vec3.create(), p0, p1);
  const a = vec3.dot(d0, d0);
  const b = vec3.dot(d0, d1);
  const c = vec3.dot(d0, r);
  const e = vec3.dot(d1, d1);
  const f = vec3.dot(d1, r);
  const d = a * e - b * b;
  return vec2.fromValues((b * f - c * e) / d, (a * f - b * c) / d);
};

/**
 *
 */
const linePlane = (l0: vec3, ld: vec3, p0: vec3, pn: vec3): vec3 => {
  const r = vec3.sub(vec3.create(), p0, l0);
  const d = vec3.dot(pn, r) / vec3.dot(pn, ld);
  return vec3.scaleAndAdd(r, l0, ld, d);
};
