#version 300 es
// Copyright (c) Meta Platforms, Inc. and affiliates.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

precision mediump float;

in vec2 vTexCoord;

uniform sampler2D uSampler;
uniform vec2 uSize;
uniform int uNumMasks;
uniform float uCurrentFrame;
uniform bool uLineColor;
uniform bool uArrow;
uniform sampler2D uMaskTexture0;
uniform sampler2D uMaskTexture1;
uniform sampler2D uMaskTexture2;
uniform sampler2D uMaskTexture3;
uniform sampler2D uMaskTexture4;
uniform sampler2D uMaskTexture5;
uniform sampler2D uMaskTexture6;
uniform sampler2D uMaskTexture7;
uniform sampler2D uMaskTexture8;
uniform sampler2D uMaskTexture9;

uniform vec4 bbox0;
uniform vec4 bbox1;
uniform vec4 bbox2;
uniform vec4 bbox3;
uniform vec4 bbox4;
uniform vec4 bbox5;
uniform vec4 bbox6;
uniform vec4 bbox7;
uniform vec4 bbox8;
uniform vec4 bbox9;

out vec4 fragColor;

float addv(vec2 a) { return a.x + a.y; }
#define dd(a) dot(a,a)

vec2 solveCubic2(vec3 a) {
  float p = a.y - a.x * a.x / 3.0f;
  float p3 = p * p * p;
  float q = a.x * (2.0f * a.x * a.x - 9.0f * a.y) / 27.0f + a.z;
  float d = q * q + 4.0f * p3 / 27.0f;
  if (d > 0.0f) {
    vec2 x = (vec2(1.0f, -1.0f) * sqrt(d) - q) * 0.5f;
    return vec2(addv(sign(x) * pow(abs(x), vec2(1.0f / 3.0f))) - a.x / 3.0f);
  }
  float v = acos(-sqrt(-27.0f / p3) * q * 0.5f) / 3.0f;
  float m = cos(v);
  float n = sin(v) * 1.732050808f;
  return vec2(m + m, -n - m) * sqrt(-p / 3.0f) - a.x / 3.0f;
}

float calcBezierDist(vec2 p, vec2 a, vec2 b, vec2 c) {
  b += mix(vec2(1e-4f), vec2(0.0f), abs(sign(b * 2.0f - a - c)));
  vec2 A = b - a, B = c - b - A, C = p - a, D = A * 2.0f;
  vec2 T = clamp(solveCubic2(vec3(-3.0f*dot(A,B), dot(C,B)-2.0f*dd(A), dot(C,A)) / -dd(B)), 0.0f, 1.0f);
  return sqrt(min(dd(C-(D+B*T.x)*T.x), dd(C-(D+B*T.y)*T.y)));
}

float crossProduct(vec2 a, vec2 b) { return a.x*b.y - a.y*b.x; }

bool pointInTriangle(vec2 pt, vec2 v0, vec2 v1, vec2 v2) {
  float d0 = sign(crossProduct(v1-v0, pt-v0));
  float d1 = sign(crossProduct(v2-v1, pt-v1));
  float d2 = sign(crossProduct(v0-v2, pt-v2));
  bool has_neg = (d0<0.0f)||(d1<0.0f)||(d2<0.0f);
  bool has_pos = (d0>0.0f)||(d1>0.0f)||(d2>0.0f);
  return !(has_neg && has_pos);
}

