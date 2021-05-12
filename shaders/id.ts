export const vertex = `#version 300 es
layout(location = 0) in vec3 position;

uniform mat4 viewMat;
uniform mat4 projMat;
uniform mat4 worldMat;
uniform float objectId;

flat out uint _id;

void main()
{
  gl_Position = projMat * viewMat * worldMat * vec4(position, 1.0f);
  _id = uint(objectId) & 0x0000ffffu; 
}
`;

export const fragment = `#version 300 es
precision highp float;

layout( location = 0 ) out uint color;	

flat in uint _id;

void main()
{
  color = _id;
}

`;
