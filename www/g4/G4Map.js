class G4Map extends ZCustomController {
    onThis_init() {}

    async g4init() {
        this.map = L.map("mapContainer", {zoomControl: false});
        this.selectBaseMap(window.config.maps[0].name);
        let b = window.config.initialBounds;
        let bounds = [[b.s, b.w], [b.n, b.e]];
        this.map.fitBounds(bounds);
        this.map.on("zoomend", _ => this.callTriggerMapChange());
        this.map.on("moveend", _ => this.callTriggerMapChange());
        this.map.on("click", e => window.g4.trigger("map-click", e));
        this.map.on("mousemove", e => window.g4.trigger("map-mouse-move", e));
    }

    selectBaseMap(name) {
        if (this.baseMapLayer) this.baseMapLayer.remove();
        let map = window.config.maps.find(m => m.name == name);
        this.baseMapLayer = L.tileLayer(map.url, {attribution: map.attribution});
        this.baseMapLayer.addTo(this.map);
        this.selectedMap = name;
    }

    zoomIn() {this.map.zoomIn()}
    zoomOut() {this.map.zoomOut()}

    getCurrentBounds(margin) {
        let bounds = this.map.getBounds();
        let b = {n:bounds.getNorth() + margin, s:bounds.getSouth() - margin, e:bounds.getEast() + margin, w:bounds.getWest() - margin}
        return b;
    }

    callTriggerMapChange() {
        if (this.triggerMapChangeTimer) clearTimeout(this.triggerMapChangeTimer);
        this.triggerMapChangeTimer = setTimeout(_ => {
            this.triggerMapChangeTimer = null;
            window.g4.trigger("map-change", this);            
        }, 100);
    }
}
ZVC.export(G4Map);