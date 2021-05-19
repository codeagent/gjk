import { mat3, mat4, vec3 } from 'gl-matrix';

/**
 * http://www.dtecta.com/papers/jgt98convex.pdf
 */

interface ISupportMappable {
  support(out: vec3, transform: mat4, dir: vec3): vec3;
}

export class Polyhedra implements ISupportMappable {
  constructor(public readonly hull: vec3[]) {}

  support(out: vec3, transform: mat4, dir: vec3): vec3 {
    const t = mat3.fromMat4(mat3.create(), transform);
    mat3.transpose(t, t);
    const v = vec3.transformMat3(vec3.create(), dir, t);

    let maxDot = Number.NEGATIVE_INFINITY;
    vec3.copy(out, this.hull[0]);

    for (let i = 1; i < this.hull.length; i++) {
      const dot = vec3.dot(v, this.hull[i]);
      if (dot > maxDot) {
        maxDot = dot;
        vec3.copy(out, this.hull[i]);
      }
    }

    if (!isFinite(maxDot)) {
      debugger;
    }

    return vec3.transformMat4(out, out, transform);
  }
}

export class Sphere implements ISupportMappable {
  constructor(public readonly radius: number) {}

  support(out: vec3, transform: mat4, dir: vec3): vec3 {
    const t = mat3.fromMat4(mat3.create(), transform);
    mat3.transpose(t, t);
    vec3.transformMat3(out, dir, t);
    vec3.normalize(out, out);
    vec3.scale(out, out, this.radius);
    return vec3.transformMat4(out, out, transform);
  }
}

export class Box implements ISupportMappable {
  constructor(public readonly extents: vec3) {}

  support(out: vec3, transform: mat4, dir: vec3): vec3 {
    const t = mat3.fromMat4(mat3.create(), transform);
    mat3.transpose(t, t);
    vec3.transformMat3(out, dir, t);

    vec3.set(
      out,
      Math.sign(out[0]) * this.extents[0],
      Math.sign(out[1]) * this.extents[1],
      Math.sign(out[2]) * this.extents[2]
    );

    return vec3.transformMat4(out, out, transform);
  }
}

export class Cone implements ISupportMappable {
  constructor(public readonly height: number, public readonly radius: number) {}

  support(out: vec3, transform: mat4, dir: vec3): vec3 {
    const t = mat3.fromMat4(mat3.create(), transform);
    mat3.transpose(t, t);
    vec3.transformMat3(out, dir, t);

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

    return vec3.transformMat4(out, out, transform);
  }
}

export class Cylinder implements ISupportMappable {
  constructor(public readonly height: number, public readonly radius: number) {}

  support(out: vec3, transform: mat4, dir: vec3): vec3 {
    const t = mat3.fromMat4(mat3.create(), transform);
    mat3.transpose(t, t);
    vec3.transformMat3(out, dir, t);

    const sigma = Math.sqrt(out[0] * out[0] + out[2] * out[2]);

    if (sigma > 0.0) {
      const fr = this.radius / sigma;
      vec3.set(
        out,
        fr * out[0],
        Math.sign(dir[1]) * this.height * 0.5,
        fr * out[2]
      );
    } else {
      vec3.set(out, 0.0, Math.sign(dir[1]) * this.height * 0.5, 0.0);
    }

    return vec3.transformMat4(out, out, transform);
  }
}