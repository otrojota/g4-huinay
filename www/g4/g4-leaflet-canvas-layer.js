L.CanvasOverlay = L.Layer.extend({
    options: {
        drawCallback: null
    },
  
    initialize: function (options) {
        L.setOptions(this, options);
    },
  
    onAdd: function(map) {
        let containerId = 'g4-leaflet-canvas' + L.Util.stamp(this);
        this._canvas = L.DomUtil.create('canvas', containerId);
        this._canvas.width = map.getSize().x;
        this._canvas.height = map.getSize().y;

        this.animatedZoom = this._map.options.zoomAnimation && L.Browser.any3d;
        L.DomUtil.addClass(this._canvas, 'leaflet-zoom-' + (this.animatedZoom ? 'animated' : 'hide'));

        map.getPanes().overlayPane.appendChild(this._canvas);
        this._reset();
  
        map.on('moveend', this.onMoveEnd, this);
        map.on('resize', this.onResize, this);
        if (this.animatedZoom) map.on('zoomanim', this._onZoomAnim, this);
    },
  
    onRemove: function(map) {
        map.getPanes().overlayPane.removeChild(this._canvas);
        this._canvas = null;
  
        map.off('moveend', this.onMoveEnd, this);
        map.off('resize', this.onResize, this);
        if (this.animatedZoom) map.off('zoomanim', this._onZoomAnim, this);
    },
  
    onMoveEnd: function() {
        this._reset();
    },
  
    onResize: function(e) {
        this._canvas.width = e.newSize.x;
        this._canvas.height = e.newSize.y;
    },
    _reset: function () {
        var topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);
        this.redraw();
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
  