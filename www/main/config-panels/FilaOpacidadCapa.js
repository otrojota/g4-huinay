class FilaOpacidadCapa extends ZCustomController {
    onThis_init(layer) {
        if (layer) {
            this.layer = layer;
            this.lblNombreCapa.text = layer.name;
            this.refresh(layer);        
        } else {
            this.lblNombreCapa.text = "Opacidad de la Capa";
        }
    }

    refresh(layer) {
        this.layer = layer;
        this.edOpacidad.value = layer.getOpacity() * 100;
        this.edOpacidad.view.oninput = e => {
            this.layer.setOpacity(parseInt(this.edOpacidad.value) / 100);
        };
    }
}
ZVC.export(FilaOpacidadCapa);