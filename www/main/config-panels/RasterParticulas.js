class RasterParticulas extends ZCustomController {
    onThis_init(options) {
        this.layer = options.layer;
        this.edParticulasActivas.checked = this.layer.particlesActive;
        let color = this.layer.particlesColor;
        while (color.length < 4) color.push(255);
        this.edColorParticulas.value = this.rgbArrayToHex(color);
        this.edColorParticulas.view.addEventListener("input", e => this.onEdColorParticulas_change())
        this.edNumeroParticulas.value = this.layer.particlesParticles;
        this.edNumeroParticulas.view.oninput = e => {
            this.layer.particlesParticles = parseInt(this.edNumeroParticulas.value);
        };
        this.edTamanoParticulas.value = this.layer.particlesWidth;
        this.edTamanoParticulas.view.oninput = e => {
            this.layer.particlesWidth = parseFloat(this.edTamanoParticulas.value);
        };
        this.edFadeParticulas.value = this.layer.particlesFade;
        this.edFadeParticulas.view.oninput = e => {
            this.layer.particlesFade = parseFloat(this.edFadeParticulas.value);
        };
        this.edVelocidadParticulas.value = this.layer.particlesVelocityScale;
        this.edVelocidadParticulas.view.oninput = e => {
            this.layer.particlesVelocityScale = parseFloat(this.edVelocidadParticulas.value);
        };
        this.edDuracionParticulas.value = this.layer.particlesDuration;
        this.edDuracionParticulas.view.oninput = e => {
            this.layer.particlesDuration = parseInt(this.edDuracionParticulas.value);
        };
    }

    onEdParticulasActivas_change() {
        this.layer.particlesActive = this.edParticulasActivas.checked;
    }
    onEdColorParticulas_change() {this.cambioColorRGBA()}    

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
        let color = this.hexToRGBArray(this.edColorParticulas.value);
        color.push(255);
        this.layer.particlesColor = color;
    }
}
ZVC.export(RasterParticulas);