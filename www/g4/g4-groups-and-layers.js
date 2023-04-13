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
        this.layers.push(layer);
        await window.g4.trigger("layer-added", layer);
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
        switch (def.type) {
            case "geojson": return new G4GeoJsonLayer(def.name, def.config);
            case "raster": return new G4RasterLayer(def.name, def.config);
            default: throw "Layer Type '" + def.type + "' not handled";
        }
    }    

    constructor(id, name) {
        this.id = id || window.g4.uuidv4();
        this.name = name;
        this.nWorking = 0;
        this._status = "?";
        this.error = null;
    }

    get type() {
        throw "No se sobreescribió type para capa";
    }
    get dependsOnTime() {return false;}
    async g4init() {}
    async g4destroy() {}

    getStatus() {return this._status};
    async setStatus(s, error=null) {
        this._status = s;
        this.error = error;
        await window.g4.trigger("layer-status-change", this);
    }

    _incWorking() {
        if (++this.nWorking == 1) {
            this.error = null;
            this.setStatus("working");
        }
    }
    _decWorking(newStatus = "data", error = null) {
        if (!(--this.nWorking)) {            
            this.setStatus(newStatus, error);
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
}