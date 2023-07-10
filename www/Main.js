class Main extends ZCustomController {
    async onThis_init() {
        window.addEventListener("resize", _ => this.onResize());
        let cfg = await zPost("getConfig.portal");
        window.config = cfg;
        window.g4.createDefaultGroup();

        window.g4.mainController = this;
        window.g4.mapController = this.map;
        await this.map.g4init();
        window.g4.mapControls = this.controls;
        this.controls.g4init();
        window.g4.analysisController = this.analysis;

        this.leftOffsetCanvas = new bootstrap.Offcanvas(this.leftPanel.view);
        this.leftPanel.view.addEventListener("shown.bs.offcanvas", _ => window.g4.trigger("left-panel-opened"));
        this.leftPanel.view.addEventListener("hidden.bs.offcanvas", _ => window.g4.trigger("left-panel-closed"));
        this.leftPanelOpened = false;
        window.g4.on("left-panel-opened", _ => {
            this.leftPanelOpened = true;
            let w = this.leftPanel.view.offsetWidth;
            this.controls.controlsContainer.view.style.left = (10 + w) + "px";
            this.controlsCollapser.view.style.left = (10 + w) + "px";
            this.hintPanel.view.style.left = (20 + w + this.controls.controlsContainer.view.offsetWidth) + "px";
        })
        window.g4.on("left-panel-closed", async _ => {
            this.leftPanelOpened = false;
            await this.leftPanelLoader.load("common/Empty", {});
            this.controls.controlsContainer.view.style.left = "10px";
            this.controlsCollapser.view.style.left = "10px";
            this.hintPanel.view.style.left = (20 + this.controls.controlsContainer.view.offsetWidth) + "px";
        })

        this.rightOffsetCanvas = new bootstrap.Offcanvas(this.rightPanel.view);
        this.rightPanel.view.addEventListener("shown.bs.offcanvas", _ => window.g4.trigger("right-panel-opened"));
        this.rightPanel.view.addEventListener("hidden.bs.offcanvas", _ => window.g4.trigger("right-panel-closed"));
        this.rightPanelOpened = false;
        window.g4.on("right-panel-opened", _ => {
            this.rightPanelOpened = true
            this.callRefreshScalesAndProperties();
        })
        window.g4.on("right-panel-closed", _ => {
            window.g4.mapController.setPropertiesPoint();
            this.lastClickedEvent = null;
            this.rightPanelOpened = false;
            this.callRefreshScalesAndProperties();
        })

        this.bottomOffsetCanvas = new bootstrap.Offcanvas(this.bottomPanel.view);
        this.bottomPanel.view.addEventListener("shown.bs.offcanvas", _ => {
            window.g4.trigger("analysis-panel-opened");
            this.analysis.showContent();
            this.bottomPanelOpened = true;
        });
        this.bottomPanel.view.addEventListener("hidden.bs.offcanvas", _ => {
            window.g4.trigger("analysis-panel-closed");
            this.bottomPanelOpened = false;
        });
        this.bottomPanelOpened = false;
        this.bottomPanelMaximized = false;

        window.g4.on("map-click", e => this.onMapClick(e));
        window.g4.on("map-mouse-move", e => this.onMapMouseMove(e));

        this.rightOffsetCanvas = new bootstrap.Offcanvas(this.rightPanel.view);

        this.hintPanel.hide();
        this.hintPanelOpened = false;

        // Refrescado de Escalas
        window.g4.on("layer-added", _ => this.callRefreshScalesAndProperties())
        window.g4.on("layer-removed", _ => this.callRefreshScalesAndProperties())
        window.g4.on("layer-status-change", _ => this.callRefreshScalesAndProperties())
        window.g4.on("color-scale-changed", _ => this.callRefreshScalesAndProperties())

        // Map Controls Status
        this.controlsExpanded = true;

        // Preleer estaciones (asíncrono)
        window.g4.leeCacheEstaciones();

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

    onCmdChartsOpener_click() {
        this.toggleBottomPanel();
    }
    onAnalysis_close() {
        this.closeBottomPanel();
    }
    onAnalysis_toggleExpanded() {
        this.bottomPanelMaximized = !this.bottomPanelMaximized;
        this.onResize();
        this.analysis.showMaximized(this.bottomPanelMaximized);
    }    
    toggleBottomPanel() {
        if (!this.bottomPanelOpened) {
            let h = window.innerHeight;
            if (!this.bottomPanelMaximized) h /= 2;
            this.bottomPanel.view.style.height = h + "px";
            this.bottomOffsetCanvas.show();
            this.analysis.showMaximized(this.bottomPanelMaximized);
        } else {
            this.closeBottomPanel();
        }
    }
    async openBottomPanel() {
        if (this.bottomPanelOpened) return;
        await this.toggleBottomPanel();
    }
    closeBottomPanel() {
        this.bottomOffsetCanvas.hide();
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
        if (this.objectAtPointTimer) clearTimeout(this.objectAtPointTimer);
        this.objectAtPointTimer = setTimeout(_ => {
            this.objectAtPointTimer = null;
            this.showObjectAtPoint(e.latlng.lat, e.latlng.lng);
        }, 100);
    }
    async onMapClick(e) {
        this.lastClickedEvent = e;
        let title = this.showLatLng(e.latlng.lat, e.latlng.lng);
        let found = [];
        for (let l of window.g4.getLayersFromTop()) {
            let element = l.elementAtPoint(e.latlng.lat, e.latlng.lng);
            if (element) {
                if (Array.isArray(element)) found.push(...element);
                else found.push(element); 
            }
        }
        let panels = [], values = [];
        for (let element of found) {
            if (element.type == "feature") {
                panels.push({panel:"./details-panels/FeatureProperties", panelOptions:{element}, title:element.layer.name, opened: true})
            } else if (element.type == "value") {
                element.coords = {lat:e.latlng.lat, lng:e.latlng.lng};
                values.push(element);
                panels.push({panel:"./details-panels/ScaleValue", panelOptions:{element}, title:element.layer.name, opened: true})
            } else if (element.type == "vector") {
                values.push(element);
                panels.push({panel:"./details-panels/VectorValue", panelOptions:{element}, title:element.layer.name, opened: true})
            } else if (element.type == "barb") {
                values.push(element);
                panels.push({panel:"./details-panels/BarbValue", panelOptions:{element}, title:element.layer.name, opened: true})
            } else if (element.type == "sample") {
                values.push(element);
                panels.push({panel:"./details-panels/StationValues", panelOptions:{element}, title:element.station.name, opened: true})
                panels.push({panel:"./details-panels/ObjectDetails", panelOptions:{element}, title:"Estación: " + element.station.name, opened: true})
            } else if (element.type == "user-object") {
                values.push(element);
                panels.push({panel:"./details-panels/ObjectDetails", panelOptions:{element}, title:element.subtype + ": " + element.name, opened: true})
            }
        }
        if (panels.length) {
            window.g4.mapController.setPropertiesPoint(e.latlng.lat, e.latlng.lng, values);
            await this.loadRightPanel("main/MultiPanelsLoader", {panels}, title);
        } else {
            this.closeRightPanel();
        }
    }

    showObjectAtPoint(lat, lng) {
        let found = [];
        let layers = window.g4.getLayersFromTop();
        for (let l of layers) {
            let element = l.elementAtPoint(lat, lng);
            if (element) {
                if (Array.isArray(element)) found.push(...element);
                else found.push(element); 
            }
        }
        if (!found.length) {
            window.g4.mapController.setObjectAtPoint();
            return;
        }
        let st = "", values = [];        
        for (let e of found) {
            if (e.type == "feature") {
                if (st.length) st += "\n";
                st += e.layer.name;
                if (e.feature.properties && e.feature.properties.name) {                    
                    st += ":\n  => " + e.feature.properties.name;
                } else if (e.feature.geometry && e.feature.geometry.properties && e.feature.geometry.properties.name) {
                    st += ":\n  => " + e.feature.geometry.properties.name;
                }        
            } else if (e.type == "value") {
                values.push(e);
                if (st.length) st += "\n";
                st += e.layer.name;
                st += ":\n  => " + e.label;
            } else if (e.type == "sample") {
                values.push(e);
                if (st.length) st += "\n";
                st += e.title
                if (e.label) {
                    st += ":\n  => " + e.label;
                }
            } else if (e.type == "vector" || e.type == "barb") {
                values.push(e);
                if (st.length) st += "\n";
                st += e.layer.name;
                st += ":\n  => " + e.label;
            } else if (e.type == "user-object") {
                if (st.length) st += "\n";
                st += "Objeto: " + e.name;
            }
        }
        window.g4.mapController.setObjectAtPoint(lat, lng, st, values);
    }

    callRefreshScalesAndProperties() {
        if (this.refreshScalesTimer) clearTimeout(this.refreshScalesTimer);
        this.refreshScalesTimer = setTimeout(_ => {
            this.refreshScalesTimer = null;
            this.refreshScales();
            if (this.lastClickedEvent) this.onMapClick(this.lastClickedEvent);
        }, 50);
    }
    refreshScales() {
        let layers = window.g4.getLayers();
        let scales = layers.reduce((list, layer) => {
            list.push(...(layer.activeColorScales || []));
            return list;
        }, []);
        window.g4.mapController.setActiveScales(scales);
    }    

    onResize() {
        if (this.bottomPanelOpened) {
            let h = window.innerHeight;
            if (!this.bottomPanelMaximized) h /= 2;
            this.bottomPanel.view.style.height = h + "px";
            this.analysis.resize();
        }
    }

    // Hints - Interceptors
    showHint(html, linkActions, clickInterceptor) {
        this.hintPanel.html = html;
        this.hintPanel.findAll(".hint-link").forEach(l => {
            l.addEventListener("click", _ => {
                let code = l.getAttribute("data-code");
                let action = linkActions[code];
                if (action) action();
            })
        })
        if (clickInterceptor) {
            window.g4.on("map-click-interceptor", point => {
                window.g4.removeAll("map-click-interceptor");
                clickInterceptor(point);
            })
        }
        this.hintPanel.show();
    }
    cancelHint() {
        window.g4.removeAll("map-click-interceptor");
        this.hintPanel.hide();
        this.hintPanel.html = "";
    }
    closeHint() {this.cancelHint()}
}
ZVC.export(Main);