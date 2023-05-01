class RasterIsolineas extends ZCustomController {
    onThis_init(options) {
        this.layer = options.layer;
        this.edIsolineasActivas.checked = this.layer.isolinesActive;
        this.edSuavizar.checked = this.layer.isolinesSmooth;
        let color = this.layer.isolinesColor;
        while (color.length < 4) color.push(255);
        this.edColorLineas.value = this.rgbArrayToHex(color);
        this.edColorLineas.view.addEventListener("input", e => this.onEdColorLineas_change())
        this.edOpacidadLineas.value = color[3];
        let tipoIncremento = "auto";
        if (this.layer.isolinesFixedLevels) tipoIncremento = "fixedLevels";
        if (this.layer.isolinesIncrement) tipoIncremento = "fixed";  
        this.edTipoIncremento.setRows([
            {code:"auto", name:"Automático"},
            {code:"fixed", name:"Fijo"},
            {code:"fixedLevels", name:"Extraer Niveles"}
        ], tipoIncremento);
        if (this.layer.unit) this.lblTipoIncremento.text = this.lblTipoIncremento.text + " [" + this.layer.unit + "]";
        this.cambioTipoIncremento();
        this.layerStatusListener = l => {
            if (l.id == this.layer.id) this.cambioTipoIncremento()
        }
    }
    onThis_activated() {
        window.g4.on("layer-status-change", this.layerStatusListener)
    }
    onThis_deactivated() {
        window.g4.off("layer-status-change", this.layerStatusListener)
    }

    onEdIsolineasActivas_change() {
        this.layer.isolinesActive = this.edIsolineasActivas.checked;
    }
    onEdColorLineas_change() {this.cambioColorRGBA()}
    onEdOpacidadLineas_change() {this.cambioColorRGBA()}

    hexToRGBArray(hex) {
        let res = hex.match(/[a-f0-9]{2}/gi);
        return res && res.length === 3?
            res.map(v => (parseInt(v, 16)))
            : [0,0,0];
    }
    byteToHex(b) {
        let st = b.toString(16);
        return st.length < 2?("0" + st):st;
    }
    rgbArrayToHex(a) {
        return "#" + this.byteToHex(a[0]) + this.byteToHex(a[1]) + this.byteToHex(a[2]);
    }
    cambioColorRGBA() {
        let color = this.hexToRGBArray(this.edColorLineas.value);
        color.push(this.edOpacidadLineas.value);
        this.layer.isolinesColor = color;
    }

    onEdTipoIncremento_change() {this.cambioTipoIncremento()}
    cambioTipoIncremento() {
        let tipo = this.edTipoIncremento.value;
        if (tipo == "auto") {
            this.filaIncremento.show();
            this.filaFixedLevels.hide();
            let valor = this.layer.isolinesCalculatedIncrement || "";
            this.edIncremento.value = valor;
            this.edIncremento.disable();
            if (this.layer.isolinesIncrement || this.layer.isolinesFixedLevels) this.layer.isolinesIncrement = null;
        } else if (tipo == "fixed") {
            this.filaIncremento.show();
            this.filaFixedLevels.hide();
            let valor = 1;
            if (this.layer.isolinesIncrement) valor = this.layer.isolinesIncrement;
            else if (this.layer.isolinesCalculatedIncrement) valor = this.layer.isolinesCalculatedIncrement;
            this.edIncremento.value = valor;            
            this.edIncremento.enable();
            if (this.layer.isolinesIncrement != valor) this.layer.isolinesIncrement = valor;
        } else {
            this.filaIncremento.hide();
            this.filaFixedLevels.show();
            let valor = this.layer.isolinesFixedLevels || "1"
            this.edNiveles.value = valor;
            if (this.layer.isolinesFixedLevels != valor) this.layer.isolinesFixedLevels = valor;
        }
    }
    
    onEdIncremento_change() {
        let i = parseFloat(this.edIncremento.value);
        if (isNaN(i)) return;
        this.layer.isolinesIncrement = i;
    }
    onEdNiveles_change() {
        let st = this.edNiveles.value.trim();
        let list = st.split(" ");
        if (!list.length) return;
        for (let i=0; i<list.length; i++) {
            if (isNaN(parseFloat(list[i]))) return;
        }
        this.layer.isolinesFixedLevels = list.join(" ");
    }
    onEdSuavizar_change() {
        this.layer.isolinesSmooth = this.edSuavizar.checked;
    }
}
ZVC.export(RasterIsolineas);