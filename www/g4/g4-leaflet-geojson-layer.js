L.GeoJsonOverlay = L.CanvasOverlay.extend({
    options: {        
        polygonColor: null,
        polygonBorderColor: null,
        lineColor: [0,0,0,255],
        smoothLines: false
    },
  
    initialize: function (options) {
        L.setOptions(this, options);
    },
  
    onAdd: function(map) {
        this.options.drawCallback = (canvas, map) => this.drawCanvas(canvas, map);
        L.CanvasOverlay.prototype.onAdd.call(this, map);   
        this.box = null;
        this.initWegGL();     
    },
    onRemove: function(map) {
        this.destroyWebGL();
        L.CanvasOverlay.prototype.onRemove.call(this, map);        
    },
    initWegGL: function() {
        this.gl = this._canvas.getContext('webgl', {antialiasing: true});
        const gl = this.gl;
        /*
           Polygon Borders 
        */
        // Borders Vertex Shader
        this.polygonBordersVertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(this.polygonBordersVertexShader, `
            attribute vec3 coordinates;
            attribute vec4 colors;
            varying lowp vec4 vColor;
            void main(void) {
                gl_Position = vec4(coordinates, 1.0);
                vColor = colors;
            }
        `);
        gl.compileShader(this.polygonBordersVertexShader);
        if (!gl.getShaderParameter(this.polygonBordersVertexShader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(this.polygonBordersVertexShader));
            gl.deleteShader(this.polygonBordersVertexShader);
            this.polygonBordersVertexShader = null;
            throw "Error compilando polygonBordersVertexShader";
        }
        // Borders Fragment Shader
        this.polygonBordersFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(this.polygonBordersFragmentShader, `
            varying lowp vec4 vColor;     
            void main() {
                gl_FragColor = vColor;
            }
        `);
        gl.compileShader(this.polygonBordersFragmentShader);
        if (!gl.getShaderParameter(this.polygonBordersFragmentShader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(this.polygonBordersFragmentShader));
            gl.deleteShader(this.polygonBordersFragmentShader);
            this.polygonBordersFragmentShader = null;
            throw "Error compilando polygonBordersFragmentShader";
        }
        this.polygonBordersProgram = gl.createProgram();
        gl.attachShader(this.polygonBordersProgram, this.polygonBordersVertexShader);
        gl.attachShader(this.polygonBordersProgram, this.polygonBordersFragmentShader);
        gl.linkProgram(this.polygonBordersProgram);
        if (!gl.getProgramParameter(this.polygonBordersProgram, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(this.polygonBordersProgram));
            gl.deleteProgram(this.polygonBordersProgram);
            this.polygonBordersProgram = null;
            throw "Error creando polygonBordersProgram";
        }
        // Buffers
        this.polygonBorderLinesVertexBuffer = gl.createBuffer();
        this.polygonBorderLinesColorsBuffer = gl.createBuffer();

        /*
          Polygons
        */
        // Polygons Vertex Shader
        this.polygonVertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(this.polygonVertexShader, `
            attribute vec3 coordinates;
            attribute vec4 colors;
            varying lowp vec4 vColor;
            void main() {
                gl_Position = vec4(coordinates, 1.0);
                vColor = colors;
            }
        `);
        gl.compileShader(this.polygonVertexShader);
        if (!gl.getShaderParameter(this.polygonVertexShader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(this.polygonVertexShader));
            gl.deleteShader(this.polygonVertexShader);
            this.polygonVertexShader = null;
            throw "Error compilando polygonVertexShader";
        }
        // Polygons Fragment Shader
        this.polygonFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(this.polygonFragmentShader, `
            varying lowp vec4 vColor;            
            void main() {
                gl_FragColor = vColor;
            }
        `);
        gl.compileShader(this.polygonFragmentShader);
        if (!gl.getShaderParameter(this.polygonFragmentShader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(this.polygonFragmentShader));
            gl.deleteShader(this.polygonFragmentShader);
            this.polygonFragmentShader = null;
            throw "Error compilando polygonFragmentShader";
        }
        this.polygonProgram = gl.createProgram();
        gl.attachShader(this.polygonProgram, this.polygonVertexShader);
        gl.attachShader(this.polygonProgram, this.polygonFragmentShader);
        gl.linkProgram(this.polygonProgram);
        if (!gl.getProgramParameter(this.polygonProgram, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(this.polygonProgram));
            gl.deleteProgram(this.polygonProgram);
            this.polygonProgram = null;
            throw "Error creando polygonProgram";
        }
        // Buffers
        this.polygonVertexBuffer = gl.createBuffer();
        this.polygonColorsBuffer = gl.createBuffer();

        /*
           Lines
        */
        // Lines Vertex Shader
        this.linesVertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(this.linesVertexShader, `
            attribute vec3 coordinates;
            attribute vec4 colors;
            varying lowp vec4 vColor;
            void main(void) {
                gl_Position = vec4(coordinates, 1.0);
                vColor = colors;
            }
        `);
        gl.compileShader(this.linesVertexShader);
        if (!gl.getShaderParameter(this.linesVertexShader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(this.linesVertexShader));
            gl.deleteShader(this.linesVertexShader);
            this.linesVertexShader = null;
            throw "Error compilando linesVertexShader";
        }
        // Lines Fragment Shader
        this.linesFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(this.linesFragmentShader, `
            varying lowp vec4 vColor;     
            void main() {
                gl_FragColor = vColor;
            }
        `);
        gl.compileShader(this.linesFragmentShader);
        if (!gl.getShaderParameter(this.linesFragmentShader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(this.linesFragmentShader));
            gl.deleteShader(this.linesFragmentShader);
            this.linesFragmentShader = null;
            throw "Error compilando linesFragmentShader";
        }
        this.linesProgram = gl.createProgram();
        gl.attachShader(this.linesProgram, this.linesVertexShader);
        gl.attachShader(this.linesProgram, this.linesFragmentShader);
        gl.linkProgram(this.linesProgram);
        if (!gl.getProgramParameter(this.linesProgram, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(this.linesProgram));
            gl.deleteProgram(this.linesProgram);
            this.linesProgram = null;
            throw "Error creando linesProgram";
        }
        // Buffers
        this.linesVertexBuffer = gl.createBuffer();
        this.linesColorsBuffer = gl.createBuffer();
    },
    destroyWebGL: function() {
        const gl = this.gl;
        // PolygonBorders
        if (this.polygonBordersVertexShader) gl.deleteShader(this.polygonBordersVertexShader);
        if (this.polygonBordersFragmentShader) gl.deleteShader(this.polygonBordersFragmentShader);
        if (this.polygonBorderLinesVertexBuffer) gl.deleteBuffer(this.polygonBorderLinesVertexBuffer);
        if (this.polygonBorderLinesColorsBuffer) gl.deleteBuffer(this.polygonBorderLinesColorsBuffer);
        if (this.polygonBordersProgram) gl.deleteProgram(this.polygonBordersProgram);

        if (this.polygonVertexShader) gl.deleteShader(this.polygonVertexShader);
        if (this.polygonFragmentShader) gl.deleteShader(this.polygonFragmentShader);
        if (this.polygonVertexBuffer) gl.deleteBuffer(this.polygonVertexBuffer);
        if (this.polygonColorsBuffer) gl.deleteBuffer(this.polygonColorsBuffer);
        if (this.polygonProgram) gl.deleteProgram(this.polygonProgram);

        if (this.linesVertexShader) gl.deleteShader(this.linesVertexShader);
        if (this.linesFragmentShader) gl.deleteShader(this.linesFragmentShader);
        if (this.linesVertexBuffer) gl.deleteBuffer(this.linesVertexBuffer);
        if (this.linesColorsBuffer) gl.deleteBuffer(this.linesColorsBuffer);
        if (this.linesProgram) gl.deleteProgram(this.linesProgram);
    },
    setGeoJson:function(geoJson) {
        this.polygons = null;
        this.lines = null;
        this.points = null;
        this.polygonLookup = null;
        this.geoJson = geoJson;
        if (!geoJson) {
            L.CanvasOverlay.prototype.redraw.call(this, map);
            return;
        }

        this.polygons = null;
        let features = Array.isArray(this.geoJson)?this.geoJson:this.geoJson.features;
        // Preparar features, eliminar MultiPolygon
        let newFeatures = [];                                
        for (let feature of features) {
            if (feature.geometry.type == "Polygon") {
                newFeatures.push(feature);
            } else if (feature.geometry.type == "MultiPolygon") {
                for (let coord of feature.geometry.coordinates) {
                    newFeatures.push({geometry:{type:"Polygon", coordinates:coord, properties:feature.properties}})
                }
            } else if (feature.geometry.type == "LineString") {
                newFeatures.push(feature);
            } else if (feature.geometry.type == "MultiLineString") {
                for (let coord of feature.geometry.coordinates) {
                    newFeatures.push({geometry:{type:"LineString", coordinates:coord, properties:feature.properties}})
                }
            } else {
                console.error("Geometry Type '" + feature.geometry.type + "' Not Handled");
            }
        }
        features = newFeatures;
        for (let feature of features) {
            let geom = feature.geometry;
            if (!geom) continue;
            if (geom.type == "Polygon") {
                if (!this.polygons) this.polygons = [];
                let polygonObject = {feature: feature, polygons:[]};
                for (let polygon1 of geom.coordinates) {
                    //console.log("polygon1", polygon1);
                    let polygonCoords = [];
                    if (!Array.isArray(polygon1)) throw "Invalid Polygon [1-1]";
                    for (let polygonCoord of polygon1) {
                        if (!Array.isArray(polygonCoord) || polygonCoord.length != 2) throw "Invalid Polygon [1-2]";
                        polygonCoords.push([polygonCoord[0], polygonCoord[1]]);
                    }
                    polygonObject.polygons.push(polygonCoords);
                }
                let borderColor = (typeof(this.options.polygonBorderColor) == "function")?this.options.polygonBorderColor(feature):this.options.polygonBorderColor;
                if (borderColor) {
                    if (borderColor.length == 3) borderColor.push(255);
                    polygonObject.borderColor = [borderColor[0] / 255, borderColor[1] / 255, borderColor[2] / 255, borderColor[3] / 255];
                }
                let color = (typeof(this.options.polygonColor) == "function")?this.options.polygonColor(feature):this.options.polygonColor;                
                if (color) {
                    if (color.length == 3) color.push(255);
                    polygonObject.color = [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255];
                }
                let flatten = earcut.flatten(geom.coordinates);
                if (flatten.dimensions != 2) throw "Poligono invalido";
                let triangles = earcut(flatten.vertices, flatten.holes, flatten.dimensions);
                polygonObject.flatten = flatten;
                polygonObject.triangles = triangles;
                this.polygons.push(polygonObject);       
            } else if (geom.type == "LineString") {
                if (!this.lines) this.lines = [];                
                let lineObject = {feature, points:[]};
                let coordinates = geom.coordinates;
                if (this.options.smoothLines) {
                    let curved = turf.bezierSpline(turf.lineString(coordinates));
                    coordinates = curved.geometry.coordinates;
                }
                for (let coord of coordinates) {
                    lineObject.points.push(coord);
                }                
                let color = (typeof(this.options.lineColor) == "function")?this.options.lineColor(feature):this.options.lineColor;                
                if (color) {
                    if (color.length == 3) color.push(255);
                    lineObject.color = [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255];
                }
                this.lines.push(lineObject);
            } else {
                //console.error("geometria no manejada", geom.type);
            }
        }        

        L.CanvasOverlay.prototype.redraw.call(this, map);   
        if (this.polygons) {
            let PolygonLookup = require("polygon-lookup");
            this.polygonLookup = new PolygonLookup({type:"FeatureCollection", features})            
        }
    },
    drawCanvas(canvas, map) {
        if (!this.gl) return;
        const gl = this.gl;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.depthMask(false);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        if (this.polygons) { // Pintar PolygonBorders y Polygons
            let borderLines = [], borderColors = [];
            let polygonVertices = [], polygonColors = [];
            for (let polygonObject of this.polygons) {
                if (polygonObject.borderColor || polygonObject.color) {
                    let flatten = polygonObject.flatten;
                    let points = []; // Puntos mapeados a viewport WebGL
                    for (let i=0; i<flatten.vertices.length; i+=2) {
                        let p = this.latLngToWebGL.call(this, flatten.vertices[i+1], flatten.vertices[i]);
                        points.push(p);
                    }
                    if (polygonObject.borderColor) {
                        let nextHole=0, idxHole=-1, firstPoint=null, lastPoint=null;;
                        for (let i=0; i<points.length; i++) {
                            let p = points[i];
                            if (i == nextHole) {
                                // Cerrar linea anterior y comenzar una nueva
                                if (firstPoint) {
                                    borderLines.push(lastPoint.x, lastPoint.y, 0, firstPoint.x, firstPoint.y, 0);
                                    borderColors.push(polygonObject.borderColor[0], polygonObject.borderColor[1], polygonObject.borderColor[2], polygonObject.borderColor[3]);
                                    borderColors.push(polygonObject.borderColor[0], polygonObject.borderColor[1], polygonObject.borderColor[2], polygonObject.borderColor[3]);
                                }
                                firstPoint = p;
                                lastPoint = p;
                                if (++idxHole < flatten.holes.length) {
                                    nextHole = flatten.holes[idxHole];
                                }
                            } else {
                                borderLines.push(lastPoint.x, lastPoint.y, 0, p.x, p.y, 0);
                                borderColors.push(polygonObject.borderColor[0], polygonObject.borderColor[1], polygonObject.borderColor[2], polygonObject.borderColor[3]);
                                borderColors.push(polygonObject.borderColor[0], polygonObject.borderColor[1], polygonObject.borderColor[2], polygonObject.borderColor[3]);
                                lastPoint = p;
                            }
                        }
                        if (firstPoint) {
                            borderLines.push(lastPoint.x, lastPoint.y, 0, firstPoint.x, firstPoint.y, 0);
                            borderColors.push(polygonObject.borderColor[0], polygonObject.borderColor[1], polygonObject.borderColor[2], polygonObject.borderColor[3]);
                            borderColors.push(polygonObject.borderColor[0], polygonObject.borderColor[1], polygonObject.borderColor[2], polygonObject.borderColor[3]);
                        }
                    }
                    if (polygonObject.color) {
                        triangles = polygonObject.triangles;
                        for (let i=0; i<triangles.length; i+=3) {
                            let p0 = points[triangles[i]],
                                p1 = points[triangles[i+1]],
                                p2 = points[triangles[i+2]];
                            polygonVertices.push(p0.x, p0.y, 0, p1.x, p1.y, 0, p2.x, p2.y, 0);
                            polygonColors.push(...polygonObject.color);
                            polygonColors.push(...polygonObject.color);
                            polygonColors.push(...polygonObject.color);                            
                        }
                    }
                }
            }
                        
            
            if (polygonVertices.length) {                                
                gl.useProgram(this.polygonProgram);
                // Llenar colores
                gl.bindBuffer(gl.ARRAY_BUFFER, this.polygonColorsBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(polygonColors), gl.STATIC_DRAW);
                let colors = gl.getAttribLocation(this.polygonProgram, "colors");
                gl.vertexAttribPointer(colors, 4, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(colors);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
                
                // Llenar coordenadas
                gl.bindBuffer(gl.ARRAY_BUFFER, this.polygonVertexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(polygonVertices), gl.STATIC_DRAW);                
                let coordinates = gl.getAttribLocation(this.polygonProgram, "coordinates");
                gl.vertexAttribPointer(coordinates, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(coordinates);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                gl.drawArrays(gl.TRIANGLES, 0, polygonVertices.length / 3);
            }
            
            if (borderLines.length) {
                gl.useProgram(this.polygonBordersProgram);
                
                // Llenar colores
                gl.bindBuffer(gl.ARRAY_BUFFER, this.polygonBorderLinesColorsBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(borderColors), gl.STATIC_DRAW);
                let colors = gl.getAttribLocation(this.polygonBordersProgram, "colors");
                gl.vertexAttribPointer(colors, 4, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(colors);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
                
                // Llenar coordenadas
                gl.bindBuffer(gl.ARRAY_BUFFER, this.polygonBorderLinesVertexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(borderLines), gl.STATIC_DRAW);
                let coordinates = gl.getAttribLocation(this.polygonBordersProgram, "coordinates");
                gl.vertexAttribPointer(coordinates, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(coordinates);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
                
                // Dibujar bordes
                gl.drawArrays(gl.LINES, 0, borderLines.length / 3);
            }            
        }    
        
        if (this.lines) {
            let linePoints=[], lineColors=[];
            for (let lineObject of this.lines) {                                
                let lastPoint=null;                
                for (let point of lineObject.points) {
                    let p = this.latLngToWebGL.call(this, point[1], point[0]);
                    if (lastPoint) {
                        linePoints.push(lastPoint.x, lastPoint.y, 0, p.x, p.y, 0);
                        lineColors.push(...(lineObject.color || [0,0,0,1]), ...(lineObject.color || [0,0,0,1]));
                    }
                    lastPoint = p;
                }
            }
            gl.useProgram(this.linesProgram);                
            // Llenar colores
            gl.bindBuffer(gl.ARRAY_BUFFER, this.linesColorsBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineColors), gl.STATIC_DRAW);
            let colors = gl.getAttribLocation(this.linesProgram, "colors");
            gl.vertexAttribPointer(colors, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(colors);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            
            // Llenar coordenadas
            gl.bindBuffer(gl.ARRAY_BUFFER, this.linesVertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(linePoints), gl.STATIC_DRAW);
            let coordinates = gl.getAttribLocation(this.linesProgram, "coordinates");
            gl.vertexAttribPointer(coordinates, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(coordinates);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            
            // Dibujar bordes
            gl.drawArrays(gl.LINES, 0, linePoints.length / 3);
        }
    },
    findPolygon:function(lat, lng) {
        if (!this.polygonLookup) return null;
        return this.polygonLookup.search(lng, lat);
    }
})

L.geoJsonOverlay = function(options) {
    return new L.GeoJsonOverlay(options);
};