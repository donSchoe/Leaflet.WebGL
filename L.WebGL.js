/*
  Leaflet WebGL plugin architecture.

  ** Requires **
  - Leaflet
    https://github.com/leaflet/leaflet
  - Leaflet Canvas Overlay
    https://github.com/donSchoe/L.CanvasOverlay
  - Khronos WebGL Debug
    https://github.com/KhronosGroup/WebGLDeveloperTools/blob/master/src/debug/webgl-debug.js
  - Google WebGL Utils
    https://code.google.com/p/webglsamples/source/browse/book/webgl-utils.js

  ** Optional **
  - Leaflet Tile Buffers (for geometry tiles)
    https://github.com/donSchoe/L.TileBuffer

  ** Copyright **
  (C) 2015 Alexander Schoedon <schoedon@uni-potsdam.de>

  All rights reserved.
*/

/**
 * Leaflet webgl class
 */
L.WebGL = L.Class.extend({

  EARTH_EQUATOR : 40075016.68557849,
  EARTH_RADIUS : 6378137.0,
  TILE_SIZE : 256.0,
  _sp : null,
  _gl : null,
  _overlay : null,
  _canvas : null,
  _map : null,
  _drawFunct : null,
  options : {},


  initialize : function(drawFunct, options) {
    this._drawFunct = drawFunct;
    this._overlay = L.canvasOverlay().drawing(this._drawFunct);
    L.setOptions(this, options);
  },

  params : function(drawFunct, options) {
    this._drawFunct = drawFunct;
    this._overlay = L.canvasOverlay().drawing(this._drawFunct);
    L.setOptions(this, options);
    return this;
  },

  drawing : function (drawFunct) {
    this._drawFunct = drawFunct;
    this._overlay = L.canvasOverlay().drawing(this._drawFunct);
    return this;
  },

  addTo : function(map) {
    this._map = map;
    this._overlay = L.canvasOverlay().drawing(this._drawFunct).addTo(this._map);
    this._canvas = this._overlay.canvas();
    this._overlay.canvas.width = this._canvas.clientWidth;
    this._overlay.canvas.height = this._canvas.clientHeight;
    this._initGL();
    return this;
  },

  _initGL : function() {
    this._gl = WebGLDebugUtils.makeDebugContext(
      WebGLUtils.setupWebGL(this._canvas),
      this._throwOnGLError
    );
    WebGLDebugUtils.init(this._gl);
    return this._gl;
  },

  initShaders : function(vertex, fragment) {
    var vShader = this._compileShader("x-shader/x-vertex", vertex);
    var fShader = this._compileShader("x-shader/x-fragment", fragment);
    this._sp = this._gl.createProgram();
    this._gl.attachShader(this._sp, vShader);
    this._gl.attachShader(this._sp, fShader);
    this._gl.linkProgram(this._sp);
    if (!this._gl.getProgramParameter(this._sp, this._gl.LINK_STATUS)) {
      log("L.WebGL.initShaders(vertex, fragment): [ERR]: could not init shaders");
      return null;
    } else {
      this._gl.useProgram(this._sp);
      return this._sp;
    }
  },

  _compileShader : function(type, source) {
    var shader;
    if (type == "x-shader/x-fragment") {
      shader = this._gl.createShader(this._gl.FRAGMENT_SHADER);
    } else if (type == "x-shader/x-vertex") {
      shader = this._gl.createShader(this._gl.VERTEX_SHADER);
    } else {
      window.console.log("L.WebGL._compileShader(type, shader): [WRN]: unknown shader type");
      return null;
    }
    this._gl.shaderSource(shader, source);
    this._gl.compileShader(shader);
    if (!this._gl.getShaderParameter(shader, this._gl.COMPILE_STATUS)) {
      log("L.WebGL._compileShader(type, shader): [ERR]: shader failed to compile");
      log(this._gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  },

  _throwOnGLError : function (e, f, args) {
    throw WebGLDebugUtils.glEnumToString(e) + " was caused by call to " + f;
  },

  context : function() {
    return this._gl;
  },

  canvas : function() {
    return this._canvas;
  },

  setModelViewLocation : function(uniformLoc) {
    this._sp.uniformMatrix = this._gl.getUniformLocation(this._sp, uniformLoc);
  },

  updateModelView : function() {
    this._gl.enable(this._gl.BLEND);
    this._gl.blendFunc(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA);
    this._gl.disable(this._gl.DEPTH_TEST);
    this._gl.clear(this._gl.COLOR_BUFFER_BIT);
    this._gl.viewport(0, 0, this._canvas.width, this._canvas.height);
    var bounds = this._map.getBounds();
    var topLeft = new L.LatLng(bounds.getNorth(), bounds.getWest());
    var zoom = this._map.getZoom();
    var scale = Math.pow(2, zoom);
    var offset = this.latLonToPixels(topLeft);
    var uMatrix = this.identityMatrix();
    this.translateMatrix(uMatrix, -1, 1);
    this.scaleMatrix(uMatrix, 2.0 / this._canvas.width, -2.0 / this._canvas.height);
    this.scaleMatrix(uMatrix, scale, scale);
    this.translateMatrix(uMatrix, -offset.x, -offset.y);
    this._gl.uniformMatrix4fv(this._sp.uniformMatrix, false, uMatrix);
  },

  identityMatrix : function() {
    return new Float32Array([
      1,0,0,0,
      0,1,0,0,
      0,0,1,0,
      0,0,0,1
    ]);
  },

  translateMatrix : function(m, x, y) {
    m[12] += m[0] * x + m[4] * y;
    m[13] += m[1] * x + m[5] * y;
    m[14] += m[2] * x + m[6] * y;
    m[15] += m[3] * x + m[7] * y;
  },

  scaleMatrix : function(m, x, y) {
    m[0] *= x;
    m[1] *= x;
    m[2] *= x;
    m[3] *= x;
    m[4] *= y;
    m[5] *= y;
    m[6] *= y;
    m[7] *= y;
  },

  mercatorToPixels : function(p)  {
    var pixelX = (p.x + (this.EARTH_EQUATOR / 2.0)) / (this.EARTH_EQUATOR / this.TILE_SIZE);
    var pixelY = ((p.y - (this.EARTH_EQUATOR / 2.0)) / (this.EARTH_EQUATOR / -this.TILE_SIZE));
    return L.point(pixelX, pixelY);
  },

  latLonToPixels : function(p) {
    var sinLat = Math.sin(p.lat * Math.PI / 180.0);
    var pixelX = ((p.lng + 180) / 360) * this.TILE_SIZE;
    var pixelY = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (Math.PI * 4)) * this.TILE_SIZE;
    return L.point(pixelX, pixelY);
  },

  toString : function() {
    return "Leaflet WebGL object";
  },
});

L.webGL = function (drawFunct, options) {
  return new L.WebGL(drawFunct, options);
};