void applyArrowSlot(sampler2D tex, vec4 bbox,
                    float time, float aspectRatio, float threshold, float circleRadius,
                    inout bool scoped, inout bool intersected, inout float overlapVal) {
  overlapVal = texture(tex, vec2(vTexCoord.y, vTexCoord.x)).r;
  bool visible = bbox != vec4(0.0f);
  vec2 p0 = vec2((bbox.x+bbox.z)*0.5f, bbox.y);
  vec2 p1 = vec2(bbox.x+0.5f*(bbox.z-bbox.x)*(0.5f+0.5f*sin(time)), bbox.y-0.25f);
  vec2 p2 = vec2(bbox.x+0.5f*(bbox.z-bbox.x)*(0.5f+0.5f*cos(time)), (bbox.w+bbox.y)*0.5f);
  float d = calcBezierDist(vTexCoord, p0, p1, p2) * length(uSize.xy) * 0.25f;
  vec2 v0 = p0+vec2(-0.020f,-0.020f), v1 = p0+vec2(0.020f,-0.020f), v2 = p0+vec2(0.0f,0.020f);
  bool inside = pointInTriangle(vTexCoord, v0, v1, v2);
  vec2 adj = vTexCoord - p0; adj.x /= aspectRatio;
  float circDist = length(adj);
  if (d < threshold && visible) scoped = true;
  if (uArrow && inside && visible) intersected = true;
  else if (!uArrow && circDist < circleRadius && visible) intersected = true;
}

void main() {
  vec4 color = texture(uSampler, vTexCoord);
  float aspectRatio = uSize.y / uSize.x;
  float time = uCurrentFrame * 0.05f;
  vec3 multicolor = vec3(0.5f+0.5f*sin(time), 0.5f+0.5f*cos(time), 0.5f-0.5f*sin(time));

  bool scoped = false, intersected = false;
  float threshold = 0.75f, circleRadius = 0.015f;

  float ov0=0.0, ov1=0.0, ov2=0.0, ov3=0.0, ov4=0.0;
  float ov5=0.0, ov6=0.0, ov7=0.0, ov8=0.0, ov9=0.0;

  if (uNumMasks > 0) applyArrowSlot(uMaskTexture0, bbox0, time, aspectRatio, threshold, circleRadius, scoped, intersected, ov0);
  if (uNumMasks > 1) applyArrowSlot(uMaskTexture1, bbox1, time, aspectRatio, threshold, circleRadius, scoped, intersected, ov1);
  if (uNumMasks > 2) applyArrowSlot(uMaskTexture2, bbox2, time, aspectRatio, threshold, circleRadius, scoped, intersected, ov2);
  if (uNumMasks > 3) applyArrowSlot(uMaskTexture3, bbox3, time, aspectRatio, threshold, circleRadius, scoped, intersected, ov3);
  if (uNumMasks > 4) applyArrowSlot(uMaskTexture4, bbox4, time, aspectRatio, threshold, circleRadius, scoped, intersected, ov4);
  if (uNumMasks > 5) applyArrowSlot(uMaskTexture5, bbox5, time, aspectRatio, threshold, circleRadius, scoped, intersected, ov5);
  if (uNumMasks > 6) applyArrowSlot(uMaskTexture6, bbox6, time, aspectRatio, threshold, circleRadius, scoped, intersected, ov6);
  if (uNumMasks > 7) applyArrowSlot(uMaskTexture7, bbox7, time, aspectRatio, threshold, circleRadius, scoped, intersected, ov7);
  if (uNumMasks > 8) applyArrowSlot(uMaskTexture8, bbox8, time, aspectRatio, threshold, circleRadius, scoped, intersected, ov8);
  if (uNumMasks > 9) applyArrowSlot(uMaskTexture9, bbox9, time, aspectRatio, threshold, circleRadius, scoped, intersected, ov9);

  bool overlap = (ov0>0.0f||ov1>0.0f||ov2>0.0f||ov3>0.0f||ov4>0.0f||
                  ov5>0.0f||ov6>0.0f||ov7>0.0f||ov8>0.0f||ov9>0.0f);

  if (overlap) fragColor = color;
  if (scoped || intersected) {
    fragColor = uLineColor ? vec4(multicolor, 1.0f) : vec4(1.0f);
    if (intersected) fragColor = vec4(multicolor, 1.0f);
  } else {
    fragColor = overlap ? color : vec4(0.0f, 0.0f, 0.0f, 0.0f);
  }
}
