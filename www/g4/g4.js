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
    remove(eventName, listener) {
        let listeners = this.eventListeners[eventName];
        if (!listeners) return;
        let idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
    }
    async trigger(eventName, data) {
        let listeners = this.eventListeners[eventName];
        if (!listeners) return;
        for (let listener of listeners) {
            try {
                let r = listener(data);
                if (r instanceof Promise) await r;
            } catch(error) {
                console.error(error);
            }
        }
    }

    // Time
    get time() {return this._time}
    async setTime(lx) {
        this._time = lx;
        await this.trigger("time-change", this.time);
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
    async getGeoserverVariableMetadata(geoServerURL, dataSetCode, variableCode) {
        let metadata = await this.getGeoserverMetadata(geoServerURL);
        let dataSet = metadata.dataSets.find(d => (d.code == dataSetCode));
        if (!dataSet) throw "No se encontró el dataSet '" + dataSetCode + "'";
        let variable = dataSet.variables.find(v => (v.code == variableCode));
        if (!variable) throw "No se encontró la variable '" + variableCode + "' en el dataSet '" + dataSetCode + "'";
        return {dataSet, variable};
    }

    createColorScale(geoserverURL, scaleName, scaleConfig) {
        let factory = this.geoServersColorScales[geoserverURL];
        let scaleDef = factory.byName(scaleName);
        if (!scaleDef) throw "No se encontró la escala de colores '" + scaleName + "' en el servidor"
        return factory.createScale(scaleDef, scaleConfig);
    }
}
window.g4 = new G4();