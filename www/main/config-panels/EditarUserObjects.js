class EditarUserObjects extends ZCustomController {
    onThis_init(options) {
        if (options && options.layer) {
            this.refresh(options.layer);        
        }
        this.layerChangedListener = _ => this.refreshObjects();
    }

    onThis_activated() {
        window.g4.on("layer-struct-change", this.layerChangedListener);
    }
    onThis_deactivated() {
        window.g4.off("layer-struct-change", this.layerChangedListener);
        window.g4.mainController.cancelHint();
    }

    refresh(layer) {
        this.layer = layer;
        this.refreshObjects();        
    }

    refreshObjects() {
        console.log("refreshObjects");
    }

    onCmdAgregarPunto_click() {
        window.g4.mainController.showHint(
            `Seleccione en el mapa la ubicación del Punto que desea agregar
            o haga click <a class="hint-link btn-link" data-code="cancel">Acá</a> para cancelar`,
            {cancel:_ => window.g4.mainController.cancelHint()},
            point => {
                window.g4.mainController.closeHint();
                this.agregaPunto(point.latlng);
            }
        )
    }

    agregaPunto(latlng) {
        this.layer.addDefaultPoint(latlng);
    }
}
ZVC.export(EditarUserObjects);