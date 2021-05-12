import { vec3 } from 'gl-matrix';

/**
 * out = (a, [b, c])
 */
export const mixed = (a: vec3, b: vec3, c: vec3) => {
  const x = vec3.create();
  vec3.cross(x, b, c);
  return vec3.dot(a, x);
};

export const closestPointToTetrahedron = (
  a: vec3,
  b: vec3,
  c: vec3,
  d: vec3,
  p: vec3
): vec3 => {
  // check voronoi region of a
  const ap = vec3.subtract(vec3.create(), p, a);
  const ab = vec3.subtract(vec3.create(), b, a);
  const ac = vec3.subtract(vec3.create(), c, a);
  const ad = vec3.subtract(vec3.create(), d, a);
  const apOab = vec3.dot(ap, ab);
  const apOac = vec3.dot(ap, ac);
  const apOad = vec3.dot(ap, ad);

  if (apOab <= 0 && apOac <= 0 && apOad <= 0) {
    return a;
  }

  // check voronoi region of b
  const bp = vec3.subtract(vec3.create(), p, b);
  const bc = vec3.subtract(vec3.create(), c, b);
  const bd = vec3.subtract(vec3.create(), d, b);
  const bpOba = -vec3.dot(bp, ab);
  const bpObc = vec3.dot(bp, bc);
  const bpObd = vec3.dot(bp, bd);

  if (bpOba <= 0 && bpObc <= 0 && bpObd <= 0) {
    return b;
  }

  // check voronoi region of c
  const cp = vec3.subtract(vec3.create(), p, c);
  const cd = vec3.subtract(vec3.create(), d, c);
  const cpOca = -vec3.dot(cp, ac);
  const cpOcb = -vec3.dot(cp, bc);
  const cpOcd = vec3.dot(cp, cd);

  if (cpOca <= 0 && cpOcb <= 0 && cpOcd <= 0) {
    return c;
  }

  // check voronoi region of d
  const dp = vec3.subtract(vec3.create(), p, d);
  const dpOda = -vec3.dot(dp, ad);
  const dpOdb = -vec3.dot(dp, bd);
  const dpOdc = -vec3.dot(dp, cd);

  if (dpOda <= 0 && dpOdb <= 0 && dpOdc <= 0) {
    return d;
  }

  // check voronoi region of ab edge
  const nAbc = vec3.cross(vec3.create(), ab, ac);
  const nAbd = vec3.cross(vec3.create(), ad, ab);
  if (
    apOab >= 0 &&
    bpOba >= 0 &&
    mixed(ap, ab, nAbc) >= 0 &&
    mixed(ap, nAbd, ab) >= 0
  ) {
    const t = apOab / vec3.dot(ab, ab);
    return vec3.scaleAndAdd(vec3.create(), a, ab, t);
  }

  // check voronoi region of ac edge
  const nAcd = vec3.cross(vec3.create(), ac, ad);
  if (
    apOac >= 0 &&
    cpOca >= 0 &&
    mixed(ap, nAbc, ac) >= 0 &&
    mixed(ap, ac, nAcd) >= 0
  ) {
    const t = apOac / vec3.dot(ac, ac);
    return vec3.scaleAndAdd(vec3.create(), a, ac, t);
  }

  // check voronoi region of ad edge
  if (
    apOad >= 0 &&
    dpOda >= 0 &&
    mixed(ap, nAcd, ad) >= 0 &&
    mixed(ap, ad, nAbd) >= 0
  ) {
    const t = apOad / vec3.dot(ad, ad);
    return vec3.scaleAndAdd(vec3.create(), a, ad, t);
  }

  // check voronoi region of bc edge
  const nBcd = vec3.cross(vec3.create(), bd, bc);
  if (
    bpObc >= 0 &&
    cpOcb >= 0 &&
    mixed(bp, bc, nAbc) >= 0 &&
    mixed(bp, nBcd, bc) >= 0
  ) {
    const t = bpObc / vec3.dot(bc, bc);
    return vec3.scaleAndAdd(vec3.create(), b, bc, t);
  }

  // check voronoi region of cd edge
  if (
    cpOcd >= 0 &&
    dpOdc >= 0 &&
    mixed(cp, cd, nAcd) >= 0 &&
    mixed(cp, nBcd, cd) >= 0
  ) {
    const t = cpOcd / vec3.dot(cd, cd);
    return vec3.scaleAndAdd(vec3.create(), c, cd, t);
  }

  // check voronoi region of bd edge
  if (
    bpObd >= 0 &&
    dpOdb >= 0 &&
    mixed(bp, nAbd, bd) >= 0 &&
    mixed(bp, bd, nBcd) >= 0
  ) {
    const t = bpObd / vec3.dot(bd, bd);
    return vec3.scaleAndAdd(vec3.create(), b, bd, t);
  }

  // find closest point on abc
  if (vec3.dot(nAbc, ap) >= 0.0) {
    const s = vec3.dot(nAbc, nAbc);
    const u = mixed(nAbc, cp, bp) / s;
    const v = mixed(nAbc, cp, ap) / s;
    const w = 1.0 - u - v;
    const q = vec3.clone(a);
    vec3.scale(q, q, u);
    vec3.scaleAndAdd(q, q, b, v);
    return vec3.scaleAndAdd(q, q, c, w);
  }

  // find closest point on abc
  if (vec3.dot(nAbc, ap) >= 0.0) {
    const s = vec3.dot(nAbc, nAbc);
    const u = mixed(nAbc, cp, bp) / s;
    const v = mixed(nAbc, cp, ap) / s;
    const w = 1.0 - u - v;
    const q = vec3.clone(a);
    vec3.scale(q, q, u);
    vec3.scaleAndAdd(q, q, b, v);
    return vec3.scaleAndAdd(q, q, c, w);
  }
};
