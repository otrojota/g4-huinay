class MapControls extends ZCustomController {
    g4init() {
        this.setExpanded();

        let lx = new luxon.DateTime({}, {zone: window.config.timeZone, locale: window.config.locale});        
        lx = lx.startOf("hour");
        lx.setLocale(window.config.locale);        
        window.g4.setTime(lx, 0);
        this.refreshTime();

        window.g4.on("layer-added", _ => {
            this.callRefreshLayers();
        })
        window.g4.on("layer-removed", _ => {
            this.callRefreshLayers();
        })
        window.g4.on("layer-renamed", _ => {
            this.callRefreshLayers();
        })
        window.g4.on("layer-status-change", async layer => {
            await this.layerStatusChange(layer);
        })
        window.g4.on("time-change", async _ => {
            this.refreshTime();
        })

        this.layersContainer.view.addEventListener("mousemove", e => {
            if (this.draggingElement) {
                let y = e.pageY;
                this.draggingElement.style.top = (this.draggingY0 + (y - this.draggingMouseY0)) + "px";
                let cy = e.clientY - this.layersContainer.view.offsetTop;
                let dragPosIdx = parseInt((cy -15) / 35);
                let n = this.layersContainer.controllers.length;
                if (dragPosIdx < 0) dragPosIdx = 0;
                if (dragPosIdx >= n) dragPosIdx = n-1;
                if (dragPosIdx != this.dragPosIdx) {
                    this.dragPosIdx = dragPosIdx;
                    for (let fila of this.layersContainer.controllers) {
                        fila.filaContainer.view.classList.remove("drop-target");
                    }                    
                    this.layersContainer.controllers[this.dragPosIdx].filaContainer.view.classList.add("drop-target");
                }
            }
        });
        this.layersContainer.view.addEventListener("mouseup", e => {
            if (!this.draggingElement) return;
            if (this.dragPosIdx >= 0 && this.dragPosIdx < this.layersContainer.controllers.length && this.dragPosIdx != this.draggingIndex) {
                let n = this.layersContainer.controllers.length - 1;
                window.g4.getActiveGroup().reorderLayer(n - this.draggingIndex, n - this.dragPosIdx);
            }
            this.draggingElement = null;
            this.refreshLayers();
        });
        this.layersContainer.view.addEventListener("mouseleave", e => {
            return;
            if (this.draggingElement) {
                this.draggingElement = null;
                this.dragPosIdx = -1;
                this.refreshLayers();
            }
        });
        this.refreshLayers();
    }

    setExpanded() {this.controlsContainer.addClass("expanded")}
    setCollapsed() {this.controlsContainer.removeClass("expanded")}

    refreshTime() {
        this.lblDay.text = window.g4.time.toFormat("dd/MM/yyyy");
        this.lblHour.text = window.g4.time.toFormat("HH:mm");
    }

    onCmdZoomIn_click() {window.g4.mapController.zoomIn()}
    onCmdZoomOut_click() {window.g4.mapController.zoomOut()}

    async onCmdConfigLayers_click() {
        await window.g4.mainController.loadLeftPanel("main/MultiPanelsLoader", {
            panels:[{
                panel:"./config-panels/OpacidadCapas", panelOptions:{}, title:"Opacidad Capas", opened:true
            }, {                
                panel:"./config-panels/MapaBase", panelOptions:{}, title:"Mapa Base", opened:false
            }]
        }, "Capas Activas");
    }

    onCmdAddLayer_click() {
        this.showDialog("./WAddLayer", {}, async layerDef => {
            if (layerDef.stations) {
                await this.addStations(layerDef);
                return;
            }
            let layer = G4Layer.createFromDefinition(layerDef);
            await window.g4.getActiveGroup().addLayer(layer);
            await layer.g4init();
            layer.refresh();
        })
    }

    async addStations(stationsLayerDef) {
        let layer = stationsLayerDef.layer == "_new_"?
            await window.g4.getActiveGroup().createStationsLayer()
            :window.g4.getActiveGroup().getLayer(stationsLayerDef.layer);
        await layer.addStations(stationsLayerDef.stations);
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
        this.layersContainer.view.style.height = (layers.length * 35) + "px";
        this.layersContainer.refresh();
    }
    onLayersContainer_getRows() {
        let rows = [...window.g4.getActiveGroup().layers];
        rows.sort((l1, l2) => (l2.getOrder() - l1.getOrder()));
        return rows;
    }
    async layerStatusChange(layer) {
        let controller = this.layersContainer.controllers.find(c => (c.layer.id == layer.id));
        if (!controller) return;
        controller.refreshStatus();
    }
    async onLayersContainer_layerConfig(layer) {
        let panels = [{panel:"./config-panels/PropCapa", panelOptions:{layer}, title:"Propiedades", opened: true}]
        if (layer.type == "raster") {
            if (layer.config.shader) {
                panels.push({panel:"./config-panels/RasterShader", panelOptions:{layer}, title:"Visualizador: Shader", opened: layer.config.shader.active})
            }
            if (layer.config.isolines) {
                panels.push({panel:"./config-panels/RasterIsolineas", panelOptions:{layer}, title:"Visualizador: Isolineas", opened: layer.config.isolines.active})
            }
            if (layer.config.isobands) {
                panels.push({panel:"./config-panels/RasterIsobandas", panelOptions:{layer}, title:"Visualizador: Isobandas", opened: layer.config.isobands.active})
            }
            if (layer.config.particles) {
                panels.push({panel:"./config-panels/RasterParticulas", panelOptions:{layer}, title:"Visualizador: Partículas", opened: layer.config.particles.active})
            }
            if (layer.config.vectors) {
                panels.push({panel:"./config-panels/RasterVectores", panelOptions:{layer}, title:"Visualizador: Vectores", opened: layer.config.vectors.active})
            }
            if (layer.config.barbs) {
                panels.push({panel:"./config-panels/RasterBarbas", panelOptions:{layer}, title:"Visualizador: Barbas", opened: layer.config.barbs.active})
            }
        } else if (layer.type == "geojson") {
            panels.push({panel:"./config-panels/GeoJsonColors", panelOptions:{layer}, title:"Color Elementos", opened: true})
        } else if (layer.type == "stations") {
            panels.push({panel:"./config-panels/StationsColors", panelOptions:{layer}, title:"Color Estaciones", opened: false})
            panels.push({panel:"./config-panels/StationsScale", panelOptions:{layer}, title:"Monitorear Variable", opened: true})
            panels.push({panel:"./config-panels/EditarEstaciones", panelOptions:{layer}, title:"Editar Estaciones", opened: false})
        }
        await window.g4.mainController.loadLeftPanel("main/MultiPanelsLoader", {panels}, layer.name);
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

    // Reorder layers
    onLayersContainer_dragStart(fila) {
        let left = fila.view.offsetLeft; // rect.left + window.scrollX;
        let top = fila.view.offsetTop;   // rect.top + window.scrollY;
        fila.view.style.opacity = "0.2";
        this.dragging = fila;
        this.draggingY0 = top;
        this.draggingMouseY0 = fila.y0;
        this.draggingIndex = fila.repeaterIndex;
        this.draggingElement = document.createElement("div");
        this.layersContainer.view.appendChild(this.draggingElement);
        this.draggingElement.id = "dragFila";
        this.draggingElement.innerHTML = fila.view.innerHTML;
        this.draggingElement.style.position = "absolute";
        this.draggingElement.style.left = left + "px";
        this.draggingElement.style.top = top + "px";
        this.draggingElement.style.width = fila.view.offsetWidth + "px";
        this.draggingElement.style.height = fila.view.offsetHeight + "px";
        this.draggingElement.style["z-index"] = "99999";
        this.dragPosIdx = -1;
    }
}
ZVC.export(MapControls);