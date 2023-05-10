L.ShaderOverlay = L.CanvasOverlay.extend({
    options: {        
        contextType: "webgl",
        getColor: function(v, lat, lng) {return [255,0,0,50]},
        interpolate: null   // {minCols:150, minRows: 150}
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
            attribute vec2 a_texcoord;
            varying vec2 v_texcoord;
            void main() {
                gl_Position = a_position;
                v_texcoord = a_texcoord;
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
            varying highp vec2 v_texcoord;
            uniform sampler2D u_texture;             
            void main() {
                gl_FragColor = texture2D(u_texture, v_texcoord);
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
            texCoord: gl.getAttribLocation(this.program, 'a_texcoord')
        }

        // Buffers
        this.buffers = {
            position:gl.createBuffer(),
            indexes:gl.createBuffer(),
            texture:gl.createBuffer()
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
            gl.deleteBuffer(this.buffers.texture);
        }
    },
    setGridData:function(box, rows, nrows, ncols) {
        this.box = box;
        this.rows = rows;
        this.nrows = nrows;
        this.ncols = ncols;
        L.CanvasOverlay.prototype.redraw.call(this, map);   
    },
    interpolate(lat, lng, box, rows, nCols, nRows) {
        return window.g4.interpolate(lat, lng, box, rows, nCols, nRows);
    },
    buildTextureImage() {
        let box = this.box;
        let dLat = box.dLat;
        let dLng = box.dLng;
        let nrows = this.nrows;
        let ncols = this.ncols;
        let rows = this.rows;
        let interpolating = false;
        if (this.options.interpolate && (ncols < this.options.interpolate.minCols || nrows < this.options.interpolate.minRows)) {
            interpolating = true;
            nrows = this.options.interpolate.minRows;
            ncols = this.options.interpolate.minCols;
            dLat = (box.lat1 - box.lat0) / nrows;
            dLng = (box.lng1 - box.lng0) / ncols;
        }

        let image = [];
        for (let iRow=0, lat=box.lat0; iRow < nrows; iRow++, lat += dLat) {
            for(let iCol=0,lng = box.lng0; iCol<ncols; iCol++, lng += dLng) {
                let v;
                if (!interpolating) {
                    //v = rows[iRow]?rows[iRow][iCol]:null;
                    v = rows[iRow][iCol];
                } else {
                    v = this.interpolate.call(this, lat, lng, this.box, rows, this.ncols, this.nrows);
                }                
                if (!v) {
                    image.push(255,0,0,0);
                } else {
                    let colors = this.options.getColor(v, lat, lng);
                    while (colors.length < 4) colors.push(255);
                    image.push(...colors);
                }                
               // image.push(parseInt(255 * iRow/nrows), 0, parseInt(255 * iCol/ncols), 255)
            }
        }
        return {width:ncols, height:nrows, colors:image}
    },
    isPowerOf2(value) {
        return (value & (value - 1)) === 0;
    },
    drawCanvas(canvas, map) {
        if (!this.gl) return;
        if (!this.box || !this.rows) {
            const gl = this.gl;
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            return;
        }
        
        // constantes para coordenadas box=>Textura
        let tdx = (this.box.lng1 - this.box.lng0);
        let tdy = (this.box.lat1 - this.box.lat0);

        const gl = this.gl;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.depthMask(false);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        let vertexPositions = [], indexes = [], textureCoordinates = [];
        let pointIndex = {};  // {iRow-iCol:int}
        let box = this.box;
        let dLat = box.dLat;
        let dLng = box.dLng;
        let nrows = this.nrows;
        let ncols = this.ncols;
        let rows = this.rows;

        for (let iRow=nrows-1, lat=this.box.lat1 - dLat; iRow>=0; iRow--, lat -= dLat) {
            for(let iCol=0,lng = this.box.lng0; iCol<ncols; iCol++, lng += dLng) {
                let key = iRow + "-" + iCol;
                let p = this.latLngToWebGL.call(this, lat, lng);
                pointIndex[key] = vertexPositions.length / 2;
                vertexPositions.push(p.x, p.y);
                let tx = (lng - this.box.lng0) / tdx;
                let ty = (lat - this.box.lat0) / tdy;
                textureCoordinates.push(tx, ty);
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

        gl.useProgram(this.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.locations.position);
        gl.vertexAttribPointer(this.locations.position, 2, gl.FLOAT, false, 0, 0);

        let img = this.buildTextureImage.call(this);
        let tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, img.width, img.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
            new Uint8Array(img.colors)
        )        

        if (this.isPowerOf2.call(this, img.width) && this.isPowerOf2.call(this, img.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // No, it's not a power of 2. Turn off mips and set
            // wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texture);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.locations.texCoord);
        gl.vertexAttribPointer(this.locations.texCoord, 2, gl.FLOAT, false, 0, 0);

        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        let samplerLoc = gl.getUniformLocation(this.program, "u_texture");
        gl.uniform1i(samplerLoc, 0);
        

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indexes);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexes), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indexes);
        gl.drawElements(gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0);        
    }
})

L.shaderOverlay = function(options) {
    return new L.ShaderOverlay(options);
};