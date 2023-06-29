class TimeDef extends ZCustomController {
    onThis_init() {
        this.edTipo.setRows([{
            code:"relative", name:"Relativo a Mapa"
        }, {
            code:"absolute", name:"Absoluto"
        }]);
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
        this.edMes.setRows(meses.map((m, idx) => ({code:idx, name:m})));
    }
    refresh(label, level, timeDef, inicial, temporalidad) {   
        this.timeDef = JSON.parse(JSON.stringify(timeDef));
        this.level = level;
        this.inicial = inicial;
        this.temporalidad = temporalidad;
        let tempos = [], added = {};
        let tempUnits = G4Query.tempUnits;
        for (let i=0; i<tempUnits.length; i++) {
            if (i >= level && !added[tempUnits[i]]) {
                added[tempUnits[i]] = true;
                let idx = tempUnits[i].indexOf(":");
                let code = tempUnits[i].substring(0,idx);
                let name = tempUnits[i].substring(idx+1);
                tempos.push({code, name});
            }
        }
        this.edUnidad.setRows(tempos);
        this.label.text = label;
        this.edTipo.value = this.timeDef.type;

        this.refreshTimeDef();
    }
    refreshTimeDef() {
        this.panelRelativo.hide();
        this.panelAbsoluto.hide();
        if (this.timeDef.type == "relative") {
            if (!this.timeDef.unit) {
                let {temporality, timeDef} = G4Query.createDefaultTimeDef(this.temporalidad);
                let t = this.inicial?timeDef.t0:timeDef.t1;
                this.timeDef.unit = t.unit;
                this.timeDef.value = t.value;
            }
            this.panelRelativo.show();
            this.edUnidad.value = this.timeDef.unit;
            this.edValor.value = this.timeDef.value;
        } else {
            if (!this.timeDef.value) {
                let baseInterval = G4Query.baseIntervals[this.temporalidad];
                let t0 = luxon.DateTime.fromMillis(Date.now(), {zone: "America/Santiago"}).startOf("day");
                if (this.inicial) {
                    let inc = {};
                    if (baseInterval.timeUnit == "minute") inc.day = -1;
                    else if (baseInterval.timeUnit == "hour") inc.day = -2;
                    else  inc[baseInterval.timeUnit] = -10 * baseInterval.count;
                    t0 = t0.plus(inc);
                }
                this.timeDef.value = t0.startOf("day").valueOf();
            }
            let t = luxon.DateTime.fromMillis(this.timeDef.value);
            this.panelAbsoluto.show();
            this.edAno.value = t.year;
            this.edMes.value = t.month;
            this.edDia.value = t.day;
        }
    }

    onEdTipo_change() {
        this.timeDef.type = this.edTipo.value;
        this.timeDef.unit = null;
        this.timeDef.value = null;
        this.refreshTimeDef();
    }

    fetch() {
        if (this.edTipo.value == "relative") {
            let value = parseInt(this.edValor.value);
            if (isNaN(value)) throw "El valor de incremento relativo es inválido";
            return {type:"relative", unit: this.edUnidad.value, value};
        } else {
            let year = parseInt(this.edAno.value);
            if (isNaN(year) || year < 1800 || year > 3000) throw "El Año es Inválido";
            let month = parseInt(this.edMes.value);
            let day = parseInt(this.edDia.value);
            if (isNaN(day) || day < 1 || day > 31) throw "El Día es Inválido";
            let d = luxon.DateTime.fromObject({year, month, day});
            return {type:"absolute", value:d.valueOf()}
        }
    }

}
ZVC.export(TimeDef);