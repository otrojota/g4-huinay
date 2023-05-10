
class G4GeoJsonLayer extends G4Layer {
    get type() {return "geojson"}
    get subType() {return this.config.subType || "polygons"}
    get dependsOnTime() {return this.config.dependsOnTime?true:false;}
    /*
    get metadataURL() {
        let url = window.g4.getGeoserverURL(this.config.geoserver) + "/" + this.config.url + "/metadata";
        if (this.dependsOnTime) url += "?time=" + window.g4.time.valueOf()
        return url;
    }
    */
    get geoJsonURL() {
        let url = window.g4.getGeoserverURL(this.config.geoserver) + "/" + this.config.url + "/geoJson";
        if (this.dependsOnTime) url += "?time=" + window.g4.time.valueOf()
        return url;
    }

    constructor(name, config) {
        super(null, name);
        this.config = config;        
    }

    getFile(url) {
        return new Promise((resolve, reject) => {
            this.currentController = new AbortController();
            this._getJSON(url, this.currentController.signal)
                .then(json => {
                    this.currentController = null;
                    resolve(json)
                })
                .catch(error => {
                    this.currentController = null;
                    reject(error);
                });
        })
    }
    async g4init() {
        try {
            super.g4init();
            if (this.config.opacity) this._opacity = this.config.opacity;
            //this.metadata = await this.getFile(this.metadataURL)            
        } catch(error) {
            console.error(error);
        }
    }
    async g4destroy() {
        if (this.geoJsonLayer) {
            this.geoJsonLayer.remove();
            this.geoJsonLayer = null;
        }
    }

    getPolygonBorderColor(feature) {
        if (this.polygonsBorderColor === undefined) {
            if (this.config.polygonsBorderColor === undefined) {
                this.polygonsBorderColor = null;
            } else if (Array.isArray(this.config.polygonsBorderColor)) {
                this.polygonsBorderColor = this.config.polygonsBorderColor;
            } else if (typeof(this.config.polygonsBorderColor) == "string") {
                try {                    
                    this.polygonsBorderColor = eval("(" + this.config.polygonsBorderColor + ")");
                    if (typeof(this.polygonsBorderColor) != "function") throw "polygons border color no es una funcion"
                } catch(error) {                    
                    console.error(error);
                    this.polygonsBorderColor = [255, 0, 0];
                }
            } else {
                console.error("Tipo inesperado de polygonsBorderColor");
                this.polygonsBorderColor = [255, 0, 0];
            }            
        }
        if (this.polygonsBorderColor === null) return null;
        let color;
        if (Array.isArray(this.polygonsBorderColor)) color = this.polygonsBorderColor;
        else color = this.polygonsBorderColor(feature);
        return color;
    }
    getPolygonColor(feature) {
        if (this.polygonsColor === undefined) {
            if (this.config.polygonsColor === undefined) {
                this.polygonsColor = null;
            } else if (Array.isArray(this.config.polygonsColor)) {
                this.polygonsColor = this.config.polygonsColor;
            } else if (typeof(this.config.polygonsColor) == "string") {
                try {                    
                    this.polygonsColor = eval("(" + this.config.polygonsColor + ")");
                    if (typeof(this.polygonsColor) != "function") throw "polygons color no es una funcion"
                } catch(error) {                    
                    console.error(error);
                    this.polygonsColor = [255, 0, 0];
                }
            } else {
                console.error("Tipo inesperado de polygonsColor");
                this.polygonsColor = [255, 0, 0];
            }            
        }
        if (this.polygonsColor === null) return null;
        let color;
        if (Array.isArray(this.polygonsColor)) color = this.polygonsColor;
        else color = this.polygonsColor(feature);
        return color;
    }
    getLineColor(feature) {
        if (this.linesColor === undefined) {
            if (this.config.linesColor === undefined) {
                this.linesColor = null;
            } else if (Array.isArray(this.config.linesColor)) {
                this.linesColor = this.config.linesColor;
            } else if (typeof(this.config.linesColor) == "string") {
                try {                    
                    this.linesColor = eval("(" + this.config.linesColor + ")");
                    if (typeof(this.linesColor) != "function") throw "lines color no es una funcion"
                } catch(error) {                    
                    console.error(error);
                    this.linesColor = [255, 0, 0];
                }
            } else {
                console.error("Tipo inesperado de linesColor");
                this.linesColor = [255, 0, 0];
            }            
        }
        if (this.linesColor === null) return null;
        let color;
        if (Array.isArray(this.linesColor)) color = this.linesColor;
        else color = this.linesColor(feature);
        return color;
    }

    async refresh() {
        try {
            // Leer geoJson y actualizar capa
            this.geoJson = await this.getFile(this.geoJsonURL);
            this.redraw();
        } catch(error) {            
            console.error("Refresh error", error);            
        }
    }
    redraw() {
        if (!this.geoJsonLayer) {
            this.geoJsonLayer = new L.GeoJsonOverlay({
                polygonBorderColor: feature => (this.getPolygonBorderColor(feature)),
                polygonColor: feature => (this.getPolygonColor(feature)),
                lineColor: feature => (this.getLineColor(feature)),
                zIndex:(this.getOrder() >= 0)?200 + 10 *this.getOrder():-1,
                opacity: this.getOpacity(),
                pixelsRatio: 1 // forzar a 1 para ver lineas más gruesas (Limitación de WebGL de ancho = 1)
            });
            this.geoJsonLayer.addTo(window.g4.mapController.map);
        }
        this.geoJsonLayer.setGeoJson(this.geoJson.geoJson);
    }
    resetOrder() {
        if (this.geoJsonLayer) this.geoJsonLayer.setZIndex((this.getOrder() >= 0)?200 + 10 *this.getOrder():-1);
    }
    setOpacity(o) {
        this._opacity = o;
        if (this.geoJsonLayer) this.geoJsonLayer.setOpacity(o);
    }
    cancel() {
        if (this.currentController) this.currentController.abort();
    }
    elementAtPoint(lat, lng) {
        let polygon = null, line = null;
        if (this.geoJsonLayer) {
            line = this.geoJsonLayer.findLine(lat, lng);            
            if (line) {
                return {layer:this, type:"feature", subtype:"line", feature:line}
            }
            polygon = this.geoJsonLayer.findPolygon(lat, lng);            
            if (polygon) {
                return {layer:this, type:"feature", subtype:"polygon", feature:polygon}
            }
        }        
        // TODO: Buscar Puntos
        
        return null;
    }

    // Seteo de propiedades    
    callRedraw() {
        if (this.redrawTimer) clearTimeout(this.redrawTimer);
        this.redrawTimer = setTimeout(async _ => {
            this.redrawTimer = null;
            await this.redraw();
        }, 100);
    }
    
    // Polygons
    get polygonsColorProp() {return this.config.polygonsColor}
    set polygonsColorProp(c) {
        this.polygonsColor = undefined;
        this.config.polygonsColor = c;
        this.callRedraw();
    }
    get polygonsBorderProp() {return this.config.polygonsBorderColor}
    set polygonsBorderProp(c) {
        this.polygonsBorderColor = undefined;
        this.config.polygonsBorderColor = c;
        this.callRedraw();
    }
    // Lineas
    get linesColorProp() {return this.config.linesColor}
    set linesColorProp(c) {
        this.linesColor = undefined;
        this.config.linesColor = c;
        this.callRedraw();
    }
}