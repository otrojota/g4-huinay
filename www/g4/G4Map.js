class G4Map extends ZCustomController {
    onThis_init() {}

    async g4init() {
        this.map = L.map("mapContainer", {zoomControl: false, attributionControl: false});
        this.selectBaseMap(window.config.maps[0].name);
        this.interactionsLayer = new L.G4InteractionsOverlay({});
        this.interactionsLayer.addTo(this.map);
        let b = window.config.initialBounds;
        let bounds = [[b.s, b.w], [b.n, b.e]];
        this.map.fitBounds(bounds);
        this.map.on("zoomend", _ => this.callTriggerMapChange());
        this.map.on("moveend", _ => this.callTriggerMapChange());
        this.map.on("click", e => {
            if (this.ignoreNextClick) {
                this.ignoreNextClick = false;
            } else {
                window.g4.trigger("map-click", e)
            }
        });
        this.map.on("mousemove", e => window.g4.trigger("map-mouse-move", e));
        this.map.on("mousedown", e => window.g4.trigger("map-mouse-down", e));
        this.map.on("mouseup", e => window.g4.trigger("map-mouse-up", e));
    }

    selectBaseMap(name) {
        if (this.baseMapLayer) this.baseMapLayer.remove();
        let map = window.config.maps.find(m => m.name == name);
        this.baseMapLayer = L.tileLayer(map.url, {attribution: map.attribution});
        this.baseMapLayer.addTo(this.map);
        this.selectedMap = name;
        //L.control.attribution({position: 'topright'}).addTo(map);
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

    setObjectAtPoint(lat, lng, label, values) {
        this.interactionsLayer.setObjectAtPoint(lat, lng, label, values);
    }
    setPropertiesPoint(lat, lng, values) {
        this.interactionsLayer.setPropertiesPoint(lat, lng, values);
    }
    setActiveScales(scales) {
        this.interactionsLayer.setActiveScales(scales);
    }
    getActiveScale(id) {
        return (this.interactionsLayer.activeScales || []).find(s => (s.id == id));
    }

    setCursor(cursor) {
        if (cursor) {
            this.mapContainer.view.style.setProperty("cursor", cursor);
        } else {
            this.mapContainer.view.style.removeProperty("cursor");
        }
    }

    disablePanning() {
        this.map.dragging.disable();
    }
    enablePanning() {
        this.map.dragging.enable();
    }
}
ZVC.export(G4Map);