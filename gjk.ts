import { mat4, vec2, vec3, vec4 } from 'gl-matrix';

export namespace gjk {
  /**
   * out = (a, [b, c])
   */
  const tmp = vec3.create();
  const mixed = (a: vec3, b: vec3, c: vec3) => {
    vec3.cross(tmp, b, c);
    return vec3.dot(a, tmp);
  };

  export const fromBarycentric = <T extends ArrayLike<number>>(
    out: vec3,
    points: vec3[],
    barycentric: T
  ) => {
    vec3.set(out, 0.0, 0.0, 0.0);
    for (let i = 0; i < barycentric.length; i++) {
      vec3.scaleAndAdd(out, out, points[i], barycentric[i]);
    }

    return out;
  };

  export interface ISupportMappable {
    support(out: vec3, transform: mat4, dir: vec3): vec3;
  }

  /**
   * out - barycetric coords
   */
  export const closestPointToTetrahedron = (
    out: vec4,
    a: vec3,
    b: vec3,
    c: vec3,
    d: vec3,
    p: vec3
  ): vec4 => {
    // check voronoi region of a
    const ap = vec3.subtract(vec3.create(), p, a);
    const ab = vec3.subtract(vec3.create(), b, a);
    const ac = vec3.subtract(vec3.create(), c, a);
    const ad = vec3.subtract(vec3.create(), d, a);
    const apOab = vec3.dot(ap, ab);
    const apOac = vec3.dot(ap, ac);
    const apOad = vec3.dot(ap, ad);

    if (apOab <= 0 && apOac <= 0 && apOad <= 0) {
      return vec4.set(out, 1.0, 0.0, 0.0, 0.0);
    }

    // check voronoi region of b
    const bp = vec3.subtract(vec3.create(), p, b);
    const bc = vec3.subtract(vec3.create(), c, b);
    const bd = vec3.subtract(vec3.create(), d, b);
    const bpOba = -vec3.dot(bp, ab);
    const bpObc = vec3.dot(bp, bc);
    const bpObd = vec3.dot(bp, bd);

    if (bpOba <= 0 && bpObc <= 0 && bpObd <= 0) {
      return vec4.set(out, 0.0, 1.0, 0.0, 0.0);
    }

    // check voronoi region of c
    const cp = vec3.subtract(vec3.create(), p, c);
    const cd = vec3.subtract(vec3.create(), d, c);
    const cpOca = -vec3.dot(cp, ac);
    const cpOcb = -vec3.dot(cp, bc);
    const cpOcd = vec3.dot(cp, cd);

    if (cpOca <= 0 && cpOcb <= 0 && cpOcd <= 0) {
      return vec4.set(out, 0.0, 0.0, 1.0, 0.0);
    }

    // check voronoi region of d
    const dp = vec3.subtract(vec3.create(), p, d);
    const dpOda = -vec3.dot(dp, ad);
    const dpOdb = -vec3.dot(dp, bd);
    const dpOdc = -vec3.dot(dp, cd);

    if (dpOda <= 0 && dpOdb <= 0 && dpOdc <= 0) {
      return vec4.set(out, 0.0, 0.0, 0.0, 1.0);
    }

    // check voronoi region of ab edge
    const nAbc = vec3.cross(vec3.create(), ab, ac);
    const nAbd = vec3.cross(vec3.create(), ad, ab);
    const apOabXnAbc = mixed(ap, ab, nAbc);
    const apOnAbdXab = mixed(ap, nAbd, ab);
    if (apOab >= 0 && bpOba >= 0 && apOabXnAbc >= 0 && apOnAbdXab >= 0) {
      const t = apOab / vec3.dot(ab, ab);
      return vec4.set(out, 1.0 - t, t, 0.0, 0.0);
    }

    // check voronoi region of ac edge
    const nAcd = vec3.cross(vec3.create(), ac, ad);
    const apOnAbcXac = mixed(ap, nAbc, ac);
    const apOacXnAcd = mixed(ap, ac, nAcd);
    if (apOac >= 0 && cpOca >= 0 && apOnAbcXac >= 0 && apOacXnAcd >= 0) {
      const t = apOac / vec3.dot(ac, ac);
      return vec4.set(out, 1.0 - t, 0.0, t, 0.0);
    }

    // check voronoi region of ad edge
    const apOnAcdXad = mixed(ap, nAcd, ad);
    const apOadXnAbd = mixed(ap, ad, nAbd);
    if (apOad >= 0 && dpOda >= 0 && apOnAcdXad >= 0 && apOadXnAbd >= 0) {
      const t = apOad / vec3.dot(ad, ad);
      vec4.set(out, 1.0 - t, 0.0, 0.0, t);
      return;
    }

    // check voronoi region of bc edge
    const nBcd = vec3.cross(vec3.create(), bd, bc);
    const bpObcXnAbc = mixed(bp, bc, nAbc);
    const bpOnBcdXbc = mixed(bp, nBcd, bc);
    if (bpObc >= 0 && cpOcb >= 0 && bpObcXnAbc >= 0 && bpOnBcdXbc >= 0) {
      const t = bpObc / vec3.dot(bc, bc);
      return vec4.set(out, 0.0, 1.0 - t, t, 0.0);
    }

    // check voronoi region of cd edge
    const cpOcdXnAcd = mixed(cp, cd, nAcd);
    const cpOnBcdXcd = mixed(cp, nBcd, cd);
    if (cpOcd >= 0 && dpOdc >= 0 && cpOcdXnAcd >= 0 && cpOnBcdXcd >= 0) {
      const t = cpOcd / vec3.dot(cd, cd);
      return vec4.set(out, 0.0, 0.0, 1.0 - t, t);
    }

    // check voronoi region of bd edge
    const bpOnAbdXbd = mixed(bp, nAbd, bd);
    const bpObdXnBcd = mixed(bp, bd, nBcd);
    if (bpObd >= 0 && dpOdb >= 0 && bpOnAbdXbd >= 0 && bpObdXnBcd >= 0) {
      const t = bpObd / vec3.dot(bd, bd);
      return vec4.set(out, 0.0, 1.0 - t, 0.0, t);
    }

    // find closest point on abc
    if (
      vec3.dot(nAbc, ap) * vec3.dot(nAbc, ad) < 0 &&
      apOabXnAbc < 0 &&
      apOnAbcXac < 0 &&
      bpObcXnAbc < 0
    ) {
      let u = Math.abs(mixed(nAbc, bp, cp));
      let v = Math.abs(mixed(nAbc, cp, ap));
      let w = Math.abs(mixed(nAbc, ap, bp));
      let s = u + v + w;
      u /= s;
      v /= s;
      w /= s;
      return vec4.set(out, u, v, w, 0.0);
    }

    // find closest point on acd
    if (
      vec3.dot(nAcd, ap) * vec3.dot(nAcd, ab) < 0.0 &&
      apOacXnAcd < 0 &&
      apOnAcdXad < 0 &&
      cpOcdXnAcd < 0
    ) {
      let u = Math.abs(mixed(nAcd, cp, dp));
      let v = Math.abs(mixed(nAcd, dp, ap));
      let w = Math.abs(mixed(nAcd, ap, cp));
      let s = u + v + w;
      u /= s;
      v /= s;
      w /= s;
      return vec4.set(out, u, 0.0, v, w);
    }

    // find closest point on adb
    if (
      vec3.dot(nAbd, ap) * vec3.dot(nAbd, ac) < 0.0 &&
      apOnAbdXab < 0 &&
      apOadXnAbd < 0 &&
      bpOnAbdXbd < 0
    ) {
      let u = Math.abs(mixed(nAbd, dp, bp));
      let v = Math.abs(mixed(nAbd, bp, ap));
      let w = Math.abs(mixed(nAbd, ap, dp));
      let s = u + v + w;
      u /= s;
      v /= s;
      w /= s;
      return vec4.set(out, u, w, 0.0, v);
    }

    // find closest point on cbd
    if (
      vec3.dot(nBcd, cp) * vec3.dot(nBcd, ab) > 0.0 &&
      bpOnBcdXbc < 0 &&
      cpOnBcdXcd < 0 &&
      bpObdXnBcd < 0
    ) {
      let u = Math.abs(mixed(nBcd, bp, dp));
      let v = Math.abs(mixed(nBcd, dp, cp));
      let w = Math.abs(mixed(nBcd, cp, bp));
      let s = u + v + w;
      u /= s;
      v /= s;
      w /= s;
      return vec4.set(out, 0.0, v, u, w);
    }

    // we are in tetrahedron itself, return point
    return vec4.set(out, -1.0, -1.0, -1.0, -1.0);
  };

