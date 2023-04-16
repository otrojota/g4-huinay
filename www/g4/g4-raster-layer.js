
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
            if (this.dependsOnTime) window.g4.on("time-change", this.timeChangeListener);
        } catch(error) {
            console.error(error);
        }
    }

    async refresh() {
        try {
            let drawPromises = [];
            if (this.config.shader && this.config.shader.active) {
                drawPromises.push(this.drawShader());
            }            
            if (this.config.isobands && this.config.isobands.active) {
                drawPromises.push(this.drawIsobands());
            }            
            if (this.config.isolines && this.config.isolines.active) {
                drawPromises.push(this.drawIsolines());
            }   
            await Promise.all(drawPromises);
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
                console.log("grid", this.grid);
                if (!this.shaderColorScale) {
                    if (!this.config.shader.colorScale) throw "No hay 'colorScale' para la capa-shader";
                    this.shaderColorScale = window.g4.createColorScale(this.geoserverURL, this.config.shader.colorScale.name, this.config.shader.colorScale);
                }
                this.shaderColorScale.setRange(this.grid.min, this.grid.max);
                if (!this.shaderLayer) {
                    this.shaderLayer = new L.ShaderOverlay({
                        getPointValue:value => {
                            return 
                        }
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
    async drawIsobands() {
        try {
            // Leer geoJson y actualizar capa
            this.isobandsCurrentController = new AbortController();
            try {
                this.isobandsGeoJson = await this.getFile(this.isobandsURL, this.isobandsCurrentController);
                let newFeatures = [];                                
                for (let feature of this.isobandsGeoJson.geoJson.features) {
                    if (feature.geometry.type == "Polygon") {
                        newFeatures.push(feature);
                    } else if (feature.geometry.type == "MultiPolygon") {
                        for (let coord of feature.geometry.coordinates) {
                            newFeatures.push({geometry:{type:"Polygon", coordinates:coord, properties:feature.properties}})
                        }
                    } else {
                        console.error("Geometry Type '" + feature.geometry.type + "' Not Handled");
                    }
                }
                this.isobandsGeoJson.geoJson.features = newFeatures;
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
                this.isobandsLayer = L.glify.shapes({
                    map: window.g4.mapController.map,
                    data: this.isobandsGeoJson.geoJson,
                    color: (idx, feature) => {
                        if (feature.geometry.properties) return this.isobandsColorScale.getColorObject((feature.geometry.properties.minValue + feature.geometry.properties.maxValue) / 2);
                        return {r:1, g:0, b:0, a:0.5}
                    }
                })
            } else {
                this.isobandsLayer.setData(this.isobandsGeoJson.geoJson);
            }     
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
                this.isolinesLayer = L.glify.longitudeFirst().lines({
                    map: window.g4.mapController.map,
                    data: this.isolinesGeoJson.geoJson,
                    color: this.config.isolines.color,
                    weight: this.config.isolines.weight || 0.4
                })
            } else {
                this.isolinesLayer.setData(this.isolinesGeoJson.geoJson);
            } 
        } catch (error) {
            throw error;
        }
    }

    cancel() {
        if (this.isolinesCurrentController) this.isolinesCurrentController.abort();
        if (this.isobandsCurrentController) this.isobandsCurrentController.abort();
    }
}