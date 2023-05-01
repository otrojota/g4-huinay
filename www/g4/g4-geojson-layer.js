
class G4GeoJsonLayer extends G4Layer {
    get type() {return "geojson"}
    get subType() {return this.config.subType || "polygons"}
    get dependsOnTime() {return this.config.dependsOnTime?true:false;}
    get metadataURL() {
        let url = window.g4.getGeoserverURL(this.config.geoserver) + "/" + this.config.url + "/metadata";
        if (this.dependsOnTime) url += "?time=" + window.g4.time.valueOf()
        return url;
    }
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
            // Leer jsonMetadata
            if (this.config.opacity) this._opacity = this.config.opacity;
            this.metadata = await this.getFile(this.metadataURL)            
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

    async refresh() {
        try {
            // Leer geoJson y actualizar capa
            this.geoJson = await this.getFile(this.geoJsonURL);
            
            if (!this.geoJsonLayer) {
                this.geoJsonLayer = new L.GeoJsonOverlay({
                    polygonBorderColor: feature => (this.getPolygonBorderColor(feature)),
                    polygonColor: feature => (this.getPolygonColor(feature)),
                    zIndex:(this.getOrder() >= 0)?200 + 10 *this.getOrder():-1,
                    opacity: this.getOpacity(),
                    pixelsRatio: 1 // forzar a 1 para ver lineas más gruesas (Limitación de WebGL de ancho = 1)
                });
                this.geoJsonLayer.addTo(window.g4.mapController.map);
            }
            this.geoJsonLayer.setGeoJson(this.geoJson.geoJson);
        } catch(error) {            
            console.error("Refresh error", error);            
        }
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
    mapClick(e) {
        console.log("e", e);
        if (this.geoJsonLayer) {
            let polygon = this.geoJsonLayer.findPolygon(e.latlng.lat, e.latlng.lng);
            console.log("polygon", polygon);
        }
    }
}