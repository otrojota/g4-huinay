class TimeSerieSerie extends ZCustomController {
    onThis_init() {
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
    async refresh(serieConfig) {
        console.log("serie refresh", serieConfig);
        this.config = serieConfig || {};
        if (!this.config.type) this.edOrigen.value = "no";
        else this.edOrigen.value = this.config.type;
        this.panelEstacion.hide();
        this.panelPunto.hide();
        if (this.edOrigen.value == "station") {
            this.panelEstacion.show("flex");
            await this.refreshStation();
            this.refreshTemporalities();
            this.refreshTimeDefs();
        }
    }

    refreshTemporalities() {
        let tempos = [];
        for (let i=0; i<G4Query.temporalities.length; i++) {
            if (i >= this.config.timeDef.level) tempos.push({code:G4Query.temporalities[i], name:G4Query.tempDescs[i]});            
        }
        this.edTemporalidad.setRows(tempos, this.config.temporality);
    }

    async refreshStation() {
        this.station = await window.g4.getEstacion(this.config.group.code, this.config.station.code);
        let txt = "Estación '" + this.station.name + "' desde '" + this.station.group.name + "'";
        this.lblEstacion.text = txt;
        this.edVariable.setRows(this.station.variables, this.config.variable.code);
        this.edName.value = this.config.name;
        this.edAcumulador.value = this.config.accum;
    }

    refreshTimeDefs() {        
        this.timeDefInicio.refresh("Tiempo Inicial", this.config.timeDef.level, this.config.timeDef.t0, true, this.edTemporalidad.value);
        this.timeDefFin.refresh("Tiempo Final", this.config.timeDef.level, this.config.timeDef.t1, false, this.edTemporalidad.value);
    }

    onEdName_change() {this.config.name = this.edName.value}
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

    fetch() {
        if (this.edOrigen.value == "no") return null;
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
        return this.config;
    }
}

ZVC.export(TimeSerieSerie);