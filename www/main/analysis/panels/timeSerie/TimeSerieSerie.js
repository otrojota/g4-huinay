class TimeSerieSerie extends ZCustomController {
    async onThis_init() {
        this.edOrigen.setRows([{
            code:"no", name:"No Usar esta Serie"
        }, {
            code:"station", name:"Variable desde Estación"
        }, {
            code:"raster", name:"Variable desde Capa Raster"
        }]);
        this.edAcumulador.setRows([{
            code:"avg", name:"Promedio"
        }, {
            code:"min", name:"Mínimo"
        }, {
            code:"max", name:"Máximo"
        }, {
            code:"n", name:"N° Muestras"
        }]);
        
    }
    async refresh(serieConfig, primaria) {
        this.config = serieConfig || {};
        this.primaria = primaria;
        if (!this.config.type) this.edOrigen.value = "no";
        else this.edOrigen.value = this.config.type;
        if (primaria) this.edOrigen.disableRow("no");
        this.panelEstacion.hide();
        this.panelPunto.hide();
        if (this.edOrigen.value == "station") {
            this.panelEstacion.show("flex");
            await this.refreshStation();
            this.refreshTemporalities();
            this.refreshTimeDefs();
        } else if (this.edOrigen.value == "raster") {
            this.panelPunto.show("flex");
            this.refreshRaster();
            this.refreshTimeDefs();
        }
    }

    onEdOrigen_change() {
        if (this.edOrigen.value == "station") {
            this.panelEstacion.show("flex");
            this.panelPunto.hide();
            this.refresh({type:"station"});
        } else {
            this.panelEstacion.hide();
            this.panelPunto.show("flex");
            this.refresh({type:"point"});
        }
    }

    refreshTemporalities() {
        if (!this.config.timeDef) return;
        let tempos = [];
        for (let i=0; i<G4Query.temporalities.length; i++) {
            if (i >= this.config.timeDef.level) tempos.push({code:G4Query.temporalities[i], name:G4Query.tempDescs[i]});            
        }
        this.edTemporalidad.setRows(tempos, this.config.temporality);
    }

    async refreshStation() {
        if (!this.config.station) {
            this.panelConVariable.hide();
            this.lblEstacion.html = `
                <div class="text-danger">
                    Debe seleccionar una estación
                </div>
            `;    
            return;
        }
        this.panelConVariable.show();
        this.station = await window.g4.getEstacion(this.config.group.code, this.config.station.code);
        let txt = "Estación '" + this.station.name + "' desde '" + this.station.group.name + "'";
        this.lblEstacion.text = txt;        
        this.edName.value = this.config.name;
        this.edVariable.setRows(this.station.variables, this.config.variable?this.config.variable.code:null);
        if (!this.config.variable) this.onEdVariable_change();
        this.edAcumulador.value = this.config.accum;
        if (!this.config.accum) this.onEdAcumulador_change();
    }

    refreshRaster() {
        if (!this.config.dataSet || !this.config.variable) {
            this.panelConVariableRaster.hide();
            this.lblVariableRaster.html = `
                <div class="text-danger">
                    Debe seleccionar una variable
                </div>
            `;    
            this.filaNivel.hide();
            return;
        }
        this.panelConVariableRaster.show();
        this.lblVariableRaster.text = this.config.variable.name + " [" + this.config.variable.unit + "]";
        this.edNameRaster.value = this.config.name;
        if (this.config.variable.levels) {
            this.edLevel.setRows(this.config.variable.levels.map(
                (l, idx) => ({idx, name:l})
            ), this.config.level)
            this.filaNivel.show("flex");
        } else {
            this.filaNivel.hide();
        }
    }

    refreshTimeDefs() {
        if (!this.config.timeDef) return;
        if (this.edOrigen.value == "station") {
            this.timeDefInicio.refresh("Tiempo Inicial", this.config.timeDef.level, this.config.timeDef.t0, true, this.edTemporalidad.value);
            this.timeDefFin.refresh("Tiempo Final", this.config.timeDef.level, this.config.timeDef.t1, false, this.edTemporalidad.value);
        } else {
            this.timeDefInicioRaster.refresh("Tiempo Inicial", this.config.timeDef.level, this.config.timeDef.t0, true, this.edTemporalidad.value);
            this.timeDefFinRaster.refresh("Tiempo Final", this.config.timeDef.level, this.config.timeDef.t1, false, this.edTemporalidad.value);
        }
    }

    onEdName_change() {this.config.name = this.edName.value}
    onEdNameRaster_change() {this.config.name = this.edNameRaster.value}
    
    onEdVariable_change() {
        let variable = this.station.variables.find(v => v.code == this.edVariable.value);
        //this.config.variable = {code: r.code, name: r.name, unit: r.unit, temporality: r.temporality},
        this.config.variable = {
            name:variable.name, 
            code:variable.code,
            unit:(variable.options && variable.options.unit)?(variable.options.unit):"",
            temporality: variable.temporality
        }
        this.edName.value = variable.name;
        this.config.name = this.edName.value
        let {temporality, timeDef} = G4Query.createDefaultTimeDef(variable.temporality);
        this.config.timeDef = timeDef;
        this.refreshTemporalities();
        this.onEdTemporalidad_change();
    }
    onEdAcumulador_change() {
        this.config.accum = this.edAcumulador.value;
    }
    onEdTemporalidad_change() {
        this.config.temporality = this.edTemporalidad.value;
        let {temporality, timeDef} = G4Query.createDefaultTimeDef(this.edTemporalidad.value);
        this.config.timeDef = timeDef;
        this.refreshTimeDefs();
    }
    onEdLevel_change() {
        this.config.level = parseInt(this.edLevel.value);
        this.config.name = this.config.variable.name + " - " + this.config.variable.levels[this.config.level];
        this.edNameRaster.value = this.config.name;
    }

    fetch() {
        if (this.edOrigen.value == "no") return null;
        if (this.edOrigen.value == "station") {
            try {
                this.config.timeDef.t0 = this.timeDefInicio.fetch();
            } catch(error) {
                throw "Error en el tiempo inicial: " + error;
            }
            try {
                this.config.timeDef.t1 = this.timeDefFin.fetch();
            } catch(error) {
                throw "Error en el tiempo final: " + error;
            }
        } else {
            try {
                this.config.timeDef.t0 = this.timeDefInicioRaster.fetch();
            } catch(error) {
                throw "Error en el tiempo inicial: " + error;
            }
            try {
                this.config.timeDef.t1 = this.timeDefFinRaster.fetch();
            } catch(error) {
                throw "Error en el tiempo final: " + error;
            }
        }
        return this.config;
    }

    onCmdSeleccionarEstacion_click() {
        console.log("condig1", this.config.timeDef);
        this.showDialog("./../../WSelectStation", {}, ({group, station, searchPeriod, stationField, timeZone, zreposerver}) => {
            this.config.station = station;
            this.config.group = group;
            this.config.searchPeriod = searchPeriod;
            this.config.stationField = stationField;
            this.config.timeZone = timeZone;
            this.config.zreposerver = zreposerver;
            console.log("condig", this.config.timeDef);
            this.refreshStation()
            console.log("condig2", this.config.timeDef);
            console.log("condig3", this.config);
        })
    }

    onCmdSeleccionarRaster_click() {
        this.showDialog("main/WAddLayer", {action:"select-variable"}, async variable => {
            let oldTemporality = this.config.dataSet?this.config.dataSet.temporality:null;
            let rasterMetadata = await window.g4.getGeoserverVariableMetadata(variable.config.geoserver, variable.config.dataSet, variable.config.variable);
            this.config.geoserver = variable.config.geoserver;
            this.config.dataSet = rasterMetadata.dataSet;
            this.config.variable = rasterMetadata.variable;
            this.config.name = rasterMetadata.variable.name + (rasterMetadata.variable.levels?(" - " + rasterMetadata.variable.levels[0]):"");
            this.config.level = 0;            
            this.refreshRaster();
            let {temporality, timeDef} = G4Query.createDefaultTimeDefForRaster(rasterMetadata.dataSet.temporality)
            if (!this.config.timeDef || oldTemporality != temporality) {
                this.config.timeDef = timeDef;
                this.refreshTimeDefs();
            }
        })
    }
}

ZVC.export(TimeSerieSerie);