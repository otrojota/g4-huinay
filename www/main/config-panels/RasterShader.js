class RasterShader extends ZCustomController {
    onThis_init(options) {
        this.layer = options.layer;
        this.edShaderActivo.checked = this.layer.shaderActive;
        this.edEscala.setRows(window.g4.getGeoserverColorScales(this.layer.geoserver), this.layer.shaderColorScaleDef.name);
        this.edAuto.checked = this.layer.shaderColorScaleAuto;        
        this.edClipOutOfRange.checked = this.layer.shaderColorScaleClipOutOfRange;
        this.refreshLimits();
        this.refreshLimitsEditable();
        this.refreshInterpolate();
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

    onEdEscala_change() {
        this.layer.shaderColorScaleDef = window.g4.getGeoserverColorScales(this.layer.geoserver).find(s => s.name == this.edEscala.value);
    }
    onEdShaderActivo_change() {
        this.layer.shaderActive = this.edShaderActivo.checked;
    }
    onEdAuto_change() {        
        this.layer.shaderColorScaleAuto = this.edAuto.checked;
        this.refreshLimitsEditable();
    }

    onEdClipOutOfRange_change() {
        this.layer.shaderColorScaleClipOutOfRange = this.edClipOutOfRange.checked;
    }
    onEdMin_change() {
        let v = parseFloat(this.edMin.value);
        if (!isNaN(v)) this.layer.shaderColorScaleMin = v;
    }
    onEdMax_change() {
        let v = parseFloat(this.edMax.value);
        if (!isNaN(v)) this.layer.shaderColorScaleMax = v;
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
        this.edMin.value = this.layer.roundValue(this.layer.shaderColorScaleMin);
        this.edMax.value = this.layer.roundValue(this.layer.shaderColorScaleMax);
    }

    refreshInterpolate() {
        if (this.layer.shaderInterpolate) {
            this.edInterpolate.checked = true;
            this.edMinCols.value = this.layer.shaderInterpolateMinCols;
            this.edMinRows.value = this.layer.shaderInterpolateMinRows;
        } else {
            this.edInterpolate.checked = false;
            this.edMinCols.value = 300;
            this.edMinRows.value = 200;
        }
    }
    onEdInterpolate_change() {this.setInterpolate()}
    onEdMinCols_change() {this.setInterpolate()}
    onEdMinRows_change() {this.setInterpolate()}
    setInterpolate() {
        if (!this.edInterpolate.checked) {
            this.layer.setShaderInterpolation();
            return;
        }
        let minCols = parseInt(this.edMinCols.value);
        if (isNaN(minCols)) {
            minCols = 300; this.edMinCols.value = 300;
        }
        if (minCols < 10) {
            minCols = 10; this.edMinCols.value = 10;
        }
        if (minCols > 800) {
            minCols = 800; this.edMinCols.value = 800;
        }
        let minRows = parseInt(this.edMinRows.value);
        if (isNaN(minRows)) {
            minRows = 200; this.edMinRows.value = 200;
        }
        if (minRows < 10) {
            minRows = 10; this.edMinRows.value = 10;
        }
        if (minRows > 800) {
            minRows = 800; this.edMinRows.value = 800;
        }
        this.layer.setShaderInterpolation(minCols, minRows);
    }
}
ZVC.export(RasterShader);