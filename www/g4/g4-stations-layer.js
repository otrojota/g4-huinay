
class G4StationsLayer extends G4Layer {
    get type() {return "stations"}
    get dependsOnTime() {return this.config.variable?true:false}
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
        if (!config.colorScaleDef) config.colorScaleDef = {name:"zeu - NASA OceanColor", auto:true};
        if (config.showLabel === undefined) config.showLabel = true;
        this.config = config;
        this.stations = []; 
        this.cacheVariables = {}; // code:{...}
    }

    async g4init() {
        try {
            super.g4init();
            this.timeChangeListener = _ => this.refresh();
            window.g4.on("time-change", this.timeChangeListener);
        } catch(error) {
            console.error(error);
        }
    }
    async g4destroy() {
        if (this.stationsLayer) {
            this.stationsLayer.remove();
            this.stationsLayer = null;
        }
        window.g4.remove("time-change", this.timeChangeListener);
    }

    async refresh() {
        try {
            this.monitorValues = null;
            if (!this.config.variable) {
                this._incWorking();
                this.redraw();
                this._decWorking(); // status change
                return;
            }
            this._incWorking();
            // Una query zRepo por cada grupo (capa) original. Puede cambiar zRepoServer y campo estación
            let queries = {};
            for (let station of this.stations) {
                if (station.variables.find(v => v.code == this.config.variable)) {
                    let q = queries[station.group.code];
                    if (!q) {
                        q = {group: station.group, stationCodes:[]};
                        q.zrepoClient = await window.g4.getZRepoClient(station.group.config.zreposerver);
                    }
                    q.stationCodes.push(station.code);
                    queries[station.group.code] = q;
                }
            }
            // Construir promesas
            let variable = this.getVariable(this.config.variable);
            let groupCodes = Object.keys(queries);
            let promises = [];
            this.aborters = [];
            let tiempoBase = window.g4.time.valueOf();
            for (let groupCode of groupCodes) {
                let q = queries[groupCode];
                let filter = {};
                filter[q.group.config.stationField] = q.stationCodes;
                let startTime = tiempoBase - q.group.config.searchPeriod * 60 * 1000;
                let endTime = tiempoBase + q.group.config.searchPeriod * 60 * 1000; 
                let {promise, controller} = q.zrepoClient.queryTimeDim(variable.code, startTime, endTime, filter, q.group.config.stationField, variable.temporality);
                promises.push(promise);
                this.aborters.push(controller);
            }
            let res = await Promise.all(promises);
            // Buscar punto más cercano (tiempo) para cada estación
            let valores = {}; // {codigoEstacion:{time, value}}
            for (let i=0; i<res.length; i++) {
                let group = queries[groupCodes[i]].group;
                let rows = res[i];
                for (let j=0; j<rows.length; j++) {
                    let r = rows[j];                    
                    let lx = luxon.DateTime.fromObject(r.localTime, {zone:group.config.timeZone});
                    let time = lx.valueOf()
                    let v = valores[r.dim.code];
                    if (!v) {
                        valores[r.dim.code] = {value:r.value / r.n, time};
                    } else {
                        if (Math.abs(tiempoBase - time) < Math.abs(tiempoBase - v.time)) {
                            valores[r.dim.code] = {value:r.value / r.n, time};
                        }
                    }
                }
            }
            let min, max;
            for (let v of Object.values(valores)) {
                if (min === undefined || v.value < min) min = v.value;
                if (max === undefined || v.value > max) max = v.value;
            }
            this.colorScaleDef.min = min;
            this.colorScaleDef.max = max;

            this.monitorValues = valores;
            this._decWorking();
            await this.redraw();
        } catch(error) {       
            this._decWorking("error", error);     
            console.error("Refresh error", error);            
        }
    }
    async redraw() {        
        if (this.config.variable) {
            if (!this.colorScale) {
                this.colorScale = window.g4.createColorScale(null, this.colorScaleDef.name, this.colorScaleDef);
            }
            this.colorScale.setRange(this.colorScaleDef.min, this.colorScaleDef.max);
            window.g4.trigger("color-scale-changed", this);
        }
        if (!this.stationsColor) {
            this.stationsColor = this.config.stationsColor || [0,0,255,255];
            while (this.stationsColor.length < 4) this.stationsColor.push(255);
        }
        if (!this.stationsBorderColor && this.config.stationsBorderColor) {
            this.stationsBorderColor = this.config.stationsBorderColor;
            while (this.stationsBorderColor.length < 4) this.stationsBorderColor.push(255);
        }
        if (!this.stationsLayer) {
            let pixelsRatio = window.devicePixelRatio || 1;
            this.stationsLayer = new L.G4StationsOverlay({
                zIndex:(this.getOrder() >= 0)?200 + 10 *this.getOrder():-1,
                opacity: this.getOpacity(),
                getStations: _ => (this.stations),
                getStationStyle: s => {
                    let fillColor = this.stationsColor, label = null;
                    if (this.monitorValues) {
                        if (this.monitorValues[s.code]) {
                            fillColor = this.colorScale.getColorObject(this.monitorValues[s.code].value);
                            label = this.roundValue(this.monitorValues[s.code].value);
                            if (this.unit) label += " [" + this.unit + "]";
                        } else {
                            fillColor = [0,0,0,0];
                        }
                    }
                    return {
                        radius: 10 * pixelsRatio,
                        borderColor:this.stationsBorderColor,
                        fillColor, label: this.showLabelProp?label:null
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
    get activeColorScales() {
        let scales = [];
        if (this.variableProp && this.colorScale && !isNaN(this.colorScale.min) && !isNaN(this.colorScale.max)) {
            let v = this.cacheVariables[this.variableProp];
            if (v) {
                scales.push({id:this.id + ":stations", name:this.name + ": " + v.name, scale: this.colorScale, layer:this});
            }
        }
        return scales;
    } 
    elementAtPoint(lat, lng) {
        if (!this.stationsLayer) return null;
        let pixelsRatio = window.devicePixelRatio || 1;
        let treshold = 10 * pixelsRatio;
        let p = this.stationsLayer.latLngToCanvas(lat, lng);
        let elements = [];
        for (let s of (this.stations || [])) {
            let d = Math.sqrt((p.x - s.center.x) * (p.x - s.center.x) + (p.y - s.center.y) * (p.y - s.center.y));
            if (d <= treshold) {
                if (this.monitorValues) {
                    if (this.monitorValues[s.code]) {
                        let label = this.roundValue(this.monitorValues[s.code].value);
                        if (this.unit) label += " [" + this.unit + "]";
                        elements.push({
                            type: "sample", 
                            title: this.name + " / " + s.name,
                            label,
                            layerId:this.id, station: s
                        })
                    } else {
                        elements.push({
                            type: "sample", 
                            title: this.name + " / " + s.name,
                            label: "Sin Datos",
                            layerId:this.id, station: s
                        })
                    }
                } else {
                    elements.push({
                        type: "sample", 
                        title: this.name + " / " + s.name,
                        label: null,
                        layerId:this.id, station: s
                    })
                }
            }
        }
        return elements;
    }

    // Utiles
    async addStations(stations) {
        for (let s of stations) {
            let layer = window.g4.stationLayers.find(l => l.code == s.layerCode);
            let station = JSON.parse(JSON.stringify(layer.stations.find(st => st.code == s.stationCode)));
            station.group = layer; // Se le llama grupo a la definición ZRepo de la capa de estaciones para evitar confusones con esta capa y la leaflet
            if (!this.getStation(station.code)) {
                // Agregar variables con su metadata
                let zrepoClient = await window.g4.getZRepoClient(layer.config.zreposerver);
                let variables = [];
                for (let v of station.variables) {
                    variables.push(await zrepoClient.getVariable(v));
                }
                station.variables = variables;
                this.stations.push(station);
            }
        }
        this.refresh();
    }
    getStation(code) {
        return this.stations.find(s => s.code == code);
    }
    removeStations(codes) {
        for (let code of codes) {
            let idx = this.stations.findIndex(s => s.code == code);
            if (idx >= 0) this.stations.splice(idx, 1);
        }
        this.refresh();
    }
    getVariables() {
        if (!this.stations || !this.stations.length) return [];
        let map = {}; // code:{n:99}
        for (let s of this.stations) {
            for (let v of s.variables) {
                let {n, variable} = map[v.code] || {n:0, variable:v};
                map[v.code] = {n:n+1, variable}
            }
        }
        let variables = Object.keys(map)
            .map(code => (map[code].variable))
            .map(v => {
                v.label = v.name + " [" + map[v.code].n + "/" + this.stations.length + "]";
                return v;
            })
        // Ordener por ocurrencias y luego alfabético. Agregar campo "label" con ocurrencias
        variables.sort((v1, v2) => {
            let n1 = map[v1.code].n, n2 = map[v2.code].n;
            if (n1 == n2) {
                if (v1.name < v2.name) return -1;
                else return 1;
            }
            return n1 < n2?1:-1;
        })
        return variables;
    }

    getVariable(varCode) {
        let v = this.cacheVariables[varCode];
        if (v) return v;
        for (let s of (this.stations || [])) {
            v = s.variables.find(v2 => v2.code == varCode);
            if (v) {
                this.cacheVariables[varCode] = v;
                return v;
            }
        }
        return null;
    }
    roundValue(value) {
        let v = this.getVariable(this.config.variable);
        let nDec = 2;
        if (v && v.options && v.options.decimals !== undefined) nDec = v.options.decimals;
        if (isNaN(value)) return "";
        return value.toFixed(nDec);
    } 
    get unit() {
        let v = this.getVariable(this.config.variable);
        if (v && v.options) return v.options.unit;
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
    // Colorear por variable
    get variableProp() {return this.config.variable}
    set variableProp(v) {
        this.colorScale = undefined;
        this.config.variable = (v == "_no_"?null:v);        
        this.refresh();
    }
    get colorScaleDef() {return this.config.colorScaleDef}
    set colorScaleDef(def) {
        // rescatar min, max
        this.colorScale = undefined;
        def.min = this.config.colorScaleDef.min;
        def.max = this.config.colorScaleDef.max;        
        this.config.colorScaleDef = def;
        window.g4.trigger("color-scale-changed", this);
        this.callRedraw();
    }
    get showLabelProp() {return this.config.showLabel?true:false}
    set showLabelProp(s) {
        this.config.showLabel = s?true:false;
        this.callRedraw();
    }
}