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

precision lowp float;

in vec2 vTexCoord;
uniform vec2 uSize;
uniform int uNumMasks;
uniform sampler2D uEmojiTexture;
uniform bool uFill;
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

vec2 calcAdjustedCoord(vec2 vTC, vec4 bbox, float aspectRatio, out float distFromCenter) {
  vec2 center = (bbox.xy + bbox.zw) * 0.5f;
  float radiusX = abs(bbox.z - bbox.x) * 1.25f;
  float radiusY = radiusX / aspectRatio * 1.25f;
  vec2 adj = (vTC - center) / vec2(radiusX, radiusY) + vec2(0.5f);
  distFromCenter = length((vTC - center) / vec2(radiusX*0.5f, radiusY*0.5f));
  return adj;
}

void applyReplaceSlot(sampler2D tex, vec4 bbox, float aspectRatio,
                      inout float totalMaskValue, inout vec4 emojiColor) {
  float maskValue = texture(tex, vec2(vTexCoord.y, vTexCoord.x)).r;
  float dist;
  vec2 adj = calcAdjustedCoord(vTexCoord, bbox, aspectRatio, dist);
  vec4 bgFill = vec4(1.0f, 0.0f, 0.0f, 1.0f);
  if (maskValue > 0.0f) {
    emojiColor = texture(uEmojiTexture, adj);
    if (dist > 0.85f && !uFill) emojiColor = bgFill;
  }
  if (uFill && emojiColor.a == 0.0f) {
    emojiColor = texture(uEmojiTexture, adj);
  }
  totalMaskValue += maskValue;
}

void main() {
  float aspectRatio = uSize.y / uSize.x;
  float totalMaskValue = 0.0f;
  vec4 emojiColor = vec4(0.0f);

  if (uNumMasks > 0) applyReplaceSlot(uMaskTexture0, bbox0, aspectRatio, totalMaskValue, emojiColor);
  if (uNumMasks > 1) applyReplaceSlot(uMaskTexture1, bbox1, aspectRatio, totalMaskValue, emojiColor);
  if (uNumMasks > 2) applyReplaceSlot(uMaskTexture2, bbox2, aspectRatio, totalMaskValue, emojiColor);
  if (uNumMasks > 3) applyReplaceSlot(uMaskTexture3, bbox3, aspectRatio, totalMaskValue, emojiColor);
  if (uNumMasks > 4) applyReplaceSlot(uMaskTexture4, bbox4, aspectRatio, totalMaskValue, emojiColor);
  if (uNumMasks > 5) applyReplaceSlot(uMaskTexture5, bbox5, aspectRatio, totalMaskValue, emojiColor);
  if (uNumMasks > 6) applyReplaceSlot(uMaskTexture6, bbox6, aspectRatio, totalMaskValue, emojiColor);
  if (uNumMasks > 7) applyReplaceSlot(uMaskTexture7, bbox7, aspectRatio, totalMaskValue, emojiColor);
  if (uNumMasks > 8) applyReplaceSlot(uMaskTexture8, bbox8, aspectRatio, totalMaskValue, emojiColor);
  if (uNumMasks > 9) applyReplaceSlot(uMaskTexture9, bbox9, aspectRatio, totalMaskValue, emojiColor);

  if (totalMaskValue > 0.0f) {
    fragColor = emojiColor;
  } else {
    fragColor = uFill ? emojiColor : vec4(0.0f);
  }
}
