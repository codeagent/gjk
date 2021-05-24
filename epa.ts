import value from '*.json';
import { vec2, vec3 } from 'gl-matrix';
import { gjk } from './gjk';
import { PriorityQueue } from './priority-queue';

export namespace epa {
  export interface Face<T extends object> {
    vertices: T[];
    loop: WeakMap<T, T>; // v(i) -> v(i+1)
    siblings: WeakMap<T, Face<T>>; // v -> face
    distance: number;
  }

  export type Polytop<T extends object = vec3> = PriorityQueue<Face<T>>;

  const calcFaceDistance = (face: Face<vec3>) => {
    const O = vec3.create();
    const a = vec3.create();
    const x = vec3.create();
    vec3.subtract(a, face.vertices[1], face.vertices[0]);
    vec3.subtract(x, face.vertices[1], face.vertices[0]);
    vec3.cross(x, a, x);
    face.distance = Math.abs(vec3.dot(O, x)) / vec3.length(x);
  };

  const makeLoop = <T extends object>(values: T[]): WeakMap<T, T> => {
    const loop = new WeakMap<T, T>();
    for (let i = 0; i < values.length; i++) {
      loop.set(values[i], values[(i + 1) % values.length]);
    }
    return loop;
  };

  export const polytopFromSimplex = (simplex: gjk.Simplex<vec3>): Polytop => {
    const vertices = Array.from(simplex);

    const w0 = vertices[0];
    const w1 = vertices[1];
    const w2 = vertices[2];
    const w3 = vertices[3];
    const w1w0 = vec3.create();
    const w2w0 = vec3.create();

    vec3.subtract(w1w0, w1, w0);
    vec3.subtract(w2w0, w2, w0);

    const x = vec3.create();
    vec3.cross(x, w2w0, w1w0);

    const w3w0 = vec3.create();
    vec3.subtract(w3w0, vertices[3], vertices[0]);

    // preserve ccw orientation: swap w1 and w2
    // @todo:??
    if (vec3.dot(w3w0, x) > 0.0) {
      const tmp = vertices[2];
      vertices[2] = vertices[1];
      vertices[1] = tmp;
    }

    const face0: Face<vec3> = {
      vertices: [w0, w1, w3],
      loop: makeLoop([w0, w1, w3]),
      siblings: null,
      distance: 0.0
    };

    const face1: Face<vec3> = {
      vertices: [w1, w2, w3],
      loop: makeLoop([w1, w2, w3]),
      siblings: null,
      distance: 0.0
    };

    const face2: Face<vec3> = {
      vertices: [w2, w0, w3],
      loop: makeLoop([w2, w0, w3]),
      siblings: null,
      distance: 0.0
    };

    const face3: Face<vec3> = {
      vertices: [w1, w0, w2],
      loop: makeLoop([w1, w0, w2]),
      siblings: null,
      distance: 0.0
    };

    face0.siblings = new WeakMap<vec3, Face<vec3>>([
      [w0, face3],
      [w1, face1],
      [w3, face2]
    ]);
    face1.siblings = new WeakMap<vec3, Face<vec3>>([
      [w1, face3],
      [w2, face2],
      [w3, face0]
    ]);
    face2.siblings = new WeakMap<vec3, Face<vec3>>([
      [w2, face3],
      [w0, face0],
      [w3, face1]
    ]);
    face3.siblings = new WeakMap<vec3, Face<vec3>>([
      [w1, face0],
      [w0, face2],
      [w2, face1]
    ]);

    const queue = new PriorityQueue<Face<vec3>>(
      (a: Face<vec3>, b: Face<vec3>) => a.distance - b.distance
    );

    for (let face of [face0, face1, face2, face3]) {
      calcFaceDistance(face);
      queue.enqueue(face);
    }

    return queue;
  };