  export const closestPointToTriangle = (
    out: vec3,
    a: vec3,
    b: vec3,
    c: vec3,
    p: vec3
  ): vec3 => {
    const ab = vec3.subtract(vec3.create(), b, a);
    const ac = vec3.subtract(vec3.create(), c, a);
    const bc = vec3.subtract(vec3.create(), c, b);
    const ap = vec3.subtract(vec3.create(), p, a);
    const bp = vec3.subtract(vec3.create(), p, b);
    const cp = vec3.subtract(vec3.create(), p, c);

    // Compute parametric position s for projection P’ of P on AB,
    // P’ = A + s*AB, s = snom/(snom+sdenom)
    const snom = vec3.dot(ap, ab);
    const sdenom = -vec3.dot(bp, ab);

    // Compute parametric position t for projection P’ of P on AC,
    // P’ = A + t*AC, s = tnom/(tnom+tdenom)
    const tnom = vec3.dot(ap, ac);
    const tdenom = -vec3.dot(cp, ac);
    if (snom <= 0.0 && tnom <= 0.0) {
      return vec3.set(out, 1.0, 0.0, 0.0); // Vertex region early out
    }
    // Compute parametric position u for projection P’ of P on BC,
    // P’ = B + u*BC, u = unom/(unom+udenom)
    const unom = vec3.dot(bp, bc);
    const udenom = -vec3.dot(cp, bc);
    if (sdenom <= 0.0 && unom <= 0.0) {
      return vec3.set(out, 0.0, 1.0, 0.0); // Vertex region early out
    }
    if (tdenom <= 0.0 && udenom <= 0.0) {
      return vec3.set(out, 0.0, 0.0, 1.0); // Vertex region early out
    }
    // P is outside (or on) AB if the triple scalar product [N PA PB] <= 0
    const n = vec3.cross(vec3.create(), ab, ac);
    const vc = mixed(n, ap, bp);

    // If P outside AB and within feature region of AB,
    // return projection of P onto AB
    if (vc <= 0.0 && snom >= 0.0 && sdenom >= 0.0) {
      const t = snom / (snom + sdenom);
      return vec3.set(out, 1.0 - t, t, 0.0);
    }

    // P is outside (or on) BC if the triple scalar product [N PB PC] <= 0
    const va = mixed(n, bp, cp);

    // If P outside BC and within feature region of BC,
    // return projection of P onto BC
    if (va <= 0.0 && unom >= 0.0 && udenom >= 0.0) {
      const t = unom / (unom + udenom);
      return vec3.set(out, 0.0, 1.0 - t, t);
    }

    // P is outside (or on) CA if the triple scalar product [N PC PA] <= 0
    const vb = mixed(n, cp, ap);

    // If P outside CA and within feature region of CA,
    // return projection of P onto CA
    if (vb <= 0.0 && tnom >= 0.0 && tdenom >= 0.0) {
      const t = tnom / (tnom + tdenom);
      return vec3.set(out, 1.0 - t, 0.0, t);
    }

    // P must project inside face region. Compute Q using barycentric coordinates
    const u = va / (va + vb + vc);
    const v = vb / (va + vb + vc);
    const w = 1.0 - u - v; // = vc / (va + vb + vc)

    return vec3.set(out, u, v, w);
  };

