class EditarEstaciones extends ZCustomController {
    onThis_init(options) {
        this.layer = options.layer;
        this.refrescaEstaciones();
        this.layerStatusListener = l => {
            if (l.id == this.layer.id) this.refrescaEstaciones()
        }
    }
    onThis_activated() {
        window.g4.on("layer-status-change", this.layerStatusListener)
    }
    onThis_deactivated() {
        window.g4.off("layer-status-change", this.layerStatusListener)
    }

    refrescaEstaciones() {
        let layers = [], addedGroups = {};
        for (let s of this.layer.stations) {
            if (!addedGroups[s.group.code]) {
                addedGroups[s.group.code] = true;
                layers.push(s.group);
            }
        }
        layers.sort((l1, l2) => (l1.name > l2.name?1:-1));
        let html = "<ul style='list-style-type: none; padding-left: 4px;'>";
        for (let layer of layers) {
            let stations = this.layer.stations.filter(s => s.group.code == layer.code);
            if (stations.length) {
                stations.sort((s1, s2) => (s1.lat < s2.lat?1:-1));
                html += "<li class='collapsible-tree-group stations-layer' data-layer-code='" + layer.code + "'>";
                html += "  <i class='fas fa-chevron-right me-2 clickable-icon clickable-expander'></i>";
                html += "  <i class='fa-regular fa-square me-2 clickable-icon stations-selector'></i>";
                html += "  " + layer.name;
                html += "  <ul class='collapsible-tree-content' style='list-style-type: none; font-size: small; '>";
                for (let station of stations) {
                    html += "<li class='station-row' data-station-code='" + station.code + "'>";
                    html += "  <i class='fa-regular fa-square clickable-icon station-selector mt-1' ></i>";
                    html += "  <a href='#' class='btn btn-link py-0 px-2 station-name text-start' style='font-size: small;' >" + station.name + "</a>";
                    html += "</li>";
                }
                html += "  </ul>";
                html += "</li>"
            }
        }
        html += "</ul>";
        this.stationsContainer.html = html;
        // Expanders
        this.stationsContainer.findAll(".clickable-expander").forEach(i => {
            i.onclick = _ => {
                let li = i.parentNode;
                let ul = li.querySelector("ul");
                if (i.classList.contains("expanded")) {
                    i.classList.remove("expanded");
                    ul.classList.remove("expanded");
                } else {
                    i.classList.add("expanded");
                    ul.classList.add("expanded");
                }
            }
        })
        // Seleccion unitaria
        this.stationsContainer.findAll(".station-selector").forEach(i => {
            i.onclick = _ => {
                if (i.classList.contains("fa-square-check")) {
                    i.classList.remove("fa-square-check");
                    i.classList.add("fa-square");
                } else {
                    i.classList.add("fa-square-check");
                    i.classList.remove("fa-square");
                }
                this.chequeaEliminarEstaciones();
            }
        })
        this.stationsContainer.findAll(".station-name").forEach(a => {
            a.onclick = _ => {
                let i = a.parentNode.querySelector("i");
                if (i.classList.contains("fa-square-check")) {
                    i.classList.remove("fa-square-check");
                    i.classList.add("fa-square");
                } else {
                    i.classList.add("fa-square-check");
                    i.classList.remove("fa-square");
                }
                this.chequeaEliminarEstaciones();
            }
        })
        this.chequeaEliminarEstaciones();
        // Seleccion multiple
        this.stationsContainer.findAll(".stations-selector").forEach(i => {
            i.onclick = _ => {
                if (i.classList.contains("fa-square-check")) {
                    this.unselectAllStations(i.parentNode);
                } else {
                    this.selectAllStations(i.parentNode);
                }
                this.chequeaEliminarEstaciones();
            }
        })
    }

    chequeaEliminarEstaciones() {
        this.selectedStations = []; // {layerCode, stationCode}
        this.stationsContainer.findAll(".stations-layer").forEach(layerLI => {
            let nSeleccionadasEnCapa=0, nTotalEnCapa=0;
            let layerCode = layerLI.getAttribute("data-layer-code");
            layerLI.querySelectorAll(".station-row").forEach(stationLI => {
                let stationCode = stationLI.getAttribute("data-station-code");
                let i = stationLI.querySelector("i");
                if (i.classList.contains("fa-square-check")) {
                    this.selectedStations.push({layerCode, stationCode});
                    nSeleccionadasEnCapa++;
                    nTotalEnCapa++;
                } else {
                    nTotalEnCapa++;
                }
            })
            let i = layerLI.querySelector(".stations-selector");
            if (nSeleccionadasEnCapa < nTotalEnCapa) {                
                if (i.classList.contains("fa-square-check")) {
                    i.classList.remove("fa-square-check");
                    i.classList.add("fa-square");
                }
            } else {
                if (i.classList.contains("fa-square")) {
                    i.classList.remove("fa-square");
                    i.classList.add("fa-square-check");
                }
            }
        });
        this.find("#lblEliminarEstaciones").innerText = this.selectedStations.length;
        if (!this.selectedStations.length) {
            this.cmdEliminarEstaciones.disable();
        } else {
            this.cmdEliminarEstaciones.enable();
        }
    }

    selectAllStations(layerLI) {
        layerLI.querySelectorAll(".station-row").forEach(stationLI => {
            let i = stationLI.querySelector("i");
            if (i.classList.contains("fa-square")) {
                i.classList.remove("fa-square");
                i.classList.add("fa-square-check");
            }
        })
    }
    unselectAllStations(layerLI) {
        layerLI.querySelectorAll(".station-row").forEach(stationLI => {
            let i = stationLI.querySelector("i");
            if (i.classList.contains("fa-square-check")) {
                i.classList.remove("fa-square-check");
                i.classList.add("fa-square");
            }
        })
    }

    onCmdEliminarEstaciones_click() {
        if (!this.selectedStations || !this.selectedStations.length) return;
        this.showDialog("common/WConfirm", {message:"¿Confirma que desea eliminar las estaciones seleccionadas?"}, _ => {
            this.layer.removeStations(this.selectedStations.map(s => (s.stationCode)));
        })        
    }
    onCmdAgregarEstaciones_click() {
        this.showDialog("main/WAddLayer", {action: "add-stations", toLayer:this.layer}, res => {
            this.layer.addStations(res.stations);
        });
    }
}
ZVC.export(EditarEstaciones);