L.CanvasOverlay = L.Layer.extend({
    options: {
        drawCallback: null,
        zIndex:null,
        opacity: 1,
        contextType: "2d" //webgl, 2d
    },
  
    initialize: function (options) {
        L.setOptions(this, options);
    },
  
    recycle(canvas) {
        let trash = document.getElementById("canvasesTrash-" + this.options.contextType);
        if (!trash) {
            trash = document.createElement("div");
            trash.id = "canvasesTrash-" + this.options.contextType;
            trash.style.display = "none";
            document.body.appendChild(trash);
        }
        trash.appendChild(canvas);
    },
    reuseOrCreateCanvas(id) {
        let trash = document.getElementById("canvasesTrash-" + this.options.contextType);
        if (trash) {
            let c = trash.firstChild;
            if (c) {
                trash.removeChild(c);
                c.id = id;
                return c;
            }
        }
        return L.DomUtil.create('canvas', id);
    },
    onAdd: function(map) {
        let containerId = 'g4-leaflet-canvas' + L.Util.stamp(this);
        //this._canvas = L.DomUtil.create('canvas', containerId);
        this._canvas = this.reuseOrCreateCanvas(containerId);
        this.ratio = this.options.pixelsRatio || window.devicePixelRatio;
        this._canvas.width = map.getSize().x * this.ratio;
        this._canvas.height = map.getSize().y * this.ratio;
        this._canvas.style.width = map.getSize().x + "px";
        this._canvas.style.height = map.getSize().y + "px";
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
        this.recycle(this._canvas);
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
        this._canvas.width = e.newSize.x * this.ratio;
        this._canvas.height = e.newSize.y * this.ratio;
        this._canvas.style.width = e.newSize.x + "px";
        this._canvas.style.height = e.newSize.y + "px";
    },
    _reset: function () {
        var topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);
        // Constantes para mapeo de coordenadas a canvas
        const bounds = this._map.getBounds();
        this.c_p0 = this._map.latLngToContainerPoint([bounds.getSouth(), bounds.getWest()]);
        this.c_p0.x *= this.ratio;
        this.c_p0.y *= this.ratio;
        this.c_p1 = this._map.latLngToContainerPoint([bounds.getNorth(), bounds.getEast()]);
        this.c_p1.x *= this.ratio;
        this.c_p1.y *= this.ratio;
        this.c_dx = (this.c_p1.x - this.c_p0.x);
        this.c_dy = -this._canvas.height; // (p1.y - p0.y);
        this.redraw.call(this);
    },
    latLngToCanvas(lat, lng) {
        let p = this._map.latLngToContainerPoint({lat, lng});
        p.x *= this.ratio;
        p.y *= this.ratio;
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
    },

    // Draw Utils
    getContext2D() {
        if (this.context2d) return this.context2d;
        this.context2d = this._canvas.getContext("2d");
        return this.context2d;
    },
    clear() {
        this.getContext2D().clearRect(0, 0, this._canvas.width, this._canvas.height);
    },
    setFont(size, family) {
        let font = "" + size * this.ratio + "px " + family;
        this.getContext2D().font = font;
    },
    drawRoundedRectLabel(lat, lng, text, borderColor, fillColor, textColor, borderRadius) {
        let ctx = this.getContext2D();
        let center = this.latLngToCanvas(lat, lng);
        let textSize = ctx.measureText(text);
        let textHeight = textSize.actualBoundingBoxAscent + textSize.actualBoundingBoxDescent;
        let x0 = center.x - textSize.width / 2 - borderRadius;
        let width = textSize.width + 2*borderRadius;
        let y0 = center.y - textHeight / 2 - borderRadius;
        let height = textHeight + 2*borderRadius;
        ctx.strokeStyle = borderColor;
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.roundRect(x0, y0, width, height, borderRadius);
        ctx.stroke();
        ctx.fill();
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle'; 
        ctx.fillText(text, center.x, center.y);
    }
});
  
L.canvasOverlay = function(options) {
      return new L.CanvasOverlay(options);
};
  