  export const subdivide = (polytop: Polytop, shape: gjk.ShapeInterface) => {
    const O = vec3.create();
    const face = polytop.dequeue();

    const w0 = face.vertices[0];
    const w1 = face.vertices[1];
    const w2 = face.vertices[2];

    // Closest to face
    const b3 = vec3.create();
    gjk.closestPointToTriangle(b3, w0, w1, w2, O);

    const w4 = vec3.create();
    gjk.fromBarycentric(w4, [w0, w1, w2], b3);
    shape.support(w4, w4);

    // w0-w1
    const b2 = vec2.create();
    gjk.closestPointToLineSegment(b2, w0, w1, O);
    const w0h = vec3.create();
    gjk.fromBarycentric(w0h, [w0, w1], b2);
    shape.support(w0h, w0h);

    // w1-w2
    gjk.closestPointToLineSegment(b2, w1, w2, O);
    const w1h = vec3.create();
    gjk.fromBarycentric(w1h, [w1, w2], b2);
    shape.support(w1h, w1h);

    // w2-w0
    gjk.closestPointToLineSegment(b2, w2, w0, O);
    const w2h = vec3.create();
    gjk.fromBarycentric(w2h, [w2, w0], b2);
    shape.support(w2h, w2h);

    // split current face
    const f0 = {
      vertices: [w0, w4, w2h],
      loop: makeLoop([w0, w4, w2h]),
      siblings: null,
      distance: 0.0
    };
    const f1 = {
      vertices: [w0, w0h, w4],
      loop: makeLoop([w0, w0h, w4]),
      siblings: null,
      distance: 0.0
    };

    const f2 = {
      vertices: [w1, w4, w0h],
      loop: makeLoop([w1, w4, w0h]),
      siblings: null,
      distance: 0.0
    };
    const f3 = {
      vertices: [w1, w1h, w4],
      loop: makeLoop([w1, w1h, w4]),
      siblings: null,
      distance: 0.0
    };

    const f4 = {
      vertices: [w2, w4, w1h],
      loop: makeLoop([w2, w4, w1h]),
      siblings: null,
      distance: 0.0
    };
    const f5 = {
      vertices: [w2, w2h, w4],
      loop: makeLoop([w2, w2h, w4]),
      siblings: null,
      distance: 0.0
    };

    // split sibling0
    const s0 = face.siblings.get(w0);
    const ws0 = s0.loop.get(w0);
    const sf0 = {
      vertices: [ws0, w0h, w0],
      loop: makeLoop([ws0, w0h, w0]),
      siblings: null,
      distance: 0.0
    };
    const sf1 = {
      vertices: [ws0, w1, w0h],
      loop: makeLoop([ws0, w1, w0h]),
      siblings: null,
      distance: 0.0
    };

    // split sibling1
    const s1 = face.siblings.get(w1);
    const ws1 = s1.loop.get(w1);
    const sf2 = {
      vertices: [ws1, w1h, w1],
      loop: makeLoop([ws1, w1h, w1]),
      siblings: null,
      distance: 0.0
    };
    const sf3 = {
      vertices: [ws1, w2, w1h],
      loop: makeLoop([ws1, w2, w1h]),
      siblings: null,
      distance: 0.0
    };

    // split sibling2
    const s2 = face.siblings.get(w2);
    const ws2 = s2.loop.get(w2);
    const sf4 = {
      vertices: [ws2, w2h, w2],
      loop: makeLoop([ws2, w2h, w2]),
      siblings: null,
      distance: 0.0
    };
    const sf5 = {
      vertices: [ws2, w0, w2h],
      loop: makeLoop([ws2, w0, w2h]),
      siblings: null,
      distance: 0.0
    };

    // assignning to neighbours
    f0.siblings = new WeakMap([[w0, f1], [w4, f5], [w2h, sf5]]);
    f1.siblings = new WeakMap([[w0, sf0], [w0h, f2], [w4, f0]]);
    f2.siblings = new WeakMap([[w1, f3], [w4, f1], [w0h, sf1]]);
    f3.siblings = new WeakMap([[w1, sf2], [w1h, f4], [w4, f2]]);
    f4.siblings = new WeakMap([[w2, f5], [w4, f3], [w1h, sf3]]);
    f5.siblings = new WeakMap([[w2, sf4], [w2h, f0], [w4, f4]]);

    const s00 = s0.siblings.get(w0);
    sf0.siblings = new WeakMap([[ws0, sf1], [w0h, f1], [w0, s00]]);
    s00.siblings.set(ws0, sf0);

    const s01 = s0.siblings.get(ws0);
    sf1.siblings = new WeakMap([[ws0, s01], [w1, f2], [w0h, sf0]]);
    s01.siblings.set(w1, sf1);

    const s10 = s1.siblings.get(w1);
    sf2.siblings = new WeakMap([[ws1, sf3], [w1h, f3], [w1, s10]]);
    s01.siblings.set(ws1, sf2);

    const s11 = s1.siblings.get(ws1);
    sf3.siblings = new WeakMap([[ws1, s11], [w2, f4], [w1h, sf2]]);
    s11.siblings.set(w2, sf3);

    const s20 = s2.siblings.get(w2);
    sf4.siblings = new WeakMap([[ws2, sf5], [w2h, f5], [w2, s20]]);
    s20.siblings.set(ws2, sf4);

    const s21 = s2.siblings.get(ws2);
    sf5.siblings = new WeakMap([[ws2, s21], [w0, f0], [w2h, sf4]]);
    s21.siblings.set(w0, sf5);

    // remove siblings
    polytop.remove(s0);
    polytop.remove(s1);
    polytop.remove(s2);

    // insert newly generated faces
    for (let face of [f0, f1, f2, f3, f4, f5, sf0, sf1, sf2, sf3, sf4, sf5]) {
      calcFaceDistance(face);
      polytop.enqueue(face);
    }
  };

  export const contactNormal = (
    shape0: gjk.ShapeInterface,
    shape1: gjk.ShapeInterface,
    simplex: gjk.Simplex<gjk.SupportPoint>
  ): vec3 => {
    return vec3.fromValues(0.0, 0.0, 0.0);
  };
}
