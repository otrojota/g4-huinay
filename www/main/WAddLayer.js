const layerIcons = {
    geojson: "fas fa-draw-polygon",
    raster: "fas fa-bacon"
}
class WAddLayer extends ZDialog {
    onThis_init() {
        this.refresh();
        setTimeout(_ => this.edSearch.edSearch.view.focus(), 500);
    }
    onCmdCloseDialog_click() {this.cancel()}

    onEdSearch_change() {
        this.refresh();
    }
    refresh() {
        let filtro = this.edSearch.value.toLowerCase();
        let layers =  window.config.layers.filter(l => {
            if (!filtro) return true;0
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
        let html = "<ul>";
        for (let group of groups) {
            html += "<li>";
            html += "  <i class='fas fa-folder me-2'></i>";
            html += "  " + group.name;
            let groupLayers = layers.filter(l => l.group == group.code);
            groupLayers.sort((l1, l2) => (l1.name > l2.name?1:-1));
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
        html += "</ul>";
        this.layersContainer.html = html;
        this.layersContainer.findAll(".btn-link").forEach(a => {
            a.onclick = _ => this.close(layers.find(l => (l.code == a.getAttribute("data-code"))));            
        })
    }
}
ZVC.export(WAddLayer);