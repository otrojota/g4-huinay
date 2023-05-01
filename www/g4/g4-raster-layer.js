
class G4RasterLayer extends G4Layer {
    get type() {return "raster"}
    get dependsOnTime() {return this.config.dependsOnTime?true:false;}
    get dataSetCode() {return this.config.dataSet};
    get variableCode() {return this.config.variable};
    get isolinesURL() {
        let b = window.g4.mapController.getCurrentBounds(0.25);
        let url = `${window.g4.getGeoserverURL(this.config.geoserver)}/${this.dataSetCode}/${this.variableCode}/isolines?n=${b.n}&s=${b.s}&e=${b.e}&w=${b.w}`;
        if (this.dependsOnTime) url += "&time=" + window.g4.time.valueOf();
        if (this.isolinesFixedLevels) url += "&fixedLevels=" + this.isolinesFixedLevels;
        else if (this.isolinesIncrement) url += "&increment=" + this.isolinesIncrement;
        return url;
    }
    get isobandsURL() {
        let b = window.g4.mapController.getCurrentBounds(0.25);
        let url = `${window.g4.getGeoserverURL(this.config.geoserver)}/${this.dataSetCode}/${this.variableCode}/isobands?n=${b.n}&s=${b.s}&e=${b.e}&w=${b.w}`;
        if (this.dependsOnTime) url += "&time=" + window.g4.time.valueOf();
        if (this.isobandsIncrement) url += "&increment=" + this.isobandsIncrement;
        return url;
    }
    get gridURL() {
        let b = window.g4.mapController.getCurrentBounds(0.25);
        let url = `${window.g4.getGeoserverURL(this.config.geoserver)}/${this.dataSetCode}/${this.variableCode}/grid?n=${b.n}&s=${b.s}&e=${b.e}&w=${b.w}&margin=2`;
        if (this.dependsOnTime) url += "&time=" + window.g4.time.valueOf();
        return url;
    }
    get vectorsGridURL() {
        let b = window.g4.mapController.getCurrentBounds(0.25);
        let url = `${window.g4.getGeoserverURL(this.config.geoserver)}/${this.dataSetCode}/${this.variableCode}/vectorsGrid?n=${b.n}&s=${b.s}&e=${b.e}&w=${b.w}`;
        if (this.dependsOnTime) url += "&time=" + window.g4.time.valueOf();
        return url;
    }

    constructor(name, config) {
        super(null, name);
        this.config = config;    
        this.mapChangeListener = _ => this.refresh();
        window.g4.on("map-change", this.mapChangeListener);
        this.timeChangeListener = _ => this.refresh();
    }
    async g4destroy() {
        window.g4.remove("map-change", this.mapChangeListener);
        if (this.dependsOnTime) window.g4.remove("time-change", this.timeChangeListener);
        if (this.isolinesLayer) {
            this.isolinesLayer.remove();
            this.isolinesLayer = null;
            this.isolinesMarkersLayer.remove();
            this.isolinesMarkersLayer = null;
        }
        if (this.isobandsLayer) {
            this.isobandsLayer.remove();
            this.isobandsLayer = null;
        }
        if (this.shaderLayer) {
            this.shaderLayer.remove();
            this.shaderLayer = null;
        }
        if (this.particlesLayer) {
            this.particlesLayer.remove();
            this.particlesLayer = null;
        }
        if (this.vectorsLayer) {
            this.vectorsLayer.remove();
            this.vectorsLayer = null;
        }
        if (this.barbsLayer) {
            this.barbsLayer.remove();
            this.barbsLayer = null;
        }
    }

    getFile(url, controller) {
        return new Promise((resolve, reject) => {            
            this._getJSON(url, controller.signal)
                .then(json => {
                    resolve(json)
                })
                .catch(error => {
                    reject(error);
                });
        })
    }
    async g4init() {
        try {
            super.g4init();
            let {dataSet, variable} = await window.g4.getGeoserverVariableMetadata(this.config.geoserver, this.dataSetCode, this.variableCode);
            this.dataSet = dataSet;
            this.variable = variable;
            if (this.config.opacity) this._opacity = this.config.opacity;
            if (this.dependsOnTime) window.g4.on("time-change", this.timeChangeListener);
        } catch(error) {
            console.error(error);
        }
    }

