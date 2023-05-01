class RasterVectores extends ZCustomController {
    onThis_init(options) {
        this.layer = options.layer;
        this.edVectoresActivos.checked = this.layer.vectorsActive;
        let color = this.layer.vectorsColor;
        while (color.length < 4) color.push(255);
        this.edColorVectores.value = this.rgbArrayToHex(color);
        this.edColorVectores.view.addEventListener("input", e => this.onEdColorVectores_change())
        this.refreshInterpolate();
    }

    onEdVectoresActivos_change() {
        this.layer.vectorsActive = this.edVectoresActivos.checked;
    }
    onEdColorVectores_change() {this.cambioColorRGBA()}    

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
        let color = this.hexToRGBArray(this.edColorVectores.value);
        color.push(255);
        this.layer.vectorsColor = color;
    }

    refreshInterpolate() {
        if (this.layer.vectorsInterpolate) {
            this.rowInterpolate.show();
            this.edVectorsInterpolate.checked = true;
            this.edCols.value = this.layer.vectorsInterpolateCols;
            this.edRows.value = this.layer.vectorsInterpolateRows;
        } else {
            this.rowInterpolate.hide();
            this.edVectorsInterpolate.checked = false;
            this.edCols.value = 20;
            this.edRows.value = 15;
        }
    }
    onEdVectorsInterpolate_change() {
        this.setInterpolate();
        this.refreshInterpolate();
    }
    onEdCols_change() {this.setInterpolate()}
    onEdRows_change() {this.setInterpolate()}
    setInterpolate() {
        if (!this.edVectorsInterpolate.checked) {
            this.layer.setVectorsInterpolation();
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
        this.layer.setVectorsInterpolation(cols, rows);
    }
}
ZVC.export(RasterVectores);