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
        window.g4.on("left-panel-opened", _ => {
            this.leftPanelOpened = true;
            let w = this.leftPanel.view.offsetWidth;
            this.controls.controlsContainer.view.style.left = (10 + w) + "px";
            this.controlsCollapser.view.style.left = (10 + w) + "px";
        })
        window.g4.on("left-panel-closed", async _ => {
            this.leftPanelOpened = false;
            await this.leftPanelLoader.load("common/Empty", {});
            this.controls.controlsContainer.view.style.left = "10px";
            this.controlsCollapser.view.style.left = "10px";
        })

        this.rightOffsetCanvas = new bootstrap.Offcanvas(this.rightPanel.view);
        this.rightPanel.view.addEventListener("shown.bs.offcanvas", _ => window.g4.trigger("right-panel-opened"));
        this.rightPanel.view.addEventListener("hidden.bs.offcanvas", _ => window.g4.trigger("right-panel-closed"));
        this.rightPanelOpened = false;
        window.g4.on("left-panel-opened", _ => this.rightPanelOpened = true)
        window.g4.on("left-panel-closed", _ => this.rightPanelOpened = false)

        window.g4.on("map-click", e => this.onMapClick(e));
        window.g4.on("map-mouse-move", e => this.onMapMouseMove(e));

        this.rightOffsetCanvas = new bootstrap.Offcanvas(this.rightPanel.view);

        // Map Controls Status
        this.controlsExpanded = true;

        // Capas Iniciales
        for (let layerDefinition of G4Layer.getDefaultLayerDefinition()) {
            let layer = G4Layer.createFromDefinition(layerDefinition);
            await window.g4.getActiveGroup().addLayer(layer);
        }
        let promises = [];
        for (let layer of window.g4.getLayers()) {
            promises.push(
                new Promise(async (resolve, reject) => {
                    try {
                        await layer.g4init();
                        await layer.refresh();            
                    } catch(error) {
                        reject(error);
                    }
                })
            );
        }
        await Promise.all(promises);
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

    onCmdCloseRightPanel_click() {this.closeRightPanel()}
    async loadRightPanel(path, options, title, width = 350) {
        this.lblRightPanelTitle.text = title;        
        this.rightPanelLoader.hide();
        this.rightPanel.view.style.width = width + "px";
        await this.rightPanelLoader.load(path, options);
        this.rightPanelLoader.show();
        this.rightOffsetCanvas.show();
    }
    closeRightPanel() {
        this.rightOffsetCanvas.hide();
    }

    onCmdControlsCollapser_click() {
        if (this.controlsExpanded) {
            this.controls.setCollapsed();
            this.controlsCollapser.addClass("collapsed");
            this.find("#controlsExpandedIcon").classList.remove("expanded");
            setTimeout(_ => {
                this.controls.hide();
                this.controlsExpanded = false;
            }, 500);
        } else {
            this.controlsCollapser.removeClass("collapsed");
            this.controls.show();
            setTimeout(_ => {
                this.controls.setExpanded();
                this.find("#controlsExpandedIcon").classList.add("expanded");
                this.controlsExpanded = true;    
            }, 10);
        }
    }

    showLatLng(lat, lng) {
        let st = "[" + Math.abs(lat).toFixed(2) + " °" + (lat < 0?"S":"N") + " - " + Math.abs(lng).toFixed(2) + " °" + (lng < 0?"W":"E") + "]";
        this.lblCollapserLabel.text = st;
        return st;
    }
    onMapMouseMove(e) {
        this.showLatLng(e.latlng.lat, e.latlng.lng);
    }
    async onMapClick(e) {
        let title = this.showLatLng(e.latlng.lat, e.latlng.lng);
        let found = [];
        for (let l of window.g4.getLayersFromTop()) {
            let element = l.mapClick(e);
            if (element) found.push(element); 
        }
        if (!found.length) {
            this.closeRightPanel();
            return;
        }
        let panels = [];
        for (let element of found) {
            if (element.type == "feature") {
                panels.push({panel:"./details-panels/FeatureProperties", panelOptions:{element}, title:element.layer.name, opened: true})
            }
        }
        await this.loadRightPanel("main/MultiPanelsLoader", {panels}, title);
    }


}
ZVC.export(Main);