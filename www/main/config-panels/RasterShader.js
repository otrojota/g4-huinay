class RasterShader extends ZCustomController {
    onThis_init(options) {
        this.layer = options.layer;
        this.edEscala.setRows(window.g4.getGeoserverColorScales(this.layer.geoserver), this.layer.shaderColorScaleDef.name);
    }

    onEdEscala_change() {
        this.layer.shaderColorScaleDef = window.g4.getGeoserverColorScales(this.layer.geoserver).find(s => s.name == this.edEscala.value);
    }
}
ZVC.export(RasterShader);