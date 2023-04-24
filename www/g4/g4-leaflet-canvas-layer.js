L.CanvasOverlay = L.Layer.extend({
    options: {
        drawCallback: null,
        zIndex:null,
        opacity: 1
    },
  
    initialize: function (options) {
        L.setOptions(this, options);
    },
  
    onAdd: function(map) {
        let containerId = 'g4-leaflet-canvas' + L.Util.stamp(this);
        this._canvas = L.DomUtil.create('canvas', containerId);
        this._canvas.width = map.getSize().x;
        this._canvas.height = map.getSize().y;
        this._canvas.style.opacity = this.options.opacity;
        if (!isNaN(this.options.zIndex) && this.options.zIndex > 0) this._canvas.style.zIndex = "" + this.options.zIndex;

        this.animatedZoom = this._map.options.zoomAnimation && L.Browser.any3d;
        L.DomUtil.addClass(this._canvas, 'leaflet-zoom-' + (this.animatedZoom ? 'animated' : 'hide'));

        map.getPanes().overlayPane.appendChild(this._canvas);
        this._reset.call(this);
  
        map.on('moveend', this.onMoveEnd, this);
        map.on('movestart', this.onMoveStart, this);
        map.on('resize', this.onResize, this);
        if (this.animatedZoom) map.on('zoomanim', this._onZoomAnim, this);
    },

    setZIndex(z) {
        this.options.zIndex = z;
        if (!isNaN(this.options.zIndex) && this.options.zIndex > 0) {
            this._canvas.style.zIndex = "" + this.options.zIndex;
        } else {
            delete this._canvas.style.zIndex;
        }
    },
    setOpacity(o) {
        this.options.opacity = o;
        this._canvas.style.opacity = o;
    },
  
    onRemove: function(map) {
        map.getPanes().overlayPane.removeChild(this._canvas);
        this._canvas = null;
  
        map.off('moveend', this.onMoveEnd, this);
        map.off('resize', this.onResize, this);
        if (this.animatedZoom) map.off('zoomanim', this._onZoomAnim, this);
    },
  
    onMoveEnd: function() {
        this._reset.call(this);
    },
    onMoveStart: function() {},
  
    onResize: function(e) {
        this._canvas.width = e.newSize.x;
        this._canvas.height = e.newSize.y;
    },
    _reset: function () {
        var topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);
        // Constantes para mapeo de coordenadas a canvas
        const bounds = this._map.getBounds();
        this.c_p0 = this._map.latLngToContainerPoint([bounds.getSouth(), bounds.getWest()]);
        this.c_p1 = this._map.latLngToContainerPoint([bounds.getNorth(), bounds.getEast()]);
        this.c_dx = (this.c_p1.x - this.c_p0.x);
        this.c_dy = -this._canvas.height; // (p1.y - p0.y);
        this.redraw.call(this);
    },
    latLngToCanvas(lat, lng) {
        let p = this._map.latLngToContainerPoint({lat, lng});
        p.y -= (this._canvas.height - this.c_p0.y);
        return p;
    },
    latLngToWebGL(lat, lng) {
        let p = this.latLngToCanvas.call(this, lat,  lng);
        let x = 2 * (p.x - this.c_p0.x) / this.c_dx - 1;
        let y = 2 * (p.y - this.c_p0.y) / this.c_dy - 1;
        return {x, y}
    },
    _onZoomAnim: function(e) {
        let bounds   = this._map.getBounds();
		let scale = this._map.getZoomScale(e.zoom),
		    offset = this._map._latLngBoundsToNewLayerBounds(bounds, e.zoom, e.center).min;

		L.DomUtil.setTransform(this._canvas, offset, scale);
    },
  
    redraw: function() {
        this.options.drawCallback(this._canvas, this._map);
    }
});
  
L.canvasOverlay = function(options) {
      return new L.CanvasOverlay(options);
};
  