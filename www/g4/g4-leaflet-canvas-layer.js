L.CanvasOverlay = L.Layer.extend({
    options: {
        drawCallback: null,
        zIndex:null,
        opacity: 1,
        clearCanvasOnMove: false,
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
    onMoveStart: function() {
        if (this.options.clearCanvasOnMove) {
            this.getContext2D().clearRect(0, 0, this._canvas.width, this._canvas.height);
        }
    },
  
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
    },
    drawRoundedRectLabelXY(x, y, text, borderColor, fillColor, textColor, borderRadius, textAlign, baseLine) {
        let ctx = this.getContext2D();
        let center = {x, y}
        let textSize = ctx.measureText(text);
        let textHeight = textSize.actualBoundingBoxAscent + textSize.actualBoundingBoxDescent;
        let x0 = center.x - textSize.width / 2 - borderRadius;
        let width = textSize.width + 2*borderRadius;
        if (textAlign == "left") x0 += width / 2;
        else if (textAlign == "right") x0 -= width / 2;
        let y0 = center.y - textHeight / 2 - borderRadius;
        let height = textHeight + 2*borderRadius;
        if (baseLine == "top") y0 += height / 2;
        else if (baseLine == "bottom") y0 -= height / 2;
        ctx.strokeStyle = borderColor;
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.roundRect(x0, y0, width, height, borderRadius);
        ctx.stroke();
        ctx.fill();
        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle"; 
        ctx.fillText(text, x0 + width / 2, y0 + height / 2);
    },
    drawRoundedRectMultiLabelPointing(lat, lng, text, borderColor, fillColor, textColor, borderRadius, shadow=true) {        
        let margin = 10;
        let ctx = this.getContext2D();
        let center = this.latLngToCanvas(lat, lng);
        let lines = text.split("\n");
        let maxWidth = 0, maxHeight = 0;
        for (let line of lines) {
            let textSize = ctx.measureText(line);    
            if (!maxWidth || textSize.width > maxWidth) maxWidth = textSize.width;
            let h = textSize.actualBoundingBoxAscent + textSize.actualBoundingBoxDescent;
            if (!maxHeight || h > maxHeight) maxHeight = h;
        }
        maxHeight *= 1.7;
        let x0 = center.x + 50;
        let width = maxWidth + 2*borderRadius + 2*margin;
        let y0 = center.y - 50 - maxHeight * lines.length;
        let height = maxHeight * lines.length + 2*borderRadius + 2*margin;
        // Sombra  
        if (shadow) {      
            ctx.strokeStyle = "rgba(0,0,0,0.2)";
            ctx.fillStyle = "rgba(0,0,0,0.2)"
            ctx.beginPath();
            ctx.roundRect(x0 + 10, y0 + 10, width, height, borderRadius);
            ctx.stroke();
            ctx.fill();        
        }
        // Rectangulo
        ctx.strokeStyle = borderColor;
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.roundRect(x0, y0, width, height, borderRadius);
        ctx.stroke();
        ctx.fill();
        // Texto
        ctx.fillStyle = textColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top'; 
        let x = x0 + borderRadius + margin, y = y0 + borderRadius + margin;
        for (let line of lines) {
            ctx.fillText(line, x, y);
            y += (maxHeight);
        }
        // Punto y Linea
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(center.x + 30, y0 + height / 2);
        ctx.lineTo(x0, y0 + height / 2);
        ctx.stroke();

        ctx.strokeStyle = borderColor;
        ctx.fillStyle = fillColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(center.x, center.y, 5, 0, 2*Math.PI);
        ctx.fill();
        ctx.stroke();
    },    
    drawMarkerCircle(lat, lng, borderColor, fillColor) {        
        let outerRadius = 15;
        let ctx = this.getContext2D();
        let center = this.latLngToCanvas(lat, lng);
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(center.x, center.y, outerRadius, 0, 2*Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(center.x, center.y, outerRadius / 3, 0, 2*Math.PI);
        ctx.fill();
        ctx.stroke();
    },
    drawScale(idx, scale, valueObjectAtPoint, valuePropertiesPoint, maxX) {
        let scaleHeight = 80, margin = 10, innerMargin = 8;
        let x0 = margin, x1 = this._canvas.width - margin;
        if (maxX && x1 > maxX) x1 = maxX - margin;
        if (x1 - x0 < 160) return;
        let y0 = this._canvas.height - (scaleHeight + margin) * (idx + 1), y1 = y0 + scaleHeight;
        let ctx = this.getContext2D();
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x0, y0, (x1 - x0), (y1 - y0), 10);
        ctx.stroke();
        ctx.fill();
        // rangos
        let ranges = scale.scale.getPreviewRanges();
        let sMin = scale.scale.min, sMax = scale.scale.max;
        let valueToX = v => (margin + innerMargin + ((x1 - x0) - 2 * innerMargin) * ((v - sMin) / (sMax - sMin)));
        ctx.lineWidth = 0;
        let ry0 = y0 + innerMargin, ry1 = ry0 + scaleHeight - 2 * innerMargin;
        let grd = ctx.createLinearGradient(valueToX(scale.scale.min), ry0, valueToX(scale.scale.max), ry1);
        for (let i=0; i<ranges.length; i++) {
            let r = ranges[i];
            if (i == 0) {
                grd.addColorStop(0, `rgba(${r.colorFrom[0]}, ${r.colorFrom[1]}, ${r.colorFrom[2]}, ${r.colorFrom[3]/255})`);
            }
            let offset = (r.to - scale.scale.min) / (scale.scale.max - scale.scale.min);
            if (offset > 1) offset = 1;
            grd.addColorStop(offset, `rgba(${r.colorTo[0]}, ${r.colorTo[1]}, ${r.colorTo[2]}, ${r.colorTo[3]/255})`)
        }
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.rect(margin + innerMargin, ry0, (x1 - x0) - 2 * innerMargin, ry1 - ry0);
        ctx.fill();
        // Min / Max
        let unit = scale.layer.unit;
        this.setFont(10, "Arial");
        let stMin = scale.layer.roundValue(scale.scale.min);
        if (unit) stMin += " [" + unit + "]";
        this.drawRoundedRectLabelXY(x0 + 2*innerMargin, y0 + 2*innerMargin, stMin, "rgba(255,255,255,1)", "rgba(0,0,0,1)", "rgba(255,255,255,1)", 10, "left", "top");
        let stMax = scale.layer.roundValue(scale.scale.max);
        if (unit) stMax += " [" + unit + "]";
        this.drawRoundedRectLabelXY(x1 - 2*innerMargin, y0 + 2*innerMargin, stMax, "rgba(255,255,255,1)", "rgba(0,0,0,1)", "rgba(255,255,255,1)", 10, "right", "top");
        this.setFont(12, "Arial");
        this.drawRoundedRectLabelXY((x0 + x1) / 2, ry0 + 4*innerMargin, scale.name, "rgba(0,0,0,1)", "rgba(120,120,255,0.6)", "rgba(0,0,0,1)", 10, "center", "middle");
        // Value
        if (valuePropertiesPoint) {
            let x = valueToX(valuePropertiesPoint.value);
            let y = ry0 + (ry1 - ry0) / 2;
            ctx.fillStyle = "rgba(0,0,0,1)";
            ctx.strokeStyle = "rgba(255,255,255,1)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, 2*Math.PI);
            ctx.fill();
            ctx.stroke();
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2*Math.PI);
            ctx.fill();
            ctx.stroke();
        }
        if (valueObjectAtPoint) {
            let x = valueToX(valueObjectAtPoint.value);
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.strokeStyle = "rgba(255,255,255,1)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.rect(x - 3, ry0 + 1, 7, (ry1 - ry0) - 5);
            ctx.fill();
            ctx.stroke();
        }
    }
});
  
L.canvasOverlay = function(options) {
      return new L.CanvasOverlay(options);
};
  