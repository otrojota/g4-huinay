L.VectorsOverlay = L.CanvasOverlay.extend({
    options: {       
        contextType: "webgl", 
        color: [0,0,0,255],
        interpolate:null //{nRows:10, nCols:10}
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
        if (this.linesVertexShader) gl.deleteShader(this.linesVertexShader);
        if (this.linesFragmentShader) gl.deleteShader(this.linesFragmentShader);
        if (this.linesVertexBuffer) gl.deleteBuffer(this.linesVertexBuffer);
        if (this.linesColorsBuffer) gl.deleteBuffer(this.linesColorsBuffer);
        if (this.linesProgram) gl.deleteProgram(this.linesProgram);
    },
    _getInperpolatedVector(lat, lng) {
        // https://en.wikipedia.org/wiki/Bilinear_interpolation
        // espacio (0,1)        
        let b = this.box, rowsU = this.rowsU, rowsV = this.rowsV;
        if (lat <= b.lat0 || lat >= b.lat1 || lng <= b.lng0 || lng >= b.lng1) return null;
        let i = parseInt((lng - b.lng0) / b.dLng);
        let j = parseInt((lat - b.lat0) / b.dLat);
        if (i >= (this.nCols - 1) || j >= (this.nRows - 1)) return;
        let x0 = b.lng0 + b.dLng*i;
        let x = (lng - x0) / b.dLng;
        let y0 = b.lat0 + b.dLat*j;
        let y = (lat - y0) / b.dLat;
        let rx = 1 - x, ry = 1 - y;

        let u00 = rowsU[j][i], u10 = rowsU[j][i+1], u01 = rowsU[j+1][i], u11 = rowsU[j+1][i+1];
        if (u00 == null || u10 == null || u01 == null || u11 == null) return null;
        let u = u00*rx*ry + u10*x*ry + u01*rx*y + u11*x*y;

        let v00 = rowsV[j][i], v10 = rowsV[j][i+1], v01 = rowsV[j+1][i], v11 = rowsV[j+1][i+1];
        if (v00 == null || v10 == null || v01 == null || v11 == null) return null;
        let v = v00*rx*ry + v10*x*ry + v01*rx*y + v11*x*y;
        return {u, v};
    },
    setVectorsGridData:function(box, rowsU, rowsV, nrows, ncols) {
        this.box = box;
        this.rowsU = rowsU;
        this.rowsV = rowsV;
        this.nRows = nrows;
        this.nCols = ncols;
        this.lines = [];

        if (this.options.interpolate) {
            let newBox = {
                lat0: this.box.lat0, lat1:this.box.lat1, 
                lng0: this.box.lng0, lng1: this.box.lng1,
                dLat: (this.box.lat1 - this.box.lat0) / this.options.interpolate.nRows,
                dLng: (this.box.lng1 - this.box.lng0) / this.options.interpolate.nCols
            }
            let newRowsU = [], newRowsV = [];
            for (let iRow=0, lat=this.box.lat0; iRow<this.options.interpolate.nRows; iRow++, lat += newBox.dLat) {
                newRowsU[iRow] = [];
                newRowsV[iRow] = [];
                for (let iCol=0, lng=this.box.lng0; iCol<this.options.interpolate.nCols; iCol++, lng += newBox.dLng) {
                    let ret = this._getInperpolatedVector(lat, lng);
                    let u=null, v=null;
                    if (ret) {u = ret.u; v = ret.v;}
                    newRowsU[iRow].push(u);
                    newRowsV[iRow].push(v);
                }
            }
            this.box = newBox;
            this.rowsU = newRowsU;
            this.rowsV = newRowsV;
            this.nRows = this.options.interpolate.nRows;
            this.nCols = this.options.interpolate.nCols;
        }

        this.rowsMagnitudes = [];
        this.maxMagnitud = undefined;
        this.minMagnitud = undefined;
        for (let iRow=0; iRow<this.nRows; iRow++) {
            let rowMagnitudes = [];
            for (let iCol=0; iCol<this.nCols; iCol++) {
                let u = this.rowsU[iRow][iCol];
                let v = this.rowsV[iRow][iCol];
                if (u !== undefined && v !== undefined) {
                    let m = Math.sqrt(u*u + v*v);
                    if (this.minMagnitud === undefined || m < this.minMagnitud) this.minMagnitud = m;
                    if (this.maxMagnitud === undefined || m > this.maxMagnitud) this.maxMagnitud = m;
                    rowMagnitudes.push(m);
                }
            }
            this.rowsMagnitudes.push(rowMagnitudes);
        }

        L.CanvasOverlay.prototype.redraw.call(this, map);   
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

        const bounds = map.getBounds();
        let p0 = map.latLngToContainerPoint([bounds.getSouth(), bounds.getWest()]);
        let p1 = map.latLngToContainerPoint([bounds.getNorth(), bounds.getEast()]);
        const w = (p1.x - p0.x);
        const h = (p1.y - p0.y);
                
        // Calcular largo máximo de una linea
        let boxP0 = map.latLngToContainerPoint([this.box.lat0, this.box.lng0]);
        let boxP1 = map.latLngToContainerPoint([this.box.lat1, this.box.lng1]);
        let maxLen = Math.min((boxP1.x - boxP0.x) / this.nCols, (boxP0.y - boxP1.y) / this.nRows);


        let rotate = (s, c, p, a) => {
            a.x -= p.x; a.y -= p.y;
            let newX = a.x*c - a.y*s;
            let newY = a.x*s + a.y*c;
            a.x = newX + p.x; a.y = newY + p.y;
        }
        let canvas2WebGL = p => {
            p.x = (p.x - p0.x) / w * 2 - 1;
            p.y = (p.y - p0.y) / h * 2 - 1;
            return p;
        }
        let color = [...this.options.color];
        while(color.length < 4) color.push(255);
        color[0] /= 255; color[1] /= 255; color[2] /= 255; color[3] /= 255;
        let linePoints=[], lineColors=[];
        let lng = this.box.lng0, lat = this.box.lat0;
        for (let iRow=0; iRow<this.nRows; iRow++) {
            lng=this.box.lng0;
            for (let iCol=0; iCol<this.nCols; iCol++) {
                let u = this.rowsU[iRow][iCol];
                let v = this.rowsV[iRow][iCol];
                if (u !== null && v !== null) {
                    let m = this.rowsMagnitudes[iRow][iCol];
                    let angle = Math.atan2(u, v) - Math.PI / 2;
                    let scale = 0.3 + 0.65 * (m -this.minMagnitud) / (this.maxMagnitud - this.minMagnitud);
                    if (isNaN(scale)) scale = 1;
                    let len = maxLen * scale;
                    let p = this._map.latLngToContainerPoint([lat, lng]);                    
                    let a0 = {x: p.x - len/2, y: p.y};
                    let a1 = {x: p.x + len/2, y: p.y};
                    let alenx = len / 5;
                    let aleny = len / 5;
                    let a2 = {x:a1.x - alenx, y:a1.y + aleny}
                    let a3 = {x:a1.x - alenx, y:a1.y - aleny}
                    // rotar puntos respecto al centro
                    let s = Math.sin(angle), c = Math.cos(angle);
                    rotate(s, c, p, a0);
                    rotate(s, c, p, a1);
                    rotate(s, c, p, a2);
                    rotate(s, c, p, a3);
                    canvas2WebGL(a0);
                    canvas2WebGL(a1);
                    canvas2WebGL(a2);
                    canvas2WebGL(a3);
                    // Linea
                    linePoints.push(a0.x, a0.y, 0, a1.x, a1.y, 0);
                    lineColors.push(...(color || [0,0,0,1]), ...(color || [0,0,0,1]));
                    // Flecha
                    linePoints.push(a2.x, a2.y, 0, a1.x, a1.y, 0, a1.x, a1.y, 0, a3.x, a3.y, 0);
                    lineColors.push(...(color || [0,0,0,1]), ...(color || [0,0,0,1]), ...(color || [0,0,0,1]), ...(color || [0,0,0,1]));                    
                }

                lng += this.box.dLng;
            }
            lat += this.box.dLat;
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
})

L.vectorsOverlay = function(options) {
    return new L.VectorsOverlay(options);
};