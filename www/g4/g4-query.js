const temporalities = ["5m","15m","30m","1h","6h","12h","1d","1M", "3M", "4M", "6M", "1y"]
const tempDescs = ["Cada 5 minutos", "Cada 15 minutos", "Cada 30 minutos", "Cada una hora", "Cada 6 horas", "Cada 12 horas", "Diario", "Mensual", "Trimestral", "Cuatrimestral", "Semestral", "Anual"];
const baseIntervals = {
    "5m": {timeUnit: "minute",count: 5},
    "15m": {timeUnit: "minute",count: 15},
    "30m": {timeUnit: "minute",count: 30},
    "1h": {timeUnit: "hour",count: 1},
    "6h": {timeUnit: "hour",count: 6},
    "12h": {timeUnit: "hour",count: 12},
    "1d": {timeUnit: "day",count: 1},
    "1M": {timeUnit: "month",count: 1},
    "3M": {timeUnit: "month",count: 3},
    "4M": {timeUnit: "month",count: 4},
    "6M": {timeUnit: "month",count: 6},
    "1y": {timeUnit: "year",count: 1}
}
const tempUnits = ["minutes:minutos","minutes:minutos","minutes:minutos","hours:horas","hours:horas","hours:horas","days:días","months:meses", "months:meses", "months:meses", "months:meses", "years:años"]

class G4Query {
    static createTimeSerie(serieConfig) {
        console.log("G4Query from", serieConfig);
        let config = {type: serieConfig.type, queryType:"time-serie"};
        if (config.type == "station") {                        
            config.zreposerver = serieConfig.zreposerver;
            config.variable = serieConfig.variable.code;
            config.filter = {};
            config.filter[serieConfig.stationField] = serieConfig.station.code;
            config.temporality = serieConfig.temporality;
            config.timeDef = serieConfig.timeDef;
            config.accum = serieConfig.accum || "avg";
            config.tz = serieConfig.tz || "America/Santiago";
            return new G4Query(config);
        } else if (config.type == "raster") {
            config.geoserver = serieConfig.geoserver;
            config.dataSet = serieConfig.dataSet;
            config.variable = serieConfig.variable;
            config.temporality = serieConfig.temporality;
            config.timeDef = serieConfig.timeDef;
            config.point = serieConfig.point;
            return new G4Query(config);
        }
        throw "Serie tipo " + config.type + " No Implementada";
    }

    static createDefaultTimeDef(varTemporality) {
        let idx = temporalities.indexOf(varTemporality);
        if (idx < 0) throw "Temporalidad " + varTemporality + " no manejada";
        let temporality, timeDef;
        if (idx <= 3) {
            temporality = "1h";
            timeDef = {
                level:idx,
                t0: {type: "relative", unit:"hours", value: -48},
                t1: {type: "relative", unit:"hours", value: 0}
            }
        } else if (idx <= 6) {
            temporality = "1d";
            timeDef = {
                level:idx,
                t0: {type: "relative", unit:"months", value: -1},
                t1: {type: "relative", unit:"months", value: 0}
            }
        } else if (idx == 7) {
            temporality = "1M";
            timeDef = {
                level:idx,
                t0: {type: "relative", unit:"years", value: -1},
                t1: {type: "relative", unit:"years", value: 0}
            }
        } else {
            temporality = "1y";
            timeDef = {
                level:idx,
                t0: {type: "relative", unit:"years", value: -5},
                t1: {type: "relative", unit:"years", value: 0}
            }
        }
        return {temporality, timeDef};
    }

    static createDefaultTimeDefForRaster(varTemporality) {
        let temporality, timeDef;
        if (varTemporality.unit == "hours" || varTemporality.unit == "minutes") {
            temporality = "1h";
            timeDef = {
                level:2,
                t0: {type: "relative", unit:"hours", value: -24*3},
                t1: {type: "relative", unit:"hours", value: 24}
            }
        } else if (varTemporality.unit == "days") {
            temporality = "1d";
            timeDef = {
                level:3,
                t0: {type: "relative", unit:"days", value: -30},
                t1: {type: "relative", unit:"days", value: 0}
            }
        } else if (varTemporality.unit == "months") {
            temporality = "1M";
            timeDef = {
                level:4,
                t0: {type: "relative", unit:"months", value: -6},
                t1: {type: "relative", unit:"months", value: 0}
            }
        } else if (varTemporality.unit == "years") {
            temporality = "1y";
            timeDef = {
                level:4,
                t0: {type: "relative", unit:"years", value: -6},
                t1: {type: "relative", unit:"years", value: 0}
            }
        }
        return {temporality, timeDef};
    }

    constructor(config) {
        this.config = config;
    }

    _getJSON(url, signal) {
        return new Promise((resolve, reject) => {
            fetch(url, {signal:signal})
                .then(res => {
                    if (res.status != 200) {
                        res.text()
                            .then(txt => reject(txt))
                            .catch(_ => reject(res.statusText))
                        return;
                    }
                    res.json()
                        .then(json => {resolve(json)})
                        .catch(err => {reject(err)})
                })
                .catch(err => {
                    reject(err.name == "AbortError"?"aborted":err)
                });
        })
    }

    extractValue(d, accum) {
        if (accum == "avg") return d.value / d.n;
        if (accum == "min") return d.min;
        if (accum == "max") return d.max;
        if (accum == "n") return d.n;
        throw "Acumulador '" + accum + "' no manejado"
    }
    async execute() {
        if (this.config.queryType == "time-serie") {
            if (this.config.type == "station") {
                if (!this.zrepoClient) this.zrepoClient = await window.g4.getZRepoClient(this.config.zreposerver);
                let {t0, t1} = this.resolveTime();
                let {promise, controller} = this.zrepoClient.queryTimeSerie(this.config.variable, t0, t1, this.config.filter, this.config.temporality);
                let rows = await promise;
                rows = rows.map(d => ({
                    time:luxon.DateTime.fromObject(d.localTime, {zone:this.config.tz || "America/Santiago"}).valueOf(),
                    value:this.extractValue(d, this.config.accum || "avg")
                }))
                return rows;
            } else if (this.config.type == "raster") {
                let {t0, t1} = this.resolveTime();
                let url = `${window.g4.getGeoserverURL(this.config.geoserver)}/${this.config.dataSet.code}/${this.config.variable.code}/timeSerie?startTime=${t0.valueOf()}&endTime=${t1.valueOf()}&lat=${this.config.point.lat}&lng=${this.config.point.lng}&level=${this.config.level || 0}`;
                let rows = await this._getJSON(url);
                return rows;
            }
        }
    }

    resolveTime() {
        let t0 = this.resolveTimeUnit(this.config.timeDef.t0);
        let t1 = this.resolveTimeUnit(this.config.timeDef.t1);
        return {t0, t1}
    }
    resolveTimeUnit(def) {
        if (def.type == "absolute") return def.value;
        else if (def.type == "relative") {
            let tBase = window.g4.time;
            let timeInc = {};
            timeInc[def.unit] = def.value;
            return tBase.plus(timeInc);
        } else {
            console.log("def", def);
            return luxon.DateTime.fromMillis(def.value, {zone: "America/Santiago"});
        }
    }
}

G4Query.temporalities = temporalities;
G4Query.tempDescs = tempDescs;
G4Query.baseIntervals = baseIntervals;
G4Query.tempUnits = tempUnits;