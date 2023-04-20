class Main extends ZCustomController {
    async onThis_init() {
        let cfg = await zPost("getConfig.portal");
        window.config = cfg;
        window.g4.createDefaultGroup();

        window.g4.mainController = this;
        window.g4.mapController = this.map;
        await this.map.g4init();
        window.g4.mapControls = this.controls;
        this.controls.g4init();

        this.leftOffsetCanvas = new bootstrap.Offcanvas(this.leftPanel.view);
        this.leftPanel.view.addEventListener("shown.bs.offcanvas", _ => window.g4.trigger("left-panel-opened"));
        this.leftPanel.view.addEventListener("hidden.bs.offcanvas", _ => window.g4.trigger("left-panel-closed"));
        this.leftPanelOpened = false;
        window.g4.on("left-panel-opened", _ => {this.leftPanelOpened = true})
        window.g4.on("left-panel-closed", _ => {this.leftPanelOpened = false})

        this.rightOffsetCanvas = new bootstrap.Offcanvas(this.rightPanel.view);

        // Capas Iniciales
        for (let layerDefinition of G4Layer.getDefaultLayerDefinition()) {
            let layer = G4Layer.createFromDefinition(layerDefinition);
            await window.g4.getActiveGroup().addLayer(layer);
        }
        for (let layer of window.g4.getLayers()) {
            await layer.g4init();
            await layer.refresh();
        }
    }

    onCmdCloseLeftPanel_click() {this.closeLeftPanel()}
    async loadLeftPanel(path, options, title, width = 350) {
        this.lblLeftPanelTitle.text = title;        
        this.leftPanelLoader.hide();
        this.leftPanel.view.style.width = width + "px";
        await this.leftPanelLoader.load(path, options);
        this.leftPanelLoader.show();
        this.leftOffsetCanvas.show();
    }
    closeLeftPanel() {
        this.leftOffsetCanvas.hide();
    }
}
ZVC.export(Main);