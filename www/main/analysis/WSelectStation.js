class WSelectStation extends ZDialog {
    async onThis_init() {
        this.edTipoEstacion.setRows(window.config.stationTypes);
        this.refrescaEstaciones();
    }
    onCmdCloseDialog_click() {this.cancel()}    
    onEdTipoEstacion_change() {this.refrescaEstaciones()}
    onEdSearch_change() {this.refrescaEstaciones()}

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
        let html = "<ul>";
        this.groups = {};
        for (let layer of layers) {
            if (filtro && layer.name.toLowerCase().indexOf(filtro) < 0) stations = stations.filter(s => (s.name.toLowerCase().indexOf(filtro) >= 0));
            let stations = layer.stations;
            if (stations.length) {
                this.groups[layer.code] = {};
                this.groups[layer.code].groupDef = layer;

                stations.sort((s1, s2) => (s1.lat < s2.lat?1:-1));
                html += "<li class='collapsible-tree-group stations-layer' data-layer-code='" + layer.code + "'>";
                html += "  <i class='fas fa-chevron-right me-2 clickable-icon clickable-expander'></i>";
                html += "  " + layer.name;
                html += "  <ul class='collapsible-tree-content' style='list-style-type: none;'>";
                for (let station of stations) {
                    this.groups[layer.code][station.code] = station;
                    html += "<li class='station-row' data-group-code='" + layer.code + "' data-station-code='" + station.code + "'>";
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
        this.stationsContainer.findAll(".station-name").forEach(a => {
            a.onclick = _ => {
                this.seleccionaEstacion(a.parentNode.getAttribute("data-group-code"), a.parentNode.getAttribute("data-station-code"));
            }
        })
    }

    seleccionaEstacion(groupCode, stationCode) {
        let groupDef = this.groups[groupCode].groupDef;
        let group = {code: groupDef.code, name:groupDef.name, dimension: groupDef.config.dimension}
        let stationDef = this.groups[groupCode][stationCode];
        let station = {code: stationDef.code, name: stationDef.name}
        this.close({group, station, searchPeriod:groupDef.config.searchPeriod, stationField:groupDef.config.stationField, timeZone:groupDef.config.timeZone, zreposerver:groupDef.config.zreposerver});
    }
}
ZVC.export(WSelectStation);