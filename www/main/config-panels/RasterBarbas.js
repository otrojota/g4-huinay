class RasterBarbas extends ZCustomController {
    onThis_init(options) {
        this.layer = options.layer;
        this.edBarbasActivas.checked = this.layer.barbsActive;
        let color = this.layer.barbsColor;
        while (color.length < 4) color.push(255);
        this.edColorBarbas.value = this.rgbArrayToHex(color);
        this.edColorBarbas.view.addEventListener("input", e => this.onEdColorBarbas_change())
        this.refreshInterpolate();
    }

    onEdBarbasActivas_change() {
        this.layer.barbsActive = this.edBarbasActivas.checked;
    }
    onEdColorBarbas_change() {this.cambioColorRGBA()}    

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
        let color = this.hexToRGBArray(this.edColorBarbas.value);
        color.push(255);
        this.layer.barbsColor = color;
    }

    refreshInterpolate() {
        if (this.layer.barbsInterpolate) {
            this.rowInterpolate.show();
            this.edBarbasInterpolate.checked = true;
            this.edCols.value = this.layer.barbsInterpolateCols;
            this.edRows.value = this.layer.barbsInterpolateRows;
        } else {
            this.rowInterpolate.hide();
            this.edBarbasInterpolate.checked = false;
            this.edCols.value = 20;
            this.edRows.value = 15;
        }
    }
    onEdBarbasInterpolate_change() {
        this.setInterpolate();
        this.refreshInterpolate();
    }
    onEdCols_change() {this.setInterpolate()}
    onEdRows_change() {this.setInterpolate()}
    setInterpolate() {
        if (!this.edBarbasInterpolate.checked) {
            this.layer.setBarbsInterpolation();
            return;
        }
        let cols = parseInt(this.edCols.value);
        if (isNaN(cols)) {
            cols = 20; this.edCols.value = 20;
        }
        if (cols < 2) {
            cols = 2; this.edCols.value = 2;
        }
        if (cols > 500) {
            cols = 500; this.edMinCols.value = 500;
        }
        let rows = parseInt(this.edRows.value);
        if (isNaN(rows)) {
            rows = 15; this.edRows.value = 15;
        }
        if (rows < 2) {
            rows = 2; this.edRows.value = 2;
        }
        if (rows > 500) {
            rows = 800; this.edRows.value = 500;
        }
        this.layer.setBarbsInterpolation(cols, rows);
    }
}
ZVC.export(RasterBarbas);