  export const closestPointToLineSegment = (
    out: vec2,
    a: vec3,
    b: vec3,
    p: vec3
  ): vec2 => {
    const ab = vec3.sub(vec3.create(), b, a);
    const ap = vec3.sub(vec3.create(), p, a);

    // Project c onto ab, computing parameterized position d(t)=a+ t*(b – a)
    let t = vec3.dot(ap, ab) / vec3.dot(ab, ab);

    // If outside segment, clamp t (and therefore d) to the closest endpoint
    if (t < 0.0) {
      t = 0.0;
    }
    if (t > 1.0) {
      t = 1.0;
    }

    return vec2.set(out, 1.0 - t, t);
  };

  interface SupportPoint {
    diff: vec3; // support0 - support1
    support0: vec3;
    support1: vec3;
  }

  export const closestPoints = (
    mappable0: ISupportMappable,
    transform0: mat4,
    mappable1: ISupportMappable,
    transform1: mat4,
    closests: [vec3, vec3],
    epsilon = 1.0e-6,
    maxIterations = 50
  ): number => {
    const support = (dir: vec3) => {
      const support0 = mappable0.support(vec3.create(), transform0, dir);
      const support1 = mappable1.support(
        vec3.create(),
        transform1,
        vec3.fromValues(-dir[0], -dir[1], -dir[2])
      );
      const diff = vec3.subtract(vec3.create(), support0, support1);
      return { support0, support1, diff };
    };

    const o0 = vec3.create();
    const o1 = vec3.create();
    vec3.transformMat4(o0, o0, transform0);
    vec3.transformMat4(o1, o1, transform1);

    const d = vec3.create();
    vec3.sub(d, o0, o1);

    const simplex = new Set<SupportPoint>();
    simplex.add(support(vec3.fromValues(d[0], d[1], d[2])));

    const o = vec3.create();

    let j = maxIterations;
    while (--j >= 0) {
      if (simplex.size === 1) {
        const p = Array.from(simplex.values());
        vec3.copy(d, p[0].diff);
      } else if (simplex.size === 2) {
        const p = Array.from(simplex.values());
        const b = vec2.create();
        closestPointToLineSegment(b, p[0].diff, p[1].diff, o);
        for (let i = 0; i < 2; i++) {
          if (b[i] === 0) {
            simplex.delete(p[i]);
          }
        }
        fromBarycentric(d, [p[0].diff, p[1].diff], b);
      } else if (simplex.size === 3) {
        const p = Array.from(simplex.values());
        const b = vec3.create();
        closestPointToTriangle(b, p[0].diff, p[1].diff, p[2].diff, o);
        for (let i = 0; i < 3; i++) {
          if (b[i] === 0) {
            simplex.delete(p[i]);
          }
        }
        fromBarycentric(d, [p[0].diff, p[1].diff, p[2].diff], b);
      } else {
        const p = Array.from(simplex.values());
        const b = vec4.create();
        closestPointToTetrahedron(
          b,
          p[0].diff,
          p[1].diff,
          p[2].diff,
          p[3].diff,
          o
        );
        if (b[0] < 0 || b[1] < 0 || b[2] < 0 || b[3] < 0) {
          return 0.0;
        }
        for (let i = 0; i < 4; i++) {
          if (b[i] === 0) {
            simplex.delete(p[i]);
          }
        }
        fromBarycentric(d, [p[0].diff, p[1].diff, p[2].diff, p[3].diff], b);
      }

      if (isNaN(d[0]) || isNaN(d[1]) || isNaN(d[2])) {
        debugger;
      }

      const s = support(vec3.fromValues(-d[0], -d[1], -d[2]));

      // no more extent in -d direction
      if (Math.abs(vec3.dot(s.diff, d) - vec3.dot(d, d)) < epsilon) {
        if (simplex.size === 1) {
          const p = Array.from(simplex.values());
          closests[0] = p[0].support0;
          closests[1] = p[0].support1;
        } else if (simplex.size == 2) {
          const p = Array.from(simplex.values());
          const b = vec2.create();
          closestPointToLineSegment(b, p[0].diff, p[1].diff, o);
          fromBarycentric(closests[0], [p[0].support0, p[1].support0], b);
          fromBarycentric(closests[1], [p[0].support1, p[1].support1], b);
        } else if (simplex.size === 3) {
          const p = Array.from(simplex.values());
          const b = vec3.create();
          closestPointToTriangle(b, p[0].diff, p[1].diff, p[2].diff, o);
          fromBarycentric(
            closests[0],
            [p[0].support0, p[1].support0, p[2].support0],
            b
          );
          fromBarycentric(
            closests[1],
            [p[0].support1, p[1].support1, p[2].support1],
            b
          );
        } else {
          debugger;
        }

        return vec3.distance(o, d);
      }

      simplex.add(s);
    }

    return vec3.distance(o, d);
  };
}
