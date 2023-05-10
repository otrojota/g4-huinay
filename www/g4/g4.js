class G4 {
    constructor() {
        this.mainController = null;     // Main controller
        this.mapController = null;      // G4Map controller
        this.mapControls = null;        // MapControls controller

        this._time = null;              // Luxon DateTime

        this.eventListeners = {};       // eventName:[listeners, ..]
        this.groups = [];               // {id:"guid", name: "", layers:[layer, ...]}
        this.geoServersMetadata = {};   // {url: metadata}
        this.geoServersColorScales = {};// {url: ScalesFactory}

        
    }

    // Centralized Event Handling
    on(eventName, listener) {
        let listeners = this.eventListeners[eventName];
        if (!listeners) {
            listeners = [];
            this.eventListeners[eventName] = listeners;
        }
        listeners.push(listener);
    }
    off(eventName, listener) {
        this.remove(eventName, listener);
    }
    remove(eventName, listener) {
        let listeners = this.eventListeners[eventName];
        if (!listeners) return;
        let idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
    }
    async trigger(eventName, data) {
        let listeners = this.eventListeners[eventName];
        if (!listeners) return;
        let promises = [];
        try {
            for (let listener of listeners) {
                let r = listener(data);
                if (r instanceof Promise) promises.push(r);
            }
            if (promises.length) await Promise.all(promises);
        } catch(error) {
            console.error(error);
        }
    }

    // Time
    get time() {return this._time}
    setTime(lx, ms=200) {
        this._time = lx;
        if (this.timeChangeTimer) {
            clearTimeout(this.timeChangeTimer);
        }
        this.timeChangeTimer = setTimeout(async _ => {
            this.timeChangeTimer = null;
            await this.trigger("time-change", this.time);
        }, ms)        
    }
    incTime(step) {
        this.setTime(this.time.plus(step));
    }
    // Utiles
    uuidv4() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }
    _getJSON(url) {
        return new Promise((resolve, reject) => {
            fetch(url)
                .then(res => {
                    if (res.status != 200) {
                        res.text()
                            .then(txt => reject(txt))
                            .catch(_ => reject(res.statusText))
                        return;
                    }
                    res.json()
                        .then(json => {
                            resolve(json)
                        }).catch(err => {
                            reject(err)
                        })
                })
                .catch(err => {                    
                    reject(err)
                });
        })
    }
    getGeoserverURL(name) {
        if (!window.config.geoservers) throw "No se ha definido 'geoservers' en la configuración"
        let url = window.config.geoservers[name];
        if (!url) throw "No se ha definido la URL del geoServer '" + name + "' en la configuración";
        return url;
    }

    // Interpolation
    interpolate(lat, lng, box, rows, nCols, nRows) {
        // https://en.wikipedia.org/wiki/Bilinear_interpolation                    
        if (lat < box.lat0 || lat > box.lat1 || lng < box.lng0 || lng > box.lng1) return null;
        let i = parseInt((lng - box.lng0) / box.dLng);
        let j = parseInt((lat - box.lat0) / box.dLat);
        if (i >= (nCols - 1) || j >= (nRows - 1)) return null;
        let x0 = box.lng0 + box.dLng*i;
        let x = (lng - x0) / box.dLng;
        let y0 = box.lat0 + box.dLat*j;
        let y = (lat - y0) / box.dLat;
        let rx = 1 - x, ry = 1 - y;

        let z00 = rows[j][i], z10 = rows[j][i+1], z01 = rows[j+1][i], z11 = rows[j+1][i+1];
        if (z00 == null || z10 == null || z01 == null || z11 == null) {
            // Usar promedio simple
            let sum=0, n=0;
            if (z00 !== null) {sum += z00; n++;}
            if (z10 !== null) {sum += z10; n++;}
            if (z01 !== null) {sum += z01; n++;}
            if (z11 !== null) {sum += z11; n++;}
            if (n) return sum / n;
            return null;
        }
        return z00*rx*ry + z10*x*ry + z01*rx*y + z11*x*y;
    }
    interpolateVector(lat, lng, box, rowsU, rowsV, nCols, nRows) {
        // https://en.wikipedia.org/wiki/Bilinear_interpolation
        if (lat <= box.lat0 || lat >= box.lat1 || lng <= box.lng0 || lng >= box.lng1) return null;
        let i = parseInt((lng - box.lng0) / box.dLng);
        let j = parseInt((lat - box.lat0) / box.dLat);
        if (i >= (nCols - 1) || j >= (nRows - 1)) return;
        let x0 = box.lng0 + box.dLng*i;
        let x = (lng - x0) / box.dLng;
        let y0 = box.lat0 + box.dLat*j;
        let y = (lat - y0) / box.dLat;
        let rx = 1 - x, ry = 1 - y;

        let u00 = rowsU[j][i], u10 = rowsU[j][i+1], u01 = rowsU[j+1][i], u11 = rowsU[j+1][i+1];
        if (u00 == null || u10 == null || u01 == null || u11 == null) return null;
        let u = u00*rx*ry + u10*x*ry + u01*rx*y + u11*x*y;

        let v00 = rowsV[j][i], v10 = rowsV[j][i+1], v01 = rowsV[j+1][i], v11 = rowsV[j+1][i+1];
        if (v00 == null || v10 == null || v01 == null || v11 == null) return null;
        let v = v00*rx*ry + v10*x*ry + v01*rx*y + v11*x*y;
        return {u, v};
    }

    // Groups and Layers
    addGroup(group) {
        this.groups.push(group);
    }
    createDefaultGroup() {
        this.addGroup(G4Group.createDefault());
    }
    getActiveGroup() {
        return this.groups.find(g => (g.active));
    }
    getLayers() {
        return this.getActiveGroup().layers;
    }
    getLayersFromTop() {
        let layers = this.getLayers();
        let ret = [];
        for (let i=layers.length - 1; i>=0; i--) ret.push(layers[i]);
        return ret;
    }

    // Geoservers
    async getGeoserverMetadata(url) {
        let metadata = this.geoServersMetadata[url];
        if (!metadata) {
            try {
                metadata = await this._getJSON(url + "/metadata");
                this.geoServersMetadata[url] = metadata;
                let scalesFactory = new ScalesFactory();
                await scalesFactory.init(url, metadata);
                this.geoServersColorScales[url] = scalesFactory;
            } catch(error) {
                console.error(error);
                return null;
            }
        }
        return metadata;
    }
    async getGeoserverVariableMetadata(geoserver, dataSetCode, variableCode) {
        let metadata = await this.getGeoserverMetadata(this.getGeoserverURL(geoserver));
        let dataSet = metadata.dataSets.find(d => (d.code == dataSetCode));
        if (!dataSet) throw "No se encontró el dataSet '" + dataSetCode + "'";
        let variable = dataSet.variables.find(v => (v.code == variableCode));
        if (!variable) throw "No se encontró la variable '" + variableCode + "' en el dataSet '" + dataSetCode + "'";
        return {dataSet, variable};
    }

    createColorScale(geoserver, scaleName, scaleConfig) {
        let factory = this.geoServersColorScales[this.getGeoserverURL(geoserver)];
        let scaleDef = factory.byName(scaleName);
        if (!scaleDef) throw "No se encontró la escala de colores '" + scaleName + "' en el servidor"
        return factory.createScale(scaleDef, scaleConfig);
    }
    getGeoserverColorScales(geoserver) {
        let url = this.getGeoserverURL(geoserver);
        if (!url) throw "No se encontró el geoserver '" + geoserver + "'";
        return this.geoServersColorScales[url].colorScales;
    }
}
window.g4 = new G4();