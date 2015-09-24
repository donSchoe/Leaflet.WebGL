# Leaflet.WebGL

Leaflet plugin architecture for WebGL integration.

This plugin is optimized for rendering geodata vertices or native geometries on leaflet maps using WebGL. It's not designed to draw raster tiles or images (yet). That said, it should not be impossible though.


### Usage & Demo

**Usage**:

You need a leaflet map and a custom drawing fallback.

```
var map = L.map("map");
L.WebGL = L.webGL(drawGL).addTo(map);
```

Get canvas and context from `L.WebGL` (not from Leaflet!).

```
var canvas = L.WebGL.canvas();
var gl = L.WebGL.context();
```

Load and compile the shaders. Here: shaders are taken from document header.

```
vtxShader = document.getElementById("shader-vtx").firstChild.textContent;
frgShader = document.getElementById("shader-frg").firstChild.textContent;
var program = L.WebGL.initShaders(vtxShader, frgShader);
```

Tell leaflet-webgl about modelview and vertex attribute locations.

```
L.WebGL.setModelViewLocation("u_matrix");
program.vertexPosition = gl.getAttribLocation(program, "a_vertex");
program.vertexColor = gl.getAttribLocation(program, "a_color");
gl.enableVertexAttribArray(program.vertexPosition);
gl.enableVertexAttribArray(program.vertexColor);
```

That's it, now you can draw on your webgl overlay.

```
function drawGL() {
  if(GL) {
    L.WebGL.updateModelView();
    /* draw funky gl stuff here */
  }
}
```

See demo source code for more details.


**Demo**: Random lines on tile buffers rendered with Leaflet.WebGL.

- http://donschoe.github.io/Leaflet.WebGL/
- https://github.com/donSchoe/Leaflet.WebGL/tree/gh-pages

```
$ git clone https://github.com/donSchoe/Leaflet.WebGL.git
$ git checkout -b gh-pages
```


### Requires

- Leaflet
  - https://github.com/leaflet/leaflet
- Leaflet Canvas Overlay
  - https://github.com/donSchoe/L.CanvasOverlay
- Khronos WebGL Debug
  - https://github.com/KhronosGroup/WebGLDeveloperTools/blob/master/src/debug/webgl-debug.js
- Google WebGL Utils
  - https://code.google.com/p/webglsamples/source/browse/book/webgl-utils.js


### Optional

- Leaflet Tile Buffers (for geometry tiles)
  - https://github.com/donSchoe/L.TileBuffer


### Copyright

(C) 2015 Alexander Schoedon <schoedon@uni-potsdam.de>

GPLv3 attached.
