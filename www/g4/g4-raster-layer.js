
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
            let {dataSet, variable} = await window.g4.getGeoserverVariableMetadata(this.geoserverURL, this.dataSetCode, this.variableCode);
            this.dataSet = dataSet;
            this.variable = variable;
            if (this.config.opacity) this._opacity = this.config.opacity;
            if (this.dependsOnTime) window.g4.on("time-change", this.timeChangeListener);
        } catch(error) {
            console.error(error);
        }
    }

    _inperpolatedPoint(lat, lng, box, rows, nCols, nRows) {
        // https://en.wikipedia.org/wiki/Bilinear_interpolation                    
        if (lat <= box.lat0 || lat >= box.lat1 || lng <= box.lng0 || lng >= box.lng1) return null;
        let i = parseInt((lng - box.lng0) / box.dLng);
        let j = parseInt((lat - box.lat0) / box.dLat);
        if (i >= (nCols - 1) || j >= (nRows - 1)) return null;
        let x0 = box.lng0 + box.dLng*i;
        let x = (lng - x0) / box.dLng;
        let y0 = box.lat0 + box.dLat*j;
        let y = (lat - y0) / box.dLat;
        let rx = 1 - x, ry = 1 - y;

        let z00 = rows[j][i], z10 = rows[j][i+1], z01 = rows[j+1][i], z11 = rows[j+1][i+1];
        if (z00 == null || z10 == null || z01 == null || z11 == null) return null;
        return z00*rx*ry + z10*x*ry + z01*rx*y + z11*x*y;
    }

    async refresh() {
        try {
            this.cancel();
            // Obtener los datos (para no repetir, algunos visualizadores usan los mismos)
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

            // Dibujado
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
            if (this.config.barbs && this.config.barbs.active) {
                drawPromises.push(this.drawBarbs());
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
    

    async drawShader() {
        try {
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
            throw error;
        }
    }

    async drawVectors() {
        try {
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
            throw error;
        }
    }

    async drawBarbs() {
        try {
            if (!this.barbsLayer) {
                let opts = {
                    zIndex:(this.getOrder() >= 0)?205 + 10 *this.getOrder():-1,
                    opacity: this.getOpacity()                        
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
                
                this.barbsLayer = new L.BarbsOverlay(opts);
                this.barbsLayer.addTo(window.g4.mapController.map);
            }    
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
                    smoothLines: false,
                    zIndex:(this.getOrder() >= 0)?202 + 10 *this.getOrder():-1,
                    opacity: this.getOpacity()
                })
                this.isolinesLayer.addTo(window.g4.mapController.map);
            } 
            this.isolinesLayer.setGeoJson(this.isolinesGeoJson.geoJson);
        } catch (error) {
            console.error(error);
            if (this.isolinesLayer) {
                this.isolinesLayer.remove();
                this.isolinesLayer = null;
            }
            throw error;
        }
    }

    resetOrder() {
        if (this.shaderLayer) this.shaderLayer.setZIndex((this.getOrder() >= 0)?200 + 10 *this.getOrder():-1);        
        if (this.isobandsLayer) this.isobandsLayer.setZIndex((this.getOrder() >= 0)?201 + 10 *this.getOrder():-1);
        if (this.isolinesLayer) this.isolinesLayer.setZIndex((this.getOrder() >= 0)?202 + 10 *this.getOrder():-1);
        if (this.particlesLayer) this.particlesLayer.setZIndex((this.getOrder() >= 0)?203 + 10 *this.getOrder():-1);
        if (this.vectorsLayer) this.vectorsLayer.setZIndex((this.getOrder() >= 0)?204 + 10 *this.getOrder():-1);
        if (this.barbsLayer) this.barbsLayer.setZIndex((this.getOrder() >= 0)?205 + 10 *this.getOrder():-1);
    }
    setOpacity(o) {
        this._opacity = o;
        if (this.shaderLayer) this.shaderLayer.setOpacity(o);
        if (this.isobandsLayer) this.isobandsLayer.setOpacity(o);
        if (this.isolinesLayer) this.isolinesLayer.setOpacity(o);
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
}