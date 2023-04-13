class MapControls extends ZCustomController {
    g4init() {
        let lx = new luxon.DateTime({}, {zone: window.config.timeZone, locale: window.config.locale});        
        lx = lx.startOf("hour");
        lx.setLocale(window.config.locale);        
        window.g4.setTime(lx);
        this.refreshTime();

        window.g4.on("left-panel-opened", _ => {
            let w = window.g4.mainController.leftPanel.view.offsetWidth;
            this.controlsContainer.view.style.left = (10 + w) + "px";
        })
        window.g4.on("left-panel-closed", _ => {
            this.controlsContainer.view.style.left = "10px";
        })
        window.g4.on("layer-added", _ => {
            this.callRefreshLayers();
        })
        window.g4.on("layer-removed", _ => {
            this.callRefreshLayers();
        })
        window.g4.on("layer-status-change", async layer => {
            await this.layerStatusChange(layer);
        })
        window.g4.on("time-change", async _ => {
            this.refreshTime();
        })
        this.refreshLayers();
    }

    refreshTime() {
        this.lblDay.text = window.g4.time.toFormat("dd/MM/yyyy");
        this.lblHour.text = window.g4.time.toFormat("HH:mm");
    }

    onCmdZoomIn_click() {window.g4.mapController.zoomIn()}
    onCmdZoomOut_click() {window.g4.mapController.zoomOut()}

    async onCmdConfigLayers_click() {
        await window.g4.mainController.loadLeftPanel("main/config-panels/CapasActivas");
    }

    callRefreshLayers() {
        if (this.refreshLayersTimer) clearTimeout(this.refreshLayersTimer);
        this.refreshLayersTimer = setTimeout(_ => {
            this.refreshLayersTimer = null;
            this.refreshLayers();
        }, 100);
    }
    refreshLayers() {
        let layers = window.g4.getActiveGroup().layers;
        this.controlsContainer.view.style.height = (120 + layers.length * 35) + "px";
        this.layersContainer.refresh();
    }
    onLayersContainer_getRows() {
        return window.g4.getActiveGroup().layers;
    }
    async layerStatusChange(layer) {
        let controller = this.layersContainer.controllers.find(c => (c.layer.id == layer.id));
        if (!controller) return;
        controller.refreshStatus();
    }

    // Time
    async onCmdMonthPlus_click() {await window.g4.incTime({months:1})}
    async onCmdMonthMinus_click() {await window.g4.incTime({months:-1})}
    async onCmdDayPlus_click() {await window.g4.incTime({days:1})}
    async onCmdDayMinus_click() {await window.g4.incTime({days:-1})}
    async onCmdHourPlus_click() {await window.g4.incTime({hours:1})}
    async onCmdHourMinus_click() {await window.g4.incTime({hours:-1})}
    async onCmdMinutePlus_click() {await window.g4.incTime({minutes:15})}
    async onCmdMinuteMinus_click() {await window.g4.incTime({minutes:-15})}
}
ZVC.export(MapControls);