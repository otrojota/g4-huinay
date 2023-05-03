class PropCapa extends ZCustomController {
    onThis_init(options) {
        this.layer = options.layer;
        this.edName.value = this.layer.name;
        this.edOpacidad.refresh(options.layer);
        if (this.layer.levels) {
            this.filaLevels.show();
            this.edLevel.setRows(
                this.layer.levels.map((l, idx) => ({index:idx, name:l})),
                this.layer.levelIndex
            )
        } else {
            this.filaLevels.hide();
        }
    }

    async onEdName_change() {
        if (!this.edName.value.trim()) return;
        this.layer.name = this.edName.value.trim();
        await window.g4.trigger("layer-renamed", this.layer);
    }
    onCmdDeleteLayer_click() {
        this.showDialog("common/WConfirm", {message:"¿Confirma que desea quitar la capa '" + this.layer.name + "'?"}, async _ => {
            window.g4.getActiveGroup().removeLayer(this.layer);
            window.g4.mapController.map.removeLayer(this.layer);
            await this.layer.g4destroy();
            await window.g4.mainController.closeLeftPanel();
        })
    }
    onEdLevel_change() {this.layer.levelIndex = parseInt(this.edLevel.value)}
}
ZVC.export(PropCapa);