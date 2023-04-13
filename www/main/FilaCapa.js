class FilaCapa extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        this.lblLayerName.text = this.layer.name;
        this.refreshStatus();
    }

    refreshStatus() {
        let s = this.layer.getStatus();
        let icon = "fa-regular fa-circle-question";
        if (s == "working") icon = "fas fa-spin fa-spinner";
        else if (s == "data") icon = "fa-regular fa-circle-check";
        else if (s == "error") icon = "fa-solid fa-circle-exclamation text-danger";
        let iconStatus = this.find("#iconStatus");
        iconStatus.className = icon;
    }
}
ZVC.export(FilaCapa);