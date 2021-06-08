import { vec2, vec3, vec4 } from 'gl-matrix';

import { ShapeInterface, MinkowskiDifference } from './shape';
import {
  Simplex,
  SupportPoint,
  closestPointToLineSegment,
  fromBarycentric,
  closestPointToTriangle,
  closestPointToTetrahedron,
  origin
} from './math';

export const closestPoints = (
  outSimplex: Simplex<SupportPoint>,
  outClosests: [vec3, vec3],
  shape0: ShapeInterface,
  shape1: ShapeInterface,
  dir: vec3,
  epsilon = 1.0e-2,
  maxIterations = 25
): number => {
  epsilon = epsilon * epsilon;

  const d = vec3.clone(dir);
  const monkowski = new MinkowskiDifference(shape0, shape1);

  outSimplex.add(
    monkowski.support(
      {
        support0: vec3.create(),
        support1: vec3.create(),
        diff: vec3.create()
      },
      d
    )
  );

  while (--maxIterations >= 0) {
    if (outSimplex.size === 1) {
      const p = Array.from(outSimplex.values());
      vec3.copy(d, p[0].diff);
    } else if (outSimplex.size === 2) {
      const p = Array.from(outSimplex.values());
      const b = vec2.create();
      closestPointToLineSegment(b, p[0].diff, p[1].diff, origin);
      for (let i = 0; i < 2; i++) {
        if (b[i] === 0) {
          outSimplex.delete(p[i]);
        }
      }
      fromBarycentric(d, b, p[0].diff, p[1].diff);
    } else if (outSimplex.size === 3) {
      const p = Array.from(outSimplex.values());
      const b = vec3.create();
      closestPointToTriangle(b, p[0].diff, p[1].diff, p[2].diff, origin);
      for (let i = 0; i < 3; i++) {
        if (b[i] === 0) {
          outSimplex.delete(p[i]);
        }
      }
      fromBarycentric(d, b, p[0].diff, p[1].diff, p[2].diff);
    } else {
      const p = Array.from(outSimplex.values());
      const b = vec4.create();
      closestPointToTetrahedron(
        b,
        p[0].diff,
        p[1].diff,
        p[2].diff,
        p[3].diff,
        origin
      );
      if (b[0] < 0 || b[1] < 0 || b[2] < 0 || b[3] < 0) {
        return 0.0;
      }
      for (let i = 0; i < 4; i++) {
        if (b[i] === 0) {
          outSimplex.delete(p[i]);
        }
      }
      fromBarycentric(d, b, p[0].diff, p[1].diff, p[2].diff, p[3].diff);
    }

    if (isNaN(d[0]) || isNaN(d[1]) || isNaN(d[2])) {
      debugger;
    }

    const s = monkowski.support(
      {
        support0: vec3.create(),
        support1: vec3.create(),
        diff: vec3.create()
      },
      vec3.fromValues(-d[0], -d[1], -d[2])
    );

    // no more extent in -d direction
    const upper = vec3.dot(d, d);
    const lower = vec3.dot(s.diff, d);
    if (upper - lower < epsilon) {
      if (outSimplex.size === 1) {
        const p = Array.from(outSimplex.values());
        outClosests[0] = p[0].support0;
        outClosests[1] = p[0].support1;
      } else if (outSimplex.size == 2) {
        const p = Array.from(outSimplex.values());
        const b = vec2.create();
        closestPointToLineSegment(b, p[0].diff, p[1].diff, origin);
        fromBarycentric(outClosests[0], b, p[0].support0, p[1].support0);
        fromBarycentric(outClosests[1], b, p[0].support1, p[1].support1);
      } else if (outSimplex.size === 3) {
        const p = Array.from(outSimplex.values());
        const b = vec3.create();
        closestPointToTriangle(b, p[0].diff, p[1].diff, p[2].diff, origin);
        fromBarycentric(
          outClosests[0],
          b,
          p[0].support0,
          p[1].support0,
          p[2].support0
        );
        fromBarycentric(
          outClosests[1],
          b,
          p[0].support1,
          p[1].support1,
          p[2].support1
        );
      } else {
        debugger;
      }
      return vec3.length(d);
    }
    outSimplex.add(s);
  }
  return vec3.length(d);
};

export const areIntersect = (
  outSimplex: Simplex<SupportPoint>,
  shape0: ShapeInterface,
  shape1: ShapeInterface,
  dir: vec3,
  epsilon = 1.0e-2,
  maxIterations = 25
): boolean => {
  epsilon = epsilon * epsilon; // work with squares (for tiny gain of performance)

  const monkowski = new MinkowskiDifference(shape0, shape1);
  const d = vec3.clone(dir);
  outSimplex.add(
    monkowski.support(
      {
        support0: vec3.create(),
        support1: vec3.create(),
        diff: vec3.create()
      },
      d
    )
  );

  while (--maxIterations >= 0) {
    if (outSimplex.size === 1) {
      const p = Array.from(outSimplex.values());
      vec3.copy(d, p[0].diff);

      // closest point is too close to origin
      if (vec3.dot(d, d) < epsilon) {
        return true;
      }
    } else if (outSimplex.size === 2) {
      const p = Array.from(outSimplex.values());
      const b = vec2.create();
      closestPointToLineSegment(b, p[0].diff, p[1].diff, origin);
      for (let i = 0; i < 2; i++) {
        if (b[i] === 0) {
          outSimplex.delete(p[i]);
        }
      }
      fromBarycentric(d, b, p[0].diff, p[1].diff);

      // too close to line, return as having intersecton
      if (vec3.dot(d, d) < epsilon) {
        return true;
      }
    } else if (outSimplex.size === 3) {
      const p = Array.from(outSimplex.values());
      const b = vec3.create();
      closestPointToTriangle(b, p[0].diff, p[1].diff, p[2].diff, origin);
      for (let i = 0; i < 3; i++) {
        if (b[i] === 0) {
          outSimplex.delete(p[i]);
        }
      }
      fromBarycentric(d, b, p[0].diff, p[1].diff, p[2].diff);

      // too close to triangle, return as having intersecton
      if (vec3.dot(d, d) < epsilon) {
        return true;
      }
    } else {
      const p = Array.from(outSimplex.values());
      const b = vec4.create();
      closestPointToTetrahedron(
        b,
        p[0].diff,
        p[1].diff,
        p[2].diff,
        p[3].diff,
        origin
      );
      // in tetrahedron, return as having intersecton
      if (b[0] < 0 || b[1] < 0 || b[2] < 0 || b[3] < 0) {
        return true;
      }
      for (let i = 0; i < 4; i++) {
        if (b[i] === 0) {
          outSimplex.delete(p[i]);
        }
      }
      fromBarycentric(d, b, p[0].diff, p[1].diff, p[2].diff, p[3].diff);
    }

    if (isNaN(d[0]) || isNaN(d[1]) || isNaN(d[2])) {
      debugger;
    }

    const s = monkowski.support(
      {
        support0: vec3.create(),
        support1: vec3.create(),
        diff: vec3.create()
      },
      vec3.fromValues(-d[0], -d[1], -d[2])
    );

    // no more extent in -d direction
    const upper = vec3.dot(d, d);
    const lower = vec3.dot(s.diff, d);
    if (upper - lower < epsilon) {
      return false;
    }

    outSimplex.add(s);
  }

  return false;
};
