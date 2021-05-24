import { mat3, vec3 } from 'gl-matrix';

import { Transform } from './graphics';

/**
 * http://www.dtecta.com/papers/jgt98convex.pdf
 */

interface ShapeInterface {
  support(out: vec3, dir: vec3): vec3;
  origin: vec3;
}

export class Polyhedra implements ShapeInterface {
  get origin(): vec3 {
    return this.transform.position;
  }

  private _t = mat3.create();
  private _v = vec3.create();

  constructor(
    public readonly hull: vec3[],
    public readonly transform: Transform
  ) {}

  support(out: vec3, dir: vec3): vec3 {
    mat3.fromMat4(this._t, this.transform.transform);
    mat3.transpose(this._t, this._t);
    vec3.transformMat3(this._v, dir, this._t);

    let maxDot = Number.NEGATIVE_INFINITY;
    vec3.copy(out, this.hull[1]);

    for (let i = 0; i < this.hull.length; i++) {
      const dot = vec3.dot(this._v, this.hull[i]);
      if (dot > maxDot) {
        maxDot = dot;
        vec3.copy(out, this.hull[i]);
      }
    }

    if (!isFinite(maxDot)) {
      debugger;
    }

    return vec3.transformMat4(out, out, this.transform.transform);
  }
}

export class Sphere implements ShapeInterface {
  get origin(): vec3 {
    return this.transform.position;
  }
  private _t = mat3.create();

  constructor(
    public readonly radius: number,
    public readonly transform: Transform
  ) {}

  support(out: vec3, dir: vec3): vec3 {
    mat3.fromMat4(this._t, this.transform.transform);
    mat3.transpose(this._t, this._t);
    vec3.transformMat3(out, dir, this._t);
    vec3.normalize(out, out);
    vec3.scale(out, out, this.radius);
    return vec3.transformMat4(out, out, this.transform.transform);
  }
}

export class Box implements ShapeInterface {
  get origin(): vec3 {
    return this.transform.position;
  }
  private _t = mat3.create();

  constructor(
    public readonly extents: vec3,
    public readonly transform: Transform
  ) {}

  support(out: vec3, dir: vec3): vec3 {
    mat3.fromMat4(this._t, this.transform.transform);
    mat3.transpose(this._t, this._t);
    vec3.transformMat3(out, dir, this._t);
    vec3.set(
      out,
      Math.sign(out[0]) * this.extents[0],
      Math.sign(out[1]) * this.extents[1],
      Math.sign(out[2]) * this.extents[2]
    );
    return vec3.transformMat4(out, out, this.transform.transform);
  }
}

export class Cone implements ShapeInterface {
  get origin(): vec3 {
    return this.transform.position;
  }
  private _t = mat3.create();

  constructor(
    public readonly height: number,
    public readonly radius: number,
    public readonly transform: Transform
  ) {}

  support(out: vec3, dir: vec3): vec3 {
    mat3.fromMat4(this._t, this.transform.transform);
    mat3.transpose(this._t, this._t);
    vec3.transformMat3(out, dir, this._t);

    const sinA =
      this.radius /
      Math.sqrt(this.radius * this.radius + this.height * this.height);
    const sigma = Math.sqrt(out[0] * out[0] + out[2] * out[2]);

    if (out[1] > vec3.len(out) * sinA) {
      vec3.set(out, 0.0, this.height * 0.5, 0.0);
    } else if (sigma > 0.0) {
      const fr = this.radius / sigma;
      vec3.set(out, fr * out[0], -this.height * 0.5, fr * out[2]);
    } else {
      vec3.set(out, 0.0, -this.height * 0.5, 0.0);
    }

    return vec3.transformMat4(out, out, this.transform.transform);
  }
}

export class Cylinder implements ShapeInterface {
  get origin(): vec3 {
    return this.transform.position;
  }
  private _t = mat3.create();

  constructor(
    public readonly height: number,
    public readonly radius: number,
    public readonly transform: Transform
  ) {}

  support(out: vec3, dir: vec3): vec3 {
    mat3.fromMat4(this._t, this.transform.transform);
    mat3.transpose(this._t, this._t);
    vec3.transformMat3(out, dir, this._t);

    const sigma = Math.sqrt(out[0] * out[0] + out[2] * out[2]);

    if (sigma > 0.0) {
      const fr = this.radius / sigma;
      vec3.set(
        out,
        fr * out[0],
        Math.sign(out[1]) * this.height * 0.5,
        fr * out[2]
      );
    } else {
      vec3.set(out, 0.0, Math.sign(out[1]) * this.height * 0.5, 0.0);
    }

    return vec3.transformMat4(out, out, this.transform.transform);
  }
}
