
class G4GeoJsonLayer extends G4Layer {
    get type() {return "geojson"}
    get subType() {return this.config.subType || "polygons"}
    get dependsOnTime() {return this.config.dependsOnTime?true:false;}
    get metadataURL() {
        let url = this.config.url + "/metadata";
        if (this.dependsOnTime) url += "?time=" + window.g4.time.valueOf()
        return url;
    }
    get geoJsonURL() {
        let url = this.config.url + "/geoJson";
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
            this.metadata = await this.getFile(this.metadataURL)
        } catch(error) {
            console.error(error);
        }
    }

    async refresh() {
        try {
            // Leer geoJson y actualizar capa
            this.geoJson = await this.getFile(this.geoJsonURL);
            if (this.subType == "polygons") {
                // Transformar MultiPolygon a varios Polygon
                let newFeatures = [];                                
                for (let feature of this.geoJson.geoJson.features) {
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
                this.geoJson.geoJson.features = newFeatures;
                
                if (!this.shapesLayer) {
                    this.shapesLayer = L.glify.latitudeFirst().shapes({
                        map: window.g4.mapController.map,
                        data: this.geoJson.geoJson,
                        color: this.config.color,
                        border: this.config.border,
                        borderOpacity: this.config.borderOpacity
                    })
                } else {
                    this.shapesLayer.setData(this.geoJson.geoJson);
                }
            }
        } catch(error) {            
            console.error("Refresh error", error);            
        }
    }

    cancel() {
        if (this.currentController) this.currentController.abort();
    }
}