    roundValue(v) {
        if (v === undefined || v === null) return "";
        let dec = this.variable.options?this.variable.options.decimals:2;
        if (dec === undefined) dec = 2;
        return v.toFixed(dec);
    }

    async refresh() {
        try {
            this.cancel();
            // Obtener los datos (para no repetir, algunos visualizadores usan los mismos)
            this.grid = null; this.vectorsGrid = null; this.isolinesGeoJson = null; this.isobandsGeoJson = null;
            let getFilesPromises = [];
            let addedFiles = {};
            if (this.config.shader && this.config.shader.active && !addedFiles.grid) {
                addedFiles.grid = true;
                getFilesPromises.push(this.getFileGrid());
            }
            if (this.config.particles && this.config.particles.active && !addedFiles.vectorsGrid) {
                addedFiles.vectorsGrid = true;
                getFilesPromises.push(this.getFileVectorsGrid());
            }
            if (this.config.vectors && this.config.vectors.active && !addedFiles.vectorsGrid) {
                addedFiles.vectorsGrid = true;
                getFilesPromises.push(this.getFileVectorsGrid());
            }
            if (this.config.barbs && this.config.barbs.active && !addedFiles.vectorsGrid) {
                addedFiles.vectorsGrid = true;
                getFilesPromises.push(this.getFileVectorsGrid());
            }
            if (this.config.isobands && this.config.isobands.active && !addedFiles.isobandsGeoJson) {
                addedFiles.isobandsGeoJson = true;
                getFilesPromises.push(this.getFileIsobandsGeoJson());
            }
            if (this.config.isolines && this.config.isolines.active && !addedFiles.isolinesGeoJson) {
                addedFiles.isolinesGeoJson = true;
                getFilesPromises.push(this.getFileIsolinesGeoJson());
            }

            await Promise.all(getFilesPromises);
            await this.drawVisualizers();
        } catch(error) {
            console.error(error);
        }
    }

    async drawVisualizers() {
        // Dibujado
        let drawPromises = [];
        if (this.config.shader && this.config.shader.active) {
            drawPromises.push(this.drawShader());
        } else if (this.shaderLayer) {
            this.shaderLayer.remove();
            this.shaderLayer = null;
        }
        if (this.config.particles && this.config.particles.active) {
            drawPromises.push(this.drawParticles());
        } else if (this.particlesLayer) {
            this.particlesLayer.remove();
            this.particlesLayer = null;
        }
        if (this.config.vectors && this.config.vectors.active) {
            drawPromises.push(this.drawVectors());
        } else if (this.vectorsLayer) {
            this.vectorsLayer.remove();
            this.vectorsLayer = null;
        }            
        if (this.config.barbs && this.config.barbs.active) {
            drawPromises.push(this.drawBarbs());
        } else if (this.barbsLayer) {
            this.barbsLayer.remove();
            this.barbsLayer = null;
        }            
        if (this.config.isobands && this.config.isobands.active) {
            drawPromises.push(this.drawIsobands());
        } else if (this.isobandsLayer) {
            this.isobandsLayer.remove();
            this.isobandsLayer = null;
        }            
        if (this.config.isolines && this.config.isolines.active) {
            drawPromises.push(this.drawIsolines());
        } else if (this.isolinesLayer) {
            this.isolinesLayer.remove();
            this.isolinesLayer = null;
            this.isolinesMarkersLayer.remove();
            this.isolinesMarkersLayer = null;
        }   
        //await Promise.all(drawPromises);
        Promise.all(drawPromises);
    }

    async getFileGrid() {
        this.gridCurrentController = new AbortController();
        try {
            this.grid = await this.getFile(this.gridURL, this.gridCurrentController);
        } catch(error) {
            throw error;
        } finally {
            this.gridCurrentController = null;
        }
    }
    async getFileVectorsGrid() {
        this.particlesCurrentController = new AbortController();
        try {
            this.vectorsGrid = await this.getFile(this.vectorsGridURL, this.particlesCurrentController);
        } catch(error) {
            throw error;
        } finally {
            this.particlesCurrentController = null;
        }
    }
    async getFileIsobandsGeoJson() {
        this.isobandsCurrentController = new AbortController();
        try {
            this.isobandsGeoJson = await this.getFile(this.isobandsURL, this.isobandsCurrentController);
        } catch(error) {
            throw error;
        } finally {
            this.isobandsCurrentController = null;
        }
    }
    async getFileIsolinesGeoJson() {
        this.isolinesCurrentController = new AbortController();
        try {
            this.isolinesGeoJson = await this.getFile(this.isolinesURL, this.isolinesCurrentController);
        } catch(error) {
            throw error;
        } finally {
            this.isolinesCurrentController = null;
        }
    }
    

    getShaderColor(v) {
        let c = this.shaderColorScale.getColorObject(v); 
        return c;
    }
    async drawShader() {
        try {
            if (!this.shaderColorScale) {
                if (!this.config.shader.colorScale) throw "No hay 'colorScale' para la capa-shader";
                this.shaderColorScale = window.g4.createColorScale(this.config.geoserver, this.config.shader.colorScale.name, this.config.shader.colorScale);
            }
            if (!this.grid) await this.getFileGrid();
            this.shaderColorScale.setRange(this.grid.min, this.grid.max);
            if (!this.shaderLayer) {
                this.shaderLayer = new L.ShaderOverlay({
                    getColor: (v, lat, lng) => {return this.getShaderColor(v);},
                    zIndex:(this.getOrder() >= 0)?200 + 10 *this.getOrder():-1,
                    opacity: this.getOpacity(),
                    interpolate: this.config.shader.interpolate
                });
                this.shaderLayer.addTo(window.g4.mapController.map);
            }    
            this.shaderLayer.setGridData(this.grid.foundBox, this.grid.rows, this.grid.nrows, this.grid.ncols);
        } catch(error) {
            console.error(error);
            if (this.shaderLayer) {
                this.shaderLayer.remove();
                this.shaderLayer = null;
            }
            throw error;
        }
    }

    async drawParticles() {
        try {
            if (!this.particlesLayer) {
                let opts = {
                    zIndex:(this.getOrder() >= 0)?204 + 10 *this.getOrder():-1,
                    opacity: this.getOpacity()                        
                }                    
                if (this.config.particles.color) opts.color = this.config.particles.color;
                if (this.config.particles.particles) opts.paths = this.config.particles.particles;
                if (this.config.particles.width) opts.width = this.config.particles.width;
                if (this.config.particles.fade) opts.fade = this.config.particles.fade;
                if (this.config.particles.duration) opts.duration = this.config.particles.duration;
                if (this.config.particles.maxAge) opts.maxAge = this.config.particles.maxAge;
                if (this.config.particles.velocityScale) opts.velocityScale = this.config.particles.velocityScale;
                
                this.particlesLayer = new L.ParticlesOverlay(opts);
                this.particlesLayer.addTo(window.g4.mapController.map);
            }
            if (!this.vectorsGrid) await this.getFileVectorsGrid();
            this.particlesLayer.setVectorsGridData(this.vectorsGrid.foundBox, this.vectorsGrid.rowsU, this.vectorsGrid.rowsV, this.vectorsGrid.nrows, this.vectorsGrid.ncols);
        } catch(error) {
            console.error(error);
            if (this.particlesLayer) {
                this.particlesLayer.remove();
                this.particlesLayer = null;
            }
            throw error;
        }
    }

    async drawVectors() {
        try {
            if (!this.vectorsLayer) {
                let opts = {
                    zIndex:(this.getOrder() >= 0)?205 + 10 *this.getOrder():-1,
                    opacity: this.getOpacity(),
                    pixelsRatio: 1 // forzar a 1 para ver lineas más gruesas (Limitación de WebGL de ancho = 1)  
                }
                if (this.config.vectors.color) {
                    opts.color = this.config.vectors.color;
                    while(opts.color.length < 4) opts.color.push(255);
                }
                if (this.vectorsInterpolate) opts.interpolate = {nRows: this.vectorsInterpolateRows, nCols: this.vectorsInterpolateCols}
                this.vectorsLayer = new L.VectorsOverlay(opts);
                this.vectorsLayer.addTo(window.g4.mapController.map);
            }
            if (!this.vectorsGrid) await this.getFileVectorsGrid();
            this.vectorsLayer.setVectorsGridData(this.vectorsGrid.foundBox, this.vectorsGrid.rowsU, this.vectorsGrid.rowsV, this.vectorsGrid.nrows, this.vectorsGrid.ncols);
        } catch(error) {
            console.error(error);
            if (this.vectorsLayer) {
                this.vectorsLayer.remove();
                this.vectorsLayer = null;
            }
            throw error;
        }
    }

    async drawBarbs() {
        try {
            if (!this.barbsLayer) {
                let opts = {
                    zIndex:(this.getOrder() >= 0)?206 + 10 *this.getOrder():-1,
                    opacity: this.getOpacity(),
                    pixelsRatio: 1 // forzar a 1 para ver lineas más gruesas (Limitación de WebGL de ancho = 1)                     
                }                    
                if (this.config.barbs.color) opts.color = this.config.barbs.color;
                if (this.config.barbs.transformMagnitude) {
                    try {
                        opts.transformMagnitude = eval("(" + this.config.barbs.transformMagnitude + ")");
                        if (typeof(opts.transformMagnitude) != "function") throw "Barbs transformMagnitude no es una funcion [" + typeof(opts.transformMagnitude + "]")
                    } catch (error) {
                        console.error(error);
                        opts.transformMagnitude = null;
                    }
                }
                if (this.barbsInterpolate) opts.interpolate = {nRows: this.barbsInterpolateRows, nCols: this.barbsInterpolateCols}
                
                this.barbsLayer = new L.BarbsOverlay(opts);
                this.barbsLayer.addTo(window.g4.mapController.map);
            } 
            if (!this.vectorsGrid) await this.getFileVectorsGrid(); 
            this.barbsLayer.setVectorsGridData(this.vectorsGrid.foundBox, this.vectorsGrid.rowsU, this.vectorsGrid.rowsV, this.vectorsGrid.nrows, this.vectorsGrid.ncols);
        } catch(error) {
            console.error(error);
            if (this.barbsLayer) {
                this.barbsLayer.remove();
                this.barbsLayer = null;
            }
            throw error;
        }
    }
    
    async drawIsobands() {
        try {
            if (!this.isobandsGeoJson) await this.getFileIsobandsGeoJson();
            if (!this.isobandsColorScale) {
                if (!this.config.isobands.colorScale) throw "No hay 'colorScale' para la capa-isobandas";
                this.isobandsColorScale = window.g4.createColorScale(this.config.geoserver, this.config.isobands.colorScale.name, this.config.isobands.colorScale);
            }
            this.isobandsColorScale.setRange(this.isobandsGeoJson.min, this.isobandsGeoJson.max);
            if (!this.isobandsLayer) {
                this.isobandsLayer = new L.GeoJsonOverlay({
                    polygonColor: feature => {
                        if (feature.geometry.properties) return this.isobandsColorScale.getColorObject((feature.geometry.properties.minValue + feature.geometry.properties.maxValue) / 2);
                        return [255,0,0,0.5]
                    },
                    zIndex:(this.getOrder() >= 0)?201 + 10 *this.getOrder():-1,
                    opacity: this.getOpacity()
                })
                this.isobandsLayer.addTo(window.g4.mapController.map);
            }
            this.isobandsLayer.setGeoJson(this.isobandsGeoJson.geoJson);
        } catch (error) {
            console.error(error);
            if (this.isobandsLayer) {
                this.isobandsLayer.remove();
                this.isobandsLayer = null;
            }
            throw error;
        }
    }

    async drawIsolines() {
        try {
            if (!this.isolinesLayer) {                
                this.isolinesLayer = new L.GeoJsonOverlay({
                    lineColor: feature => {                        
                        return this.config.isolines.color;
                    },
                    smoothLines: this.config.isolines.smoothLines?true:false,
                    zIndex:(this.getOrder() >= 0)?202 + 10 *this.getOrder():-1,
                    opacity: this.getOpacity(),
                    pixelsRatio: 1 // forzar a 1 para ver lineas más gruesas (Limitación de WebGL de ancho = 1)
                })
                this.isolinesLayer.addTo(window.g4.mapController.map);
                this.isolinesMarkersLayer = new L.CanvasOverlay({
                    zIndex:(this.getOrder() >= 0)?203 + 10 *this.getOrder():-1,
                    drawCallback: (canvas, map) => this.drawIsolinesLabels(canvas, map)
                })
                this.isolinesMarkersLayer.addTo(window.g4.mapController.map);
            } 
            if (!this.isolinesGeoJson) await this.getFileIsolinesGeoJson();
            this.isolinesLayer.setGeoJson(this.isolinesGeoJson.geoJson);
            this.isolinesMarkersLayer.redraw();
        } catch (error) {
            console.error(error);
            if (this.isolinesLayer) {
                this.isolinesLayer.remove();
                this.isolinesLayer = null;
                this.isolinesMarkersLayer.remove();
                this.isolinesMarkersLayer = null;

            }
            throw error;
        }
    }

    drawIsolinesLabels(canvas, map) {
        if (!this.isolinesGeoJson) return;
        let canvasLayer = this.isolinesMarkersLayer;
        canvasLayer.setFont(10, "Arial");       
        canvasLayer.clear(); 
        let c = this.isolinesColor;
        while (c.length < 4) c.push(255);
        let [r,g,b,a] = c;
        let alpha = a/255;
        let luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        let textColor = luminance > 128?"rgba(0,0,0," + alpha + ")":"rgba(255,255,255," + alpha + ")";
        let fillColor = `rgba(${r},${g},${b},${alpha})`;
        let borderColor = textColor;
        let borderRadius = 10;
        for (let m of (this.isolinesGeoJson.markers || [])) {            
            let st = this.roundValue(m.value);
            canvasLayer.drawRoundedRectLabel(m.lat, m.lng, st, borderColor, fillColor, textColor, borderRadius);
        }
    }

    resetOrder() {
        if (this.shaderLayer) this.shaderLayer.setZIndex((this.getOrder() >= 0)?200 + 10 *this.getOrder():-1);        
        if (this.isobandsLayer) this.isobandsLayer.setZIndex((this.getOrder() >= 0)?201 + 10 *this.getOrder():-1);
        if (this.isolinesLayer) this.isolinesLayer.setZIndex((this.getOrder() >= 0)?202 + 10 *this.getOrder():-1);
        if (this.isolinesMarkersLayer) this.isolinesMarkersLayer.setZIndex((this.getOrder() >= 0)?203 + 10 *this.getOrder():-1);
        if (this.particlesLayer) this.particlesLayer.setZIndex((this.getOrder() >= 0)?204 + 10 *this.getOrder():-1);
        if (this.vectorsLayer) this.vectorsLayer.setZIndex((this.getOrder() >= 0)?205 + 10 *this.getOrder():-1);
        if (this.barbsLayer) this.barbsLayer.setZIndex((this.getOrder() >= 0)?206 + 10 *this.getOrder():-1);
    }
    setOpacity(o) {
        this._opacity = o;
        if (this.shaderLayer) this.shaderLayer.setOpacity(o);
        if (this.isobandsLayer) this.isobandsLayer.setOpacity(o);
        if (this.isolinesLayer) this.isolinesLayer.setOpacity(o);
        if (this.isolinesMarkersLayer) this.isolinesMarkersLayer.setOpacity(o);
        if (this.particlesLayer) this.particlesLayer.setOpacity(o);
        if (this.vectorsLayer) this.vectorsLayer.setOpacity(o);
        if (this.barbsLayer) this.barbsLayer.setOpacity(o);
    }

    cancel() {
        if (this.isolinesCurrentController) this.isolinesCurrentController.abort();
        if (this.isobandsCurrentController) this.isobandsCurrentController.abort();
        if (this.gridCurrentController) this.gridCurrentController.abort();
        if (this.particlesCurrentController) this.particlesCurrentController.abort();
        if (this.vectorsCurrentController) this.vectorsCurrentController.abort();
        if (this.barbsCurrentController) this.barbsCurrentController.abort();
    }

    // Útiles
    get unit() {
        return (this.variable && this.variable)?this.variable.unit:null;
    }

    // Seteo de propiedades    
    callRedraw() {
        if (this.redrawTimer) clearTimeout(this.redrawTimer);
        this.redrawTimer = setTimeout(async _ => {
            this.redrawTimer = null;
            await this.drawVisualizers();
        }, 100);
    }
    get geoserver() {return this.config.geoserver}

    // Shader
    get shaderActive() {return this.config.shader && this.config.shader.active}
    set shaderActive(a) {
        if (!this.config.shader) throw "Shader no soportado en capa";
        this.config.shader.active = a;
        this.callRedraw();
    }
    get shaderColorScaleDef() {return this.config.shader?this.config.shader.colorScale:null}
    set shaderColorScaleDef(scaleDef) {
        if (!this.config.shader) throw "Shader no soportado en capa";
        this.config.shader.colorScale.name = scaleDef.name;
        this.shaderColorScale = null;
        this.callRedraw();
    }
    get shaderColorScaleAuto() {return this.config.shader?this.config.shader.colorScale.auto:false}
    set shaderColorScaleAuto(auto) {
        if (!this.config.shader) throw "Shader no soportado en capa";
        this.config.shader.colorScale.auto = auto;
        this.shaderColorScale = null;
        this.callRedraw();
    }
    get shaderColorScaleMin() {return this.config.shader?this.config.shader.colorScale.min:0}
    set shaderColorScaleMin(min) {
        if (!this.config.shader) throw "Shader no soportado en capa";
        this.config.shader.colorScale.min = min;
        this.shaderColorScale = null;
        this.callRedraw();
    }
    get shaderColorScaleMax() {return this.config.shader?this.config.shader.colorScale.max:0}
    set shaderColorScaleMax(max) {
        if (!this.config.shader) throw "Shader no soportado en capa";
        this.config.shader.colorScale.max = max;
        this.shaderColorScale = null;
        this.callRedraw();
    }
    get shaderColorScaleClipOutOfRange() {return this.config.shader?this.config.shader.clipOutOfRange:false}
    set shaderColorScaleClipOutOfRange(clip) {
        if (!this.config.shader) throw "Shader no soportado en capa";
        this.config.shader.colorScale.clipOutOfRange = clip;
        this.shaderColorScale = null;
        this.callRedraw();
    }
    get shaderInterpolate() {return this.config.shader?this.config.shader.interpolate:false}
    get shaderInterpolateMinCols() {return (this.config.shader && this.config.shader.interpolate)?this.config.shader.interpolate.minCols:300}
    get shaderInterpolateMinRows() {return (this.config.shader && this.config.shader.interpolate)?this.config.shader.interpolate.minRows:300}
    setShaderInterpolation(minCols, minRows) {
        if (!this.config.shader) throw "Shader no soportado en capa";
        if (minCols === undefined || minRows === undefined) {
            delete this.config.shader.interpolate;    
        } else {
            this.config.shader.interpolate = {minCols, minRows};
        }
        if (this.shaderLayer) {
            this.shaderLayer.remove();
            this.shaderLayer = null;
        }
        this.shaderColorScale = null;
        this.callRedraw();
    }

    // Isolines
    get isolinesActive() {return this.config.isolines && this.config.isolines.active}
    set isolinesActive(a) {
        if (!this.config.isolines) throw "Isolines no soportado en capa";
        this.config.isolines.active = a;
        this.callRedraw();
    }
    get isolinesColor() {return this.config.isolines?this.config.isolines.color:[0,0,0,255]}
    set isolinesColor(color) {
        if (!this.config.isolines) throw "Isolines no soportado en capa";
        this.config.isolines.color = color;
        this.callRedraw();
    }
    get isolinesSmooth() {return this.config.isolines?this.config.isolines.smoothLines:false}
    set isolinesSmooth(s) {
        if (!this.config.isolines) throw "Isolines no soportado en capa";
        this.config.isolines.smoothLines = s;
        if (this.isolinesLayer) {
            this.isolinesLayer.remove();
            this.isolinesLayer = null;
            this.isolinesMarkersLayer.remove();
            this.isolinesMarkersLayer = null;
        }
        this.callRedraw();
    }
    get isolinesFixedLevels() {return this.config.isolines?this.config.isolines.fixedLevels:null}
    set isolinesFixedLevels(fl) {
        if (!this.config.isolines) throw "Isolines no soportado en capa";
        this.config.isolines.fixedLevels = fl;
        this.config.isolines.increment = null;
        this.refresh();
    }
    get isolinesIncrement() {return this.config.isolines?this.config.isolines.increment:null}
    set isolinesIncrement(i) {
        if (!this.config.isolines) throw "Isolines no soportado en capa";
        this.config.isolines.fixedLevels = null;
        this.config.isolines.increment = i;
        this.refresh();
    }
    get isolinesCalculatedIncrement() {
        return this.isolinesGeoJson?this.isolinesGeoJson.increment:null;
    }

    // Isobands
    get isobandsActive() {return this.config.isobands && this.config.isobands.active}
    set isobandsActive(a) {
        if (!this.config.isobands) throw "Isobands no soportado en capa";
        this.config.isobands.active = a;
        this.callRedraw();
    }
    get isobandsIncrement() {return this.config.isobands?this.config.isobands.increment:null}
    set isobandsIncrement(i) {
        if (!this.config.isobands) throw "Isobands no soportado en capa";
        this.config.isobands.increment = i;
        this.refresh();
    }
    get isobandsCalculatedIncrement() {
        return this.isobandsGeoJson?this.isobandsGeoJson.increment:null;
    }
    get isobandsColorScaleDef() {return this.config.isobands?this.config.isobands.colorScale:null}
    set isobandsColorScaleDef(scaleDef) {
        if (!this.config.isobands) throw "Isobandas no soportado en capa";
        this.config.isobands.colorScale.name = scaleDef.name;
        this.isobandsColorScale = null;
        this.callRedraw();
    }
    get isobandsColorScaleAuto() {return this.config.isobands?this.config.isobands.colorScale.auto:false}
    set isobandsColorScaleAuto(auto) {
        if (!this.config.isobands) throw "Isobands no soportado en capa";
        this.config.isobands.colorScale.auto = auto;
        this.isobandsColorScale = null;
        this.callRedraw();
    }
    get isobandsColorScaleMin() {return this.config.isobands?this.config.isobands.colorScale.min:0}
    set isobandsColorScaleMin(min) {
        if (!this.config.isobands) throw "Isobandas no soportado en capa";
        this.config.isobands.colorScale.min = min;
        this.isobandsColorScale = null;
        this.callRedraw();
    }
    get isobandsColorScaleMax() {return this.config.isobands?this.config.isobands.colorScale.max:0}
    set isobandsColorScaleMax(max) {
        if (!this.config.isobands) throw "Isobandas no soportado en capa";
        this.config.isobands.colorScale.max = max;
        this.isobandsColorScale = null;
        this.callRedraw();
    }
    get isobandsColorScaleClipOutOfRange() {return this.config.isobands?this.config.isobands.clipOutOfRange:false}
    set isobandsColorScaleClipOutOfRange(clip) {
        if (!this.config.isobands) throw "Isobandas no soportado en capa";
        this.config.isobands.colorScale.clipOutOfRange = clip;
        this.isobandsColorScale = null;
        this.callRedraw();
    }

    // Particles
    get particlesActive() {return this.config.particles && this.config.particles.active}
    set particlesActive(a) {
        if (!this.config.particles) throw "Partículas no soportado en capa";
        this.config.particles.active = a;
        this.callRedraw();
    }
    get particlesColor() {return this.config.particles?this.config.particles.color:[0,0,0,255]}
    set particlesColor(color) {
        if (!this.config.particles) throw "Partículas no soportado en capa";
        this.config.particles.color = color;
        if (this.particlesLayer) this.particlesLayer.remove();
        this.particlesLayer = null;
        this.callRedraw();
    }
    get particlesParticles() {return this.config.particles?this.config.particles.particles:800}
    set particlesParticles(n) {
        if (!this.config.particles) throw "Partículas no soportado en capa";
        this.config.particles.particles = n;
        if (this.particlesLayer) this.particlesLayer.remove();
        this.particlesLayer = null;
        this.callRedraw();
    }
    get particlesWidth() {return this.config.particles?this.config.particles.width:1}
    set particlesWidth(w) {
        if (!this.config.particles) throw "Partículas no soportado en capa";
        this.config.particles.width = w;
        if (this.particlesLayer) this.particlesLayer.remove();
        this.particlesLayer = null;
        this.callRedraw();
    }
    get particlesFade() {return this.config.particles?this.config.particles.fade:0.96}
    set particlesFade(f) {
        if (!this.config.particles) throw "Partículas no soportado en capa";
        this.config.particles.fade = f;
        if (this.particlesLayer) this.particlesLayer.remove();
        this.particlesLayer = null;
        this.callRedraw();
    }
    get particlesVelocityScale() {return this.config.particles?this.config.particles.velocityScale:0.002}
    set particlesVelocityScale(v) {
        if (!this.config.particles) throw "Partículas no soportado en capa";
        this.config.particles.velocityScale = v;
        if (this.particlesLayer) this.particlesLayer.remove();
        this.particlesLayer = null;
        this.callRedraw();
    }
    get particlesDuration() {return this.config.particles?this.config.particles.duration:20}
    set particlesDuration(d) {
        if (!this.config.particles) throw "Partículas no soportado en capa";
        this.config.particles.duration = d;
        if (this.particlesLayer) this.particlesLayer.remove();
        this.particlesLayer = null;
        this.callRedraw();
    }
 
    // Vectors
    get vectorsActive() {return this.config.vectors && this.config.vectors.active}
    set vectorsActive(a) {
        if (!this.config.vectors) throw "Vectores no soportado en capa";
        this.config.vectors.active = a;
        this.callRedraw();
    }
    get vectorsColor() {return this.config.vectors?this.config.vectors.color:[0,0,200,255]}
    set vectorsColor(color) {
        if (!this.config.vectors) throw "Vectores no soportado en capa";
        this.config.vectors.color = color;
        if (this.vectorsLayer) this.vectorsLayer.remove();
        this.vectorsLayer = null;
        this.callRedraw();
    }
    get vectorsInterpolate() {return this.config.vectors?this.config.vectors.interpolate:null}
    get vectorsInterpolateCols() {return (this.config.vectors && this.config.vectors.interpolate)?this.config.vectors.interpolate.cols:20}
    get vectorsInterpolateRows() {return (this.config.vectors && this.config.vectors.interpolate)?this.config.vectors.interpolate.rows:15}
    setVectorsInterpolation(cols, rows) {
        if (!this.config.vectors) throw "Vectors no soportado en capa";
        if (cols === undefined || rows === undefined) {
            delete this.config.vectors.interpolate;    
        } else {
            this.config.vectors.interpolate = {cols, rows};
        }
        if (this.vectorsLayer) {
            this.vectorsLayer.remove();
            this.vectorsLayer = null;
        }
        this.callRedraw();
    }

    // Barbs
    get barbsActive() {return this.config.barbs && this.config.barbs.active}
    set barbsActive(a) {
        if (!this.config.barbs) throw "Barbas no soportado en capa";
        this.config.barbs.active = a;
        this.callRedraw();
    }
    get barbsColor() {return this.config.barbs?this.config.barbs.color:[0,0,0,255]}
    set barbsColor(color) {
        if (!this.config.barbs) throw "Barbas no soportado en capa";
        this.config.barbs.color = color;
        if (this.barbsLayer) this.barbsLayer.remove();
        this.barbsLayer = null;
        this.callRedraw();
    }
    get barbsInterpolate() {return this.config.barbs?this.config.barbs.interpolate:null}
    get barbsInterpolateCols() {return (this.config.barbs && this.config.barbs.interpolate)?this.config.barbs.interpolate.cols:20}
    get barbsInterpolateRows() {return (this.config.barbs && this.config.barbs.interpolate)?this.config.barbs.interpolate.rows:15}
    setBarbsInterpolation(cols, rows) {
        if (!this.config.vectors) throw "Barbas no soportado en capa";
        if (cols === undefined || rows === undefined) {
            delete this.config.barbs.interpolate;    
        } else {
            this.config.barbs.interpolate = {cols, rows};
        }
        if (this.barbsLayer) {
            this.barbsLayer.remove();
            this.barbsLayer = null;
        }
        this.callRedraw();
    }
}