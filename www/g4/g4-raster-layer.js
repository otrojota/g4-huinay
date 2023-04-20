
class G4RasterLayer extends G4Layer {
    get type() {return "raster"}
    get dependsOnTime() {return this.config.dependsOnTime?true:false;}
    get geoserverURL() {return this.config.geoserverURL}
    get dataSetCode() {return this.config.dataSet};
    get variableCode() {return this.config.variable};
    get isolinesURL() {
        let b = window.g4.mapController.getCurrentBounds(0.25);
        let url = `${this.geoserverURL}/${this.dataSetCode}/${this.variableCode}/isolines?n=${b.n}&s=${b.s}&e=${b.e}&w=${b.w}`;
        if (this.dependsOnTime) url += "&time=" + window.g4.time.valueOf();
        return url;
    }
    get isobandsURL() {
        let b = window.g4.mapController.getCurrentBounds(0.25);
        let url = `${this.geoserverURL}/${this.dataSetCode}/${this.variableCode}/isobands?n=${b.n}&s=${b.s}&e=${b.e}&w=${b.w}`;
        if (this.dependsOnTime) url += "&time=" + window.g4.time.valueOf();
        return url;
    }
    get gridURL() {
        let b = window.g4.mapController.getCurrentBounds(0.25);
        let url = `${this.geoserverURL}/${this.dataSetCode}/${this.variableCode}/grid?n=${b.n}&s=${b.s}&e=${b.e}&w=${b.w}`;
        if (this.dependsOnTime) url += "&time=" + window.g4.time.valueOf();
        return url;
    }
    get vectorsGridURL() {
        let b = window.g4.mapController.getCurrentBounds(0.25);
        let url = `${this.geoserverURL}/${this.dataSetCode}/${this.variableCode}/vectorsGrid?n=${b.n}&s=${b.s}&e=${b.e}&w=${b.w}`;
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
            let {dataSet, variable} = await window.g4.getGeoserverVariableMetadata(this.geoserverURL, this.dataSetCode, this.variableCode);
            this.dataSet = dataSet;
            this.variable = variable;
            if (this.config.opacity) this._opacity = this.config.opacity;
            if (this.dependsOnTime) window.g4.on("time-change", this.timeChangeListener);
        } catch(error) {
            console.error(error);
        }
    }

    async refresh() {
        try {
            this.cancel();
            let drawPromises = [];
            if (this.config.shader && this.config.shader.active) {
                drawPromises.push(this.drawShader());
            }
            if (this.config.particles && this.config.particles.active) {
                drawPromises.push(this.drawParticles());
            }
            if (this.config.vectors && this.config.vectors.active) {
                drawPromises.push(this.drawVectors());
            }            
            if (this.config.isobands && this.config.isobands.active) {
                drawPromises.push(this.drawIsobands());
            }            
            if (this.config.isolines && this.config.isolines.active) {
                drawPromises.push(this.drawIsolines());
            }   
            //await Promise.all(drawPromises);
            Promise.all(drawPromises);
        } catch(error) {
            console.error(error);
        }
    }

    async drawShader() {
        try {
            // Leer grid y actualizar capa
            this.gridCurrentController = new AbortController();
            try {
                this.grid = await this.getFile(this.gridURL, this.gridCurrentController);
                if (!this.shaderColorScale) {
                    if (!this.config.shader.colorScale) throw "No hay 'colorScale' para la capa-shader";
                    this.shaderColorScale = window.g4.createColorScale(this.geoserverURL, this.config.shader.colorScale.name, this.config.shader.colorScale);
                }
                this.shaderColorScale.setRange(this.grid.min, this.grid.max);
                if (!this.shaderLayer) {
                    this.shaderLayer = new L.ShaderOverlay({
                        getColor: (v, lat, lng) => {
                            return this.shaderColorScale.getColorObject(v);
                        },
                        zIndex:(this.getOrder() >= 0)?200 + 10 *this.getOrder():-1,
                        opacity: this.getOpacity()
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
                return;
            } finally {
                this.gridCurrentController = null;
            }
        } catch (error) {
            throw error;
        }
    }
    async drawParticles() {
        try {
            // Leer grid y actualizar capa
            this.particlesCurrentController = new AbortController();
            try {
                this.vectorsGrid = await this.getFile(this.vectorsGridURL, this.particlesCurrentController);
                if (!this.particlesLayer) {
                    let opts = {
                        zIndex:(this.getOrder() >= 0)?203 + 10 *this.getOrder():-1,
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
                this.particlesLayer.setVectorsGridData(this.vectorsGrid.foundBox, this.vectorsGrid.rowsU, this.vectorsGrid.rowsV, this.vectorsGrid.nrows, this.vectorsGrid.ncols);
            } catch(error) {
                console.error(error);
                if (this.particlesLayer) {
                    this.particlesLayer.remove();
                    this.particlesLayer = null;
                }
                return;
            } finally {
                this.particlesCurrentController = null;
            }
        } catch (error) {
            throw error;
        }
    }
    async drawVectors() {
        try {
            // Leer grid y actualizar capa
            this.vectorsCurrentController = new AbortController();
            try {
                this.vectorsGrid = await this.getFile(this.vectorsGridURL, this.vectorsCurrentController);
                if (!this.vectorsLayer) {
                    let opts = {
                        zIndex:(this.getOrder() >= 0)?204 + 10 *this.getOrder():-1,
                        opacity: this.getOpacity()                        
                    }                    
                    if (this.config.vectors.color) opts.color = this.config.vectors.color;
                    
                    this.vectorsLayer = new L.VectorsOverlay(opts);
                    this.vectorsLayer.addTo(window.g4.mapController.map);
                }    
                this.vectorsLayer.setVectorsGridData(this.vectorsGrid.foundBox, this.vectorsGrid.rowsU, this.vectorsGrid.rowsV, this.vectorsGrid.nrows, this.vectorsGrid.ncols);
            } catch(error) {
                console.error(error);
                if (this.vectorsLayer) {
                    this.vectorsLayer.remove();
                    this.vectorsLayer = null;
                }
                return;
            } finally {
                this.vectorsCurrentController = null;
            }
        } catch (error) {
            throw error;
        }
    }
    async drawIsobands() {
        try {
            // Leer geoJson y actualizar capa
            this.isobandsCurrentController = new AbortController();
            try {
                this.isobandsGeoJson = await this.getFile(this.isobandsURL, this.isobandsCurrentController);
            } catch(error) {
                if (this.isobandsLayer) {
                    this.isobandsLayer.remove();
                    this.isobandsLayer = null;
                }
                return;
            } finally {
                this.isobandsCurrentController = null;
            }
            if (!this.isobandsColorScale) {
                if (!this.config.isobands.colorScale) throw "No hay 'colorScale' para la capa-isobandas";
                this.isobandsColorScale = window.g4.createColorScale(this.geoserverURL, this.config.isobands.colorScale.name, this.config.isobands.colorScale);
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
            throw error;
        }
    }

    async drawIsolines() {
        try {
            // Leer geoJson y actualizar capa
            this.isolinesCurrentController = new AbortController();
            try {
                this.isolinesGeoJson = await this.getFile(this.isolinesURL, this.isolinesCurrentController);
            } catch(error) {
                if (this.isolinesLayer) {
                    this.isolinesLayer.remove();
                    this.isolinesLayer = null;
                }
                return;
            } finally {
                this.isolinesCurrentController = null;
            }
            if (!this.isolinesLayer) {                
                this.isolinesLayer = new L.GeoJsonOverlay({
                    lineColor: feature => {                        
                        return this.config.isolines.color;
                    },
                    smoothLines: true,
                    zIndex:(this.getOrder() >= 0)?202 + 10 *this.getOrder():-1,
                    opacity: this.getOpacity()
                })
                this.isolinesLayer.addTo(window.g4.mapController.map);
            } 
            this.isolinesLayer.setGeoJson(this.isolinesGeoJson.geoJson);
        } catch (error) {
            throw error;
        }
    }

    resetOrder() {
        if (this.shaderLayer) this.shaderLayer.setZIndex((this.getOrder() >= 0)?200 + 10 *this.getOrder():-1);        
        if (this.isobandsLayer) this.isobandsLayer.setZIndex((this.getOrder() >= 0)?201 + 10 *this.getOrder():-1);
        if (this.isolinesLayer) this.isolinesLayer.setZIndex((this.getOrder() >= 0)?202 + 10 *this.getOrder():-1);
        if (this.particlesLayer) this.particlesLayer.setZIndex((this.getOrder() >= 0)?203 + 10 *this.getOrder():-1);
        if (this.vectorsLayer) this.vectorsLayer.setZIndex((this.getOrder() >= 0)?204 + 10 *this.getOrder():-1);
    }
    setOpacity(o) {
        this._opacity = o;
        if (this.shaderLayer) this.shaderLayer.setOpacity(o);
        if (this.isobandsLayer) this.isobandsLayer.setOpacity(o);
        if (this.isolinesLayer) this.isolinesLayer.setOpacity(o);
        if (this.particlesLayer) this.particlesLayer.setOpacity(o);
        if (this.vectorsLayer) this.vectorsLayer.setOpacity(o);
    }

    cancel() {
        if (this.isolinesCurrentController) this.isolinesCurrentController.abort();
        if (this.isobandsCurrentController) this.isobandsCurrentController.abort();
        if (this.gridCurrentController) this.gridCurrentController.abort();
        if (this.particlesCurrentController) this.particlesCurrentController.abort();
        if (this.vectorsCurrentController) this.vectorsCurrentController.abort();
    }
}