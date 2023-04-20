L.ShaderOverlay = L.CanvasOverlay.extend({
    options: {        
        getColor: function(v, lat, lng) {return [255,0,0,50]}
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
        // Vertex Shader
        this.gl = this._canvas.getContext('webgl', {antialiasing: false});
        const gl = this.gl;
        this.vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(this.vertexShader, `
            attribute vec4 a_position;
            attribute vec4 aVertexColor;
            varying lowp vec4 vColor;
            void main() {
                gl_Position = a_position;
                vColor = aVertexColor;
            }
        `);
        gl.compileShader(this.vertexShader);
        if (!gl.getShaderParameter(this.vertexShader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(this.vertexShader));
            gl.deleteShader(this.vertexShader);
            this.vertexShader = null;
            throw "Error compilando vertexShader";
        }

        // Fragment Shader
        this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(this.fragmentShader, `
            varying lowp vec4 vColor;            
            void main() {
                gl_FragColor = vColor;
            }
        `);
        gl.compileShader(this.fragmentShader);
        if (!gl.getShaderParameter(this.fragmentShader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(this.fragmentShader));
            gl.deleteShader(this.fragmentShader);
            this.fragmentShader = null;
            throw "Error compilando fragmentShader";
        }

        // Program
        this.program = gl.createProgram();
        gl.attachShader(this.program, this.vertexShader);
        gl.attachShader(this.program, this.fragmentShader);
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(this.program));
            gl.deleteProgram(this.program);
            this.program = null;
            throw "Error creando program";
        }

        // Attributes Locations
        this.locations = {
            position:gl.getAttribLocation(this.program, "a_position"),
            vertexColor: gl.getAttribLocation(this.program, 'aVertexColor')
        }

        // Buffers
        this.buffers = {
            position:gl.createBuffer(),
            indexes:gl.createBuffer(),
            color:gl.createBuffer()
        }
    },
    destroyWebGL: function() {
        const gl = this.gl;
        if (this.vertexShader) gl.deleteShader(this.vertexShader);
        if (this.fragmentShader) gl.deleteShader(this.fragmentShader);
        if (this.program) gl.deleteProgram(this.program);
        if (this.buffers) {
            gl.deleteBuffer(this.buffers.position);
            gl.deleteBuffer(this.buffers.indexes);
            gl.deleteBuffer(this.buffers.color);
        }
    },
    setGridData:function(box, rows, nrows, ncols) {
        this.box = box;
        this.rows = rows;
        this.nrows = nrows;
        this.ncols = ncols;
        L.CanvasOverlay.prototype.redraw.call(this, map);   
    },
    drawCanvas(canvas, map) {
        if (!this.gl) return;
        if (!this.box || !this.rows) {
            const gl = this.gl;
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            return;
        }
        const nrows = this.nrows, ncols = this.ncols;
        const rows = this.rows;
        const bounds = map.getBounds();
        let p0 = map.latLngToContainerPoint([bounds.getSouth(), bounds.getWest()]);
        let p1 = map.latLngToContainerPoint([bounds.getNorth(), bounds.getEast()]);

        const gl = this.gl;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.depthMask(false);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        let vertexPositions = [], indexes = [], vertexColors = [];
        let pointIndex = {};  // {iRow-iCol:int}
        for (let iRow=nrows-1, lat=this.box.lat1 - this.box.dLat; iRow>=0; iRow--, lat -= this.box.dLat) {
            for(let iCol=0,lng = this.box.lng0; iCol<ncols; iCol++, lng += this.box.dLng) {
                let key = iRow + "-" + iCol;
                let v = rows[iRow][iCol];
                if (v !== null) {
                    let p = map.latLngToContainerPoint({lat, lng})
                    let x = (p.x - p0.x) / (p1.x - p0.x) * 2 - 1;
                    let y = (p.y - p0.y) / (p1.y - p0.y) * 2 - 1;
                    pointIndex[key] = vertexPositions.length / 2;
                    vertexPositions.push(x, y);                    
                    let colors = this.options.getColor(v, lat, lng);
                    while (colors.length < 4) colors.push(255);                    
                    vertexColors.push(colors[0]/255, colors[1]/255, colors[2]/255, colors[3]/255);
                }
                if (iRow < (nrows - 1) && iCol > 0) {
                    let keySE = key, idxSE = pointIndex[keySE], existeSE = idxSE !== undefined;
                    let keySW = iRow + "-" + (iCol - 1), idxSW = pointIndex[keySW], existeSW = idxSW !== undefined;
                    let keyNW = (iRow + 1) + "-" + (iCol - 1), idxNW = pointIndex[keyNW], existeNW = idxNW !== undefined;
                    let keyNE = (iRow + 1) + "-" + iCol, idxNE = pointIndex[keyNE], existeNE = idxNE !== undefined;
                    if (existeSE) {
                        if (existeSW) {
                            if (existeNW) {
                                indexes.push(idxSE, idxSW, idxNW);
                                if (existeNE) {
                                    indexes.push(idxSE, idxNW, idxNE);
                                }
                            } else { // !existeNW
                                if (existeNE) {
                                    indexes.push(idxSE, idxSW, idxNE);
                                }
                            }
                        } else {  // !existeSW
                            if (existeNW) {
                                if (existeNE) {
                                    indexes.push(idxSE, idxNW, idxNE);
                                }
                            }
                        }
                    } else {  // !existeSE
                        if (existeSW) {
                            if (existeNW) {
                                if (existeNE) {
                                    indexes.push(idxSW, idxNW, idxNE);
                                }
                            }
                        }
                    }
                }
            }
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.locations.position);
        gl.vertexAttribPointer(this.locations.position, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColors), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.locations.vertexColor);
        gl.vertexAttribPointer(this.locations.vertexColor, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indexes);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexes), gl.STATIC_DRAW);

        gl.useProgram(this.program);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indexes);
        gl.drawElements(gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0);
    }
})

L.shaderOverlay = function(options) {
    return new L.ShaderOverlay(options);
};