class MapaBase extends ZCustomController {
    onThis_init() {
        console.log("sm", window.g4.mapController);
        this.edMapaBase.setRows(window.config.maps, window.g4.mapController.selectedMap);
        this.refreshMap();
    }
    onEdMapaBase_change() {
        this.refreshMap();
        window.g4.mapController.selectBaseMap(this.edMapaBase.value);
    }
    refreshMap() {
        let name = this.edMapaBase.value;
        let map = window.config.maps.find(m => m.name == name);
        if (!this.map) {
            this.map = L.map("mapPreviewContainer", {zoomControl: false});
            this.map.fitBounds(window.g4.mapController.map.getBounds());
        }
        if (this.baseMapLayer) this.baseMapLayer.remove();
        this.baseMapLayer = L.tileLayer(map.url, {attribution: map.attribution});
        this.baseMapLayer.addTo(this.map);
    }
}
ZVC.export(MapaBase);