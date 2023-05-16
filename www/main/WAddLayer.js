const layerIcons = {
    geojson: "fas fa-draw-polygon",
    raster: "fas fa-bacon"
}
class WAddLayer extends ZDialog {
    onThis_init() {
        let h = window.innerHeight * 4/5 - 200;
        if (h < 200) h = 200;
        this.layersContainer.view.style["max-height"] = h + "px";
        this.geojsonContainer.view.style["max-height"] = h + "px";
        this.stationsContainer.view.style["max-height"] = h + "px";
        this.edTipoEstacion.setRows(window.config.stationTypes);
        let capasEstaciones = window.g4.getLayers().filter(l => l.type == "stations");
        capasEstaciones.splice(0,0,{id:"_new_", name:"Crear Nueva Capa de Estaciones"});
        this.edCapaEstaciones.setRows(capasEstaciones);
        setTimeout(_ => this.edSearch.edSearch.view.focus(), 500);
        this.refresh();
    }
    onCmdCloseDialog_click() {this.cancel()}

    onEdSearch_change() {this.refresh()}
    onEdTipoEstacion_change() {this.refrescaEstaciones()}
    refresh() {
        let filtro = this.edSearch.value.toLowerCase();
        let layers =  window.config.layers.filter(l => {
            if (l.type != "raster" && l.type != "geojson") return false;
            if (!filtro) return true;
            if (l.name.toLowerCase().indexOf(filtro) >= 0) return true;
            let group = window.config.layerGroups[l.group];
            if (!group) {
                console.error("No se encontró el grupo '" + l.group + "' definido en la capa '" + l.name + "'")
            }
            if (group.toLowerCase().indexOf(filtro) >= 0) return true;
            return false;
        })
        let groups = layers.reduce((list, l) => {
            if (list.findIndex(g => g.code == l.group) < 0) {
                list.push({code: l.group, name: window.config.layerGroups[l.group]})
            }
            return list;
        }, []);
        groups.sort((g1, g2) => (g1.name > g2.name?1:-1));
        // Variables
        let html = "<ul style='list-style-type: none; padding-left: 4px;'>";
        for (let group of groups) {
            let groupLayers = layers.filter(l => l.group == group.code && l.type == "raster");
            if (groupLayers.length) {
                groupLayers.sort((l1, l2) => (l1.name > l2.name?1:-1));
                html += "<li>";
                html += "  <i class='fas fa-folder me-2'></i>";
                html += "  " + group.name;            
                html += "  <ul>";
                for (let layer of groupLayers) {
                    html += "<li>";
                    html += "  <i class='" + layerIcons[layer.type] + "'></i>";
                    html += "  <a href='#' class='btn btn-link py-0 px-2' data-code='" + layer.code + "'>" + layer.name + "</a>";
                    html += "</li>";
                }
                html += "  </ul>";
                html += "</li>"
            }
        }
        html += "</ul>";
        this.layersContainer.html = html;
        this.layersContainer.findAll(".btn-link").forEach(a => {
            a.onclick = _ => this.close(layers.find(l => (l.code == a.getAttribute("data-code"))));            
        })
        // GeoJSON
        html = "<ul style='list-style-type: none; padding-left: 4px;'>";
        for (let group of groups) {
            let groupLayers = layers.filter(l => l.group == group.code && l.type == "geojson");
            if (groupLayers.length) {
                groupLayers.sort((l1, l2) => (l1.name > l2.name?1:-1));
                html += "<li>";
                html += "  <i class='fas fa-folder me-2'></i>";
                html += "  " + group.name;            
                html += "  <ul>";
                for (let layer of groupLayers) {
                    html += "<li>";
                    html += "  <i class='" + layerIcons[layer.type] + "'></i>";
                    html += "  <a href='#' class='btn btn-link py-0 px-2' data-code='" + layer.code + "'>" + layer.name + "</a>";
                    html += "</li>";
                }
                html += "  </ul>";
                html += "</li>"
            }
        }
        html += "</ul>";
        this.geojsonContainer.html = html;
        this.geojsonContainer.findAll(".btn-link").forEach(a => {
            a.onclick = _ => this.close(layers.find(l => (l.code == a.getAttribute("data-code"))));            
        })

        this.refrescaEstaciones();
    }

    refrescaEstaciones() {
        let selectedStationType = this.edTipoEstacion.value;
        let filtro = this.edSearch.value.toLowerCase();
        let layers =  g4.stationLayers.filter(l => {
            if (l.config.stationType != selectedStationType) return false;
            if (!filtro) return true;
            if (l.name.toLowerCase().indexOf(filtro) >= 0) return true;
            for (let s of l.stations) {
                if (s.name.toLowerCase().indexOf(filtro) >= 0) return true;
            }            
            return false;
        })
        layers.sort((l1, l2) => (l1.name > l2.name?1:-1));
        let html = "<ul style='list-style-type: none; padding-left: 4px;'>";
        for (let layer of layers) {
            let stations = layer.stations;
            if (filtro && layer.name.toLowerCase().indexOf(filtro) < 0) stations = stations.filter(s => (s.name.toLowerCase().indexOf(filtro) >= 0));
            if (stations.length) {
                stations.sort((s1, s2) => (s1.lat < s2.lat?1:-1));
                html += "<li class='collapsible-tree-group stations-layer' data-layer-code='" + layer.code + "'>";
                html += "  <i class='fas fa-chevron-right me-2 clickable-icon clickable-expander'></i>";
                html += "  <i class='fa-regular fa-square me-2 clickable-icon stations-selector'></i>";
                html += "  " + layer.name;
                html += "  <ul class='collapsible-tree-content' style='list-style-type: none;'>";
                for (let station of stations) {
                    html += "<li class='station-row' data-station-code='" + station.code + "'>";
                    html += "  <i class='fa-regular fa-square clickable-icon station-selector' ></i>";
                    html += "  <a href='#' class='btn btn-link py-0 px-2 station-name text-start'>" + station.name + "</a>";
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
                this.chequeaAgregarEstaciones();
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
                this.chequeaAgregarEstaciones();
            }
        })
        this.chequeaAgregarEstaciones();
        // Seleccion multiple
        this.stationsContainer.findAll(".stations-selector").forEach(i => {
            i.onclick = _ => {
                if (i.classList.contains("fa-square-check")) {
                    this.unselectAllStations(i.parentNode);
                } else {
                    this.selectAllStations(i.parentNode);
                }
                this.chequeaAgregarEstaciones();
            }
        })
    }

    chequeaAgregarEstaciones() {
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
        this.find("#lblAgregarEstaciones").innerText = this.selectedStations.length;
        if (!this.selectedStations.length) {
            this.cmdAgregarEstaciones.disable();
        } else {
            this.cmdAgregarEstaciones.enable();
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

    onCmdAgregarEstaciones_click() {
        this.close({layer: this.edCapaEstaciones.value, stations:this.selectedStations, type:"stations"});
    }
}
ZVC.export(WAddLayer);