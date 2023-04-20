class FilaOpacidadCapa extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        this.lblNombreCapa.text = layer.name;
        this.edOpacidad.value = layer.getOpacity() * 100;
        this.edOpacidad.view.oninput = e => {
            this.layer.setOpacity(parseInt(this.edOpacidad.value) / 100);
        };
    }
}
ZVC.export(FilaOpacidadCapa);