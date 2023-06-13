class G4Group {
    static createDefault() {
        return new G4Group(window.g4.uuidv4(), "Default Group", [], true);
    }
    constructor(id, name, layers, active) {
        this.id = id;
        this.name = name;
        this.layers = layers;
        this.active = active;
    }

    async addLayer(layer) {
        layer.group = this;
        this.layers.push(layer);
        layer.resetOrder();
        await window.g4.trigger("layer-added", layer);
    }
    async removeLayer(layer) {
        let idx = this.layers.findIndex(l => l.id == layer.id);
        if (idx >= 0) {
            this.layers.splice(idx, 1);
            this.layers.forEach(l => l.resetOrder());
            await window.g4.trigger("layer-removed", layer);
        }
    }
    getLayer(id) {
        return this.layers.find(l => l.id == id);
    }

    getLayerOrder(layer) {
        let idx = this.layers.indexOf(layer);
        return idx;
    }
    reorderLayer(fromIndex, toIndex) {
        let [layer] = this.layers.splice(fromIndex, 1);
        let idx = toIndex;
        if (toIndex < fromIndex) idx++;
        this.layers.splice(idx, 0, layer);
        for (let layer of this.layers) layer.resetOrder();
        window.g4.trigger("layers-reodered");
    }
    async createStationsLayer() {
        let layer = G4Layer.createFromDefinition({name:"Estaciones", type:"stations"});
        await this.addLayer(layer);
        await layer.g4init();
        await layer.refresh();
        return layer;
    }
}

class G4Layer {
    static getLayerDefinitions() {
        return window.config.layers;
    }
    static getDefaultLayerDefinition() {
        let layers = [];
        for (let codigo of window.config.defaultLayers) {            
            let layerDefinition = window.config.layers.find(l => l.code == codigo);
            layers.push(layerDefinition);
        } 
        return layers;
    }
    static createFromDefinition(def) {
        let defClone = JSON.parse(JSON.stringify(def));
        switch (def.type) {
            case "geojson": return new G4GeoJsonLayer(def.name, defClone.config);
            case "raster": return new G4RasterLayer(def.name, defClone.config);
            case "stations": return new G4StationsLayer(def.name, defClone.config);
            case "user-objects": return new G4UserObjectsLayer(def.name, defClone.config || {});
            default: throw "Layer Type '" + def.type + "' not handled";
        }
    }    

    constructor(id, name) {
        this.id = id || window.g4.uuidv4();
        this.name = name;
        this.nWorking = 0;
        this._status = "?";
        this.error = null;
        this._opacity = 1;
    }

    get type() {
        throw "No se sobreescribió type para capa";
    }
    get dependsOnTime() {return false;}
    get levels() {return null}
    get levelIndex() {return null}
    set levelIndex(idx) {}
    async g4init() {}
    async g4destroy() {}

    getStatus() {return this._status};
    setStatus(s, error=null) {
        this._status = s;
        this.error = error;
        window.g4.trigger("layer-status-change", this);
    }

    _incWorking() {
        if (++this.nWorking == 1) {
            this.error = null;
            setTimeout(_ => this.setStatus("working"), 0);
        }
    }
    _decWorking(newStatus = "data", error = null) {
        if (!(--this.nWorking)) {
            setTimeout(_ => this.setStatus(newStatus, error), 0);
        }
    }

    parseString(text, vars) {
        let st = "";
        let i0 = 0;
        let i1 = text.indexOf("${", i0);        
        while (i1 >= 0) {
            let p = text.indexOf("}", i1);
            if (p >= 0) {
                st += text.substring(i0, i1);
                let varName = text.substring(i1+2, p);
                let value = vars[varName];
                if (value !== undefined) {
                    st += value;
                } else {
                    st += "${" + varName + "}";
                }
                i0 = p + 1;
                i1 = text.indexOf("${", i0); 
            } else {
                i1 = -1;
            }
        }
        return st + text.substring(i0);
    }

    _getJSON(url, signal) {
        this._incWorking();
        return new Promise((resolve, reject) => {
            fetch(url, {signal:signal})
                .then(res => {
                    if (res.status != 200) {                        
                        res.text()
                            .then(txt => {
                                this._decWorking("error", txt);
                                reject(txt)
                            })
                            .catch(_ => {
                                this._decWorking("error", res.statusText);
                                reject(res.statusText);
                            })
                        return;
                    }
                    res.json()
                        .then(json => {
                            this._decWorking();
                            resolve(json)
                        }).catch(err => {
                            this._decWorking("error", err);
                            reject(err)
                        })
                })
                .catch(err => {
                    let error = err.name == "AbortError"?"aborted":err
                    this._decWorking("error", error);
                    reject(error)
                });
        })
    }

    getOrder() {
        if (!this.group) return -1;
        return this.group.getLayerOrder(this);
    }
    resetOrder() {
        console.error("resetOrder no sobreescrito en capa", this); 
    }

    getOpacity() {
        return this._opacity;
    }
    setOpacity(o) {
        console.error("setOpacity no sobreescrito en capa", this); 
    }
    elementAtPoint(lat, lng) {}
    get activeColorScales() {return []}
}