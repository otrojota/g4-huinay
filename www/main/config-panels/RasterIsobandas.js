class RasterIsobandas extends ZCustomController {
    onThis_init(options) {
        this.layer = options.layer;
        this.edIsobandasActivas.checked = this.layer.isobandsActive;
        let tipoIncremento = "auto";
        if (this.layer.isobandsIncrement) tipoIncremento = "fixed";  
        this.edTipoIncremento.setRows([
            {code:"auto", name:"Automático"},
            {code:"fixed", name:"Fijo"}
        ], tipoIncremento);
        if (this.layer.unit) this.lblTipoIncremento.text = this.lblTipoIncremento.text + " [" + this.layer.unit + "]";
        this.cambioTipoIncremento();
        this.edEscala.setRows(window.g4.getGeoserverColorScales(this.layer.geoserver), this.layer.isobandsColorScaleDef.name);
        this.edIsobandsAuto.checked = this.layer.isobandsColorScaleAuto;        
        this.edIsobandsClipOutOfRange.checked = this.layer.isobandsColorScaleClipOutOfRange;
        this.refreshLimits();
        this.refreshLimitsEditable();
        this.layerStatusListener = l => {
            if (l.id == this.layer.id) {
                this.cambioTipoIncremento()
                this.refreshLimits();
            }
        }
    }
    onThis_activated() {
        window.g4.on("layer-status-change", this.layerStatusListener)
    }
    onThis_deactivated() {
        window.g4.off("layer-status-change", this.layerStatusListener)
    }

    onEdIsobandasActivas_change() {
        this.layer.isobandsActive = this.edIsobandasActivas.checked;
    }

    onEdTipoIncremento_change() {this.cambioTipoIncremento()}
    cambioTipoIncremento() {
        let tipo = this.edTipoIncremento.value;
        if (tipo == "auto") {
            let valor = this.layer.isobandsCalculatedIncrement || "";
            this.edIncremento.value = valor;
            this.edIncremento.disable();
            if (this.layer.isobandsIncrement) this.layer.isobandsIncrement = null;
        } else {
            let valor = 1;
            if (this.layer.isobandsIncrement) valor = this.layer.isobandsIncrement;
            else if (this.layer.isobandsCalculatedIncrement) valor = this.layer.isobandsCalculatedIncrement;
            this.edIncremento.value = valor;            
            this.edIncremento.enable();
            if (this.layer.isobandsIncrement != valor) this.layer.isobandsIncrement = valor;
        }
    }
    
    onEdIncremento_change() {
        let i = parseFloat(this.edIncremento.value);
        if (isNaN(i)) return;
        this.layer.isobandsIncrement = i;
    }

    onEdEscala_change() {
        this.layer.isobandsColorScaleDef = window.g4.getGeoserverColorScales(this.layer.geoserver).find(s => s.name == this.edEscala.value);
    }
    onEdIsobandsAuto_change() {        
        this.layer.isobandsColorScaleAuto = this.edIsobandsAuto.checked;
        this.refreshLimitsEditable();
    }

    onEdIsobandsClipOutOfRange_change() {
        this.layer.isobandsColorScaleClipOutOfRange = this.edIsobandsClipOutOfRange.checked;
    }
    onEdMin_change() {
        let v = parseFloat(this.edMin.value);
        if (!isNaN(v)) this.layer.isobandsColorScaleMin = v;
    }
    onEdMax_change() {
        let v = parseFloat(this.edMax.value);
        if (!isNaN(v)) this.layer.isobandsColorScaleMax = v;
    }

    refreshLimitsEditable() {
        if (this.edIsobandsAuto.checked) {
            this.edMin.disable();
            this.edMax.disable();
        } else {
            this.edMin.enable();
            this.edMax.enable();
        }
    }
    refreshLimits() {
        this.edMin.value = this.layer.roundValue(this.layer.isobandsColorScaleMin);
        this.edMax.value = this.layer.roundValue(this.layer.isobandsColorScaleMax);
    }
}
ZVC.export(RasterIsobandas);