import { vec3 } from 'gl-matrix';

/**
 * out = (a, [b, c])
 */
const tmp = vec3.create();
export const mixed = (a: vec3, b: vec3, c: vec3) => {
  vec3.cross(tmp, b, c);
  return vec3.dot(a, tmp);
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
  const apOabXnAbc = mixed(ap, ab, nAbc);
  const apOnAbdXab = mixed(ap, nAbd, ab);
  if (apOab >= 0 && bpOba >= 0 && apOabXnAbc >= 0 && apOnAbdXab >= 0) {
    const t = apOab / vec3.dot(ab, ab);
    return vec3.scaleAndAdd(vec3.create(), a, ab, t);
  }

  // check voronoi region of ac edge
  const nAcd = vec3.cross(vec3.create(), ac, ad);
  const apOnAbcXac = mixed(ap, nAbc, ac);
  const apOacXnAcd = mixed(ap, ac, nAcd);
  if (apOac >= 0 && cpOca >= 0 && apOnAbcXac >= 0 && apOacXnAcd >= 0) {
    const t = apOac / vec3.dot(ac, ac);
    return vec3.scaleAndAdd(vec3.create(), a, ac, t);
  }

  // check voronoi region of ad edge
  const apOnAcdXad = mixed(ap, nAcd, ad);
  const apOadXnAbd = mixed(ap, ad, nAbd);
  if (apOad >= 0 && dpOda >= 0 && apOnAcdXad >= 0 && apOadXnAbd >= 0) {
    const t = apOad / vec3.dot(ad, ad);
    return vec3.scaleAndAdd(vec3.create(), a, ad, t);
  }

  // check voronoi region of bc edge
  const nBcd = vec3.cross(vec3.create(), bd, bc);
  const bpObcXnAbc = mixed(bp, bc, nAbc);
  const bpOnBcdXbc = mixed(bp, nBcd, bc);
  if (bpObc >= 0 && cpOcb >= 0 && bpObcXnAbc >= 0 && bpOnBcdXbc >= 0) {
    const t = bpObc / vec3.dot(bc, bc);
    return vec3.scaleAndAdd(vec3.create(), b, bc, t);
  }

  // check voronoi region of cd edge
  const cpOcdXnAcd = mixed(cp, cd, nAcd);
  const cpOnBcdXcd = mixed(cp, nBcd, cd);
  if (cpOcd >= 0 && dpOdc >= 0 && cpOcdXnAcd >= 0 && cpOnBcdXcd >= 0) {
    const t = cpOcd / vec3.dot(cd, cd);
    return vec3.scaleAndAdd(vec3.create(), c, cd, t);
  }

  // check voronoi region of bd edge
  const bpOnAbdXbd = mixed(bp, nAbd, bd);
  const bpObdXnBcd = mixed(bp, bd, nBcd);
  if (bpObd >= 0 && dpOdb >= 0 && bpOnAbdXbd >= 0 && bpObdXnBcd >= 0) {
    const t = bpObd / vec3.dot(bd, bd);
    return vec3.scaleAndAdd(vec3.create(), b, bd, t);
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

    const q = vec3.clone(a);
    vec3.scale(q, q, u);
    vec3.scaleAndAdd(q, q, b, v);
    return vec3.scaleAndAdd(q, q, c, w);
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

    const q = vec3.clone(a);
    vec3.scale(q, q, u);
    vec3.scaleAndAdd(q, q, c, v);
    return vec3.scaleAndAdd(q, q, d, w);
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

    const q = vec3.clone(a);
    vec3.scale(q, q, u);
    vec3.scaleAndAdd(q, q, d, v);
    return vec3.scaleAndAdd(q, q, b, w);
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

    const q = vec3.clone(c);
    vec3.scale(q, q, u);
    vec3.scaleAndAdd(q, q, b, v);
    return vec3.scaleAndAdd(q, q, d, w);
  }

  // we are in tetrahedron itself, return point
  return vec3.clone(p);
};
