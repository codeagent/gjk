export const vertex = `#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;


uniform mat4 viewMat;
uniform mat4 projMat;
uniform mat4 worldMat;


out vec3 _position;
out vec3 _normal;

void main()
{
  gl_Position = projMat * viewMat * worldMat * vec4(position, 1.0f);
  _position = vec3(worldMat * vec4(position, 1.0f));
  _normal = normalize(mat3(worldMat) * normal);
}
`;

export const fragment = `#version 300 es
precision highp float;

layout( location = 0 ) out vec4 color;	

in vec3 _normal;
in vec3 _position;

uniform vec4 albedo;
uniform vec3 pos;

void main()
{
  vec3 n = normalize(_normal);
  vec3 l = normalize(pos - _position);
  float d = dot(n, l);
  vec3 c = albedo.rgb;
  if(d < 0.0) {
    c = vec3(1.0) - c;
    d = -d;
  }

  float nol = d * 0.7 + 0.3;
  color = vec4(c, 1.0) * vec4(vec3(nol), 1.0f);
}
`;
