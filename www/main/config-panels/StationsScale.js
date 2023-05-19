class StationsScale extends ZCustomController {
    onThis_init(options) {
        this.layer = options.layer;
        let variables = this.layer.getVariables();
        variables.splice(0,0,{code:"_no_", label:"[No Colorear por Variable]"})
        this.edVariable.setRows(variables, this.layer.variableProp || "_no_");
        this.edEscala.setRows(window.g4.getDefaultColorScales(), this.layer.colorScaleDef.name);
        this.edAuto.checked = this.layer.colorScaleDef.auto;
        this.edShowLabel.checked = this.layer.showLabelProp;
        this.refreshLimits();
        this.refreshLimitsEditable();
        this.layerStatusListener = l => {
            if (l.id == this.layer.id) this.refreshLimits()
        }
    }
    onThis_activated() {
        window.g4.on("layer-status-change", this.layerStatusListener)
    }
    onThis_deactivated() {
        window.g4.off("layer-status-change", this.layerStatusListener)
    }

    onEdVariable_change() {
        this.layer.variableProp = this.edVariable.value;
    }
    onEdEscala_change() {
        this.layer.colorScaleDef = window.g4.getDefaultColorScales().find(s => s.name == this.edEscala.value);
        console.log("scaleDef", this.layer.colorScaleDef);
    }
    onEdAuto_change() {
        let colorScaleDef = this.layer.colorScaleDef;
        colorScaleDef.auto = this.edAuto.checked;
        this.layer.colorScaleDef = colorScaleDef;
        this.refreshLimitsEditable();
    }
    onEdShowLabel_change() {
        this.layer.showLabelProp = this.edShowLabel.checked;
    }

    onEdMin_change() {
        let v = parseFloat(this.edMin.value);
        if (isNaN(v)) return;
        let colorScaleDef = this.layer.colorScaleDef;
        colorScaleDef.min = v;
        this.layer.colorScaleDef = colorScaleDef;
    }
    onEdMax_change() {
        let v = parseFloat(this.edMax.value);
        if (isNaN(v)) return;
        let colorScaleDef = this.layer.colorScaleDef;
        colorScaleDef.max = v;
        this.layer.colorScaleDef = colorScaleDef;
    }

    refreshLimitsEditable() {
        if (this.edAuto.checked) {
            this.edMin.disable();
            this.edMax.disable();
        } else {
            this.edMin.enable();
            this.edMax.enable();
        }
    }
    refreshLimits() {
        this.edMin.value = this.layer.roundValue(this.layer.colorScaleDef.min);
        this.edMax.value = this.layer.roundValue(this.layer.colorScaleDef.max);
    }
}
ZVC.export(StationsScale);