class FilaCapa extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        this.refreshStatus();
        this.cursorInside = false;
        this.mouseDown = false;
        this.dragging = false;
        this.lblLayerName.view.addEventListener("mousedown", e => {
            this.mouseDown = true;
        })
        this.lblLayerName.view.addEventListener("mouseup", e => {
            this.mouseDown = false;
        })
        this.lblLayerName.view.addEventListener("mousemove", e => {
            if (this.mouseDown && !this.dragging) {
                this.dragging = true;
                this.y0 = e.pageY;
                this.triggerEvent("dragStart", this);
            }
        })
    }

    refreshName() {
        let st = this.layer.name;
        if (this.layer.levels) {
            st += " [" + this.layer.levels[this.layer.levelIndex] + "]";
        }
        this.lblLayerName.text = st;
    }
    refreshStatus() {
        this.refreshName();
        let s = this.layer.getStatus();
        let icon = "fa-regular fa-circle-question";
        if (s == "working") icon = "fas fa-spin fa-spinner";
        else if (s == "data") icon = "fa-regular fa-circle-check";
        else if (s == "error") icon = "fa-solid fa-circle-exclamation text-danger";
        let iconStatus = this.find("#iconStatus");
        iconStatus.className = icon;
    }

    onCmdLayerConfig_click() {
        this.triggerEvent("layerConfig", this.layer);
    }
}
ZVC.export(FilaCapa);