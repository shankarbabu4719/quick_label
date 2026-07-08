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

uniform float uCurrentFrame;
uniform int uNumMasks;
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

out vec4 fragColor;

vec3 startColor = vec3(0.0f, 0.67f, 1.0f);
vec3 endColor = vec3(0.05f, 0.06f, 0.05f);

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898f, 78.233f))) * 43758.5453123f);
}

void main() {
  vec2 tc = vec2(vTexCoord.y, vTexCoord.x);
  float totalMaskValue = 0.0f;

  if (uNumMasks > 0) totalMaskValue += texture(uMaskTexture0, tc).r;
  if (uNumMasks > 1) totalMaskValue += texture(uMaskTexture1, tc).r;
  if (uNumMasks > 2) totalMaskValue += texture(uMaskTexture2, tc).r;
  if (uNumMasks > 3) totalMaskValue += texture(uMaskTexture3, tc).r;
  if (uNumMasks > 4) totalMaskValue += texture(uMaskTexture4, tc).r;
  if (uNumMasks > 5) totalMaskValue += texture(uMaskTexture5, tc).r;
  if (uNumMasks > 6) totalMaskValue += texture(uMaskTexture6, tc).r;
  if (uNumMasks > 7) totalMaskValue += texture(uMaskTexture7, tc).r;
  if (uNumMasks > 8) totalMaskValue += texture(uMaskTexture8, tc).r;
  if (uNumMasks > 9) totalMaskValue += texture(uMaskTexture9, tc).r;

  float time = uCurrentFrame * 0.1f;
  vec3 dynamicColor = mix(startColor, endColor, sin(time));
  vec3 colorVariation = mix(vec3(0.0f), vec3(1.0f), vTexCoord.y);
  float rnd = random(vTexCoord.xy);

  if (totalMaskValue > 0.0f) {
    fragColor = vec4(mix(dynamicColor, colorVariation, rnd), 1.0f);
  } else {
    fragColor = vec4(0.0f, 0.0f, 0.0f, 0.0f);
  }
}
