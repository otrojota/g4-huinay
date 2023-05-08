class GeoJsonColors extends ZCustomController {
    onThis_init(options) {
        this.layer = options.layer;
        let color = this.layer.polygonsColorProp || [0,0,0,0];
        while (color.length < 4) color.push(255);
        this.edColorPoligonos.value = this.rgbArrayToHex(color);
        this.edColorPoligonos.view.addEventListener("input", e => this.onEdColorPoligonos_change())
        this.edOpacidadPoligonos.view.addEventListener("input", e => this.onEdColorPoligonos_change())
        this.edOpacidadPoligonos.value = color[3];
        let b = this.layer.polygonsBorderProp;
        console.log("b", b);
        if (!b) {
            this.edBordesPoligonos.checked = false;
            this.filaColorBordesPoligonos.hide();
        } else {
            this.edBordesPoligonos.checked = true;
            color = b;
            while (color.length < 4) color.push(255);
            this.edColorBordesPoligonos.value = this.rgbArrayToHex(color);
        }
        this.edColorBordesPoligonos.view.addEventListener("input", e => this.onEdColorBordesPoligonos_change())
        color = this.layer.linesColorProp || [0,0,0,0];
        while (color.length < 4) color.push(255);
        this.edColorLineas.value = this.rgbArrayToHex(color);
        this.edColorLineas.view.addEventListener("input", e => this.onEdColorLineas_change())
    }

    onEdColorPoligonos_change() {this.cambioColorRGBAPoligonos()}
    onEdOpacidadPoligonos_change() {this.cambioColorRGBAPoligonos()}

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
    cambioColorRGBAPoligonos() {
        let color = this.hexToRGBArray(this.edColorPoligonos.value);
        color.push(this.edOpacidadPoligonos.value);
        this.layer.polygonsColorProp = color;
    }

    onEdBordesPoligonos_change() {
        this.cambioColorRGBABordesPoligonos();
    }
    onEdColorBordesPoligonos_change() {this.cambioColorRGBABordesPoligonos()}
    cambioColorRGBABordesPoligonos() {
        if (!this.edBordesPoligonos.checked) {
            this.filaColorBordesPoligonos.hide();
            this.layer.polygonsBorderProp = undefined;
            return;
        }
        this.filaColorBordesPoligonos.show();
        let color = this.hexToRGBArray(this.edColorBordesPoligonos.value);
        color.push(255);
        this.layer.polygonsBorderProp = color;
    }
    onEdColorLineas_change() {this.cambioColorRGBALineas()}
    cambioColorRGBALineas() {
        let color = this.hexToRGBArray(this.edColorLineas.value);
        color.push(255);
        this.layer.linesColorProp = color;
    }
}
ZVC.export(GeoJsonColors);