class OpacidadCapas extends ZCustomController {
    onThis_init() {
        this.rptLayers.refresh();
        window.g4.on("layers-reodered", _ => this.rptLayers.refresh())
    }
    onRptLayers_getRows() {
        let rows = [...window.g4.getActiveGroup().layers];
        rows.sort((l1, l2) => (l2.getOrder() - l1.getOrder()));
        return rows;
    }
}
ZVC.export(OpacidadCapas);