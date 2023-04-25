class OpacidadCapas extends ZCustomController {
    onThis_init() {
        this.rptLayers.refresh();
        this.refresher = _ => this.rptLayers.refresh();
    }
    onThis_activated() {
        window.g4.on("layers-reodered", this.refresher)
        window.g4.on("layer-added", this.refresher)
        window.g4.on("layer-removed", this.refresher)
    }
    onThis_deactivated() {
        window.g4.off("layers-reodered", this.refresher)
        window.g4.off("layer-added", this.refresher)
        window.g4.off("layer-removed", this.refresher)
    }
    onRptLayers_getRows() {
        let rows = [...window.g4.getActiveGroup().layers];
        rows.sort((l1, l2) => (l2.getOrder() - l1.getOrder()));
        return rows;
    }
}
ZVC.export(OpacidadCapas);