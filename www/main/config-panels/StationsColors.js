class StationsColors extends ZCustomController {
    onThis_init(options) {
        this.layer = options.layer;
        let color = this.layer.stationsColorProp || [0,0,0,0];
        while (color.length < 4) color.push(255);
        this.edColorEstaciones.value = this.rgbArrayToHex(color);
        this.edColorEstaciones.view.addEventListener("input", e => this.onEdColorEstaciones_change())
        this.edOpacidadEstaciones.view.addEventListener("input", e => this.onEdColorEstaciones_change())
        this.edOpacidadEstaciones.value = color[3];
        let b = this.layer.stationsBorderProp;
        if (!b) {
            this.edBordesEstaciones.checked = false;
            this.filaColorBordesEstaciones.hide();
        } else {
            this.edBordesEstaciones.checked = true;
            color = b;
            while (color.length < 4) color.push(255);
            this.edColorBordesEstaciones.value = this.rgbArrayToHex(color);
        }
        this.edColorBordesEstaciones.view.addEventListener("input", e => this.onEdColorBordesEstaciones_change())
    }

    onEdColorEstaciones_change() {this.cambioColorRGBAEstaciones()}
    onEdOpacidadEstaciones_change() {this.cambioColorRGBAEstaciones()}

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
    cambioColorRGBAEstaciones() {
        let color = this.hexToRGBArray(this.edColorEstaciones.value);
        color.push(this.edOpacidadEstaciones.value);
        this.layer.stationsColorProp = color;
    }

    onEdBordesEstaciones_change() {
        this.cambioColorRGBABordesEstaciones();
    }
    onEdColorBordesEstaciones_change() {this.cambioColorRGBABordesEstaciones()}
    cambioColorRGBABordesEstaciones() {
        if (!this.edBordesEstaciones.checked) {
            this.filaColorBordesEstaciones.hide();
            this.layer.stationsBorderProp = undefined;
            return;
        }
        this.filaColorBordesEstaciones.show();
        let color = this.hexToRGBArray(this.edColorBordesEstaciones.value);
        color.push(255);
        this.layer.stationsBorderProp = color;
    }
}
ZVC.export(StationsColors);