
class G4StationsLayer extends G4Layer {
    get type() {return "stations"}
    get dependsOnTime() {return true}
    get geoJsonURL() {
        let url = window.g4.getGeoserverURL(this.config.geoserver) + "/" + this.config.url + "/geoJson";
        if (this.dependsOnTime) url += "?time=" + window.g4.time.valueOf()
        return url;
    }

    constructor(name, config) {
        super(null, name);
        config = config || {};
        if (!config.stationsBorderColor) config.stationsBorderColor = [0,0,0,255]
        if (!config.stationsColor) config.stationsColor = [0,0,255,255]
        this.config = config;
        this.stations = []; 
    }

    async g4init() {
        try {
            super.g4init();
        } catch(error) {
            console.error(error);
        }
    }
    async g4destroy() {
        if (this.stationsLayer) {
            this.stationsLayer.remove();
            this.stationsLayer = null;
        }
    }

    async refresh() {
        try {
            this.redraw();
        } catch(error) {            
            console.error("Refresh error", error);            
        }
    }
    async redraw() {
        if (!this.stationsColor) {
            this.stationsColor = this.config.stationsColor || [0,0,255,255];
            while (this.stationsColor.length < 4) this.stationsColor.push(255);
        }
        if (!this.stationsBorderColor && this.config.stationsBorderColor) {
            this.stationsBorderColor = this.config.stationsBorderColor;
            while (this.stationsBorderColor.length < 4) this.stationsBorderColor.push(255);
        }
        if (!this.stationsLayer) {
            this.stationsLayer = new L.G4StationsOverlay({
                zIndex:(this.getOrder() >= 0)?200 + 10 *this.getOrder():-1,
                opacity: this.getOpacity(),
                getStations: _ => (this.stations),
                getStationStyle: s => {
                    return {
                        radius: 20,
                        borderColor:this.stationsBorderColor,
                        fillColor:this.stationsColor
                    }
                }
            });
            this.stationsLayer.addTo(window.g4.mapController.map);
        }
        this.stationsLayer.redraw();
    }
    resetOrder() {
        if (this.stationsLayer) this.stationsLayer.setZIndex((this.getOrder() >= 0)?200 + 10 *this.getOrder():-1);
    }
    setOpacity(o) {
        this._opacity = o;
        if (this.stationsLayer) this.stationsLayer.setOpacity(o);
    }
    cancel() {
        
    }
    elementAtPoint(lat, lng) {                
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
    // Colores estáticos
    get stationsColorProp() {return this.config.stationsColor}
    set stationsColorProp(c) {
        this.stationsColor = undefined;
        this.config.stationsColor = c;
        this.callRedraw();
    }
    get stationsBorderProp() {return this.config.stationsBorderColor}
    set stationsBorderProp(c) {
        this.stationsBorderColor = undefined;
        this.config.stationsBorderColor = c;
        this.callRedraw();
    }
    
    
    addStations(stations) {
        for (let s of stations) {
            let layer = window.g4.stationLayers.find(l => l.code == s.layerCode);
            let station = layer.stations.find(st => st.code == s.stationCode);
            station.group = layer; // Se le llama grupo a la definición ZRepo de la capa de estaciones para evitar confusones con esta capa y la leaflet
            if (!this.getStation(station.code)) {
                this.stations.push(station);
            }
        }
        this.callRedraw();
    }
    getStation(code) {
        return this.stations.find(s => s.code == code);
    }
}