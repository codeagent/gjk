import { glMatrix, mat4 } from 'gl-matrix';
import { Transform } from './transform';

export class Camera extends Transform {
  get view() {
    mat4.invert(this._view, this.transform);
    return this._view;
  }

  get projection() {
    return this._projection;
  }

  protected _view: mat4 = mat4.create();
  protected _projection: mat4 = mat4.create();

  constructor(
    public readonly fov: number,
    public readonly aspect: number,
    public readonly near: number,
    public readonly far: number
  ) {
    super();

    mat4.perspective(
      this._projection,
      glMatrix.toRadian(this.fov),
      this.aspect,
      this.near,
      this.far
    );

    // mat4.ortho(
    //   this._projection,
    //   -3.0,
    //   3.0,
    //   -2.0,
    //   2.0,

    //   -10,
    //   10
    // );
  }
}
