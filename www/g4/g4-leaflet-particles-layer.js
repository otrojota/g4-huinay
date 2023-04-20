L.ParticlesOverlay = L.CanvasOverlay.extend({
    options: {        
        paths: 800,
        color: 'blue', // html-color | function colorFor(value) [e.g. chromajs.scale]
        width: 1.0, // number | function widthFor(value)
        fade: 0.96, // 0 to 1
        duration: 20, // milliseconds per 'frame'
        maxAge: 200, // number of maximum frames per path
        velocityScale: 1 / 5000
    },
  
    initialize: function (options) {
        L.setOptions(this, options);
    },
  
    onAdd: function(map) {
        this.options.drawCallback = (canvas, map) => this._resetAnimation.call(this, canvas, map);
        L.CanvasOverlay.prototype.onAdd.call(this, map);   
    },
    onRemove: function(map) {
        this._stopAnimation();
        L.CanvasOverlay.prototype.onRemove.call(this, map);        
    },
    onMoveStart: function() {
        this._stopAnimation.call(this);
    },
    setVectorsGridData:function(box, rowsU, rowsV, nrows, ncols) {
        this.box = box;
        this.rowsU = rowsU;
        this.rowsV = rowsV;
        this.nRows = nrows;
        this.nCols = ncols;
        
        L.CanvasOverlay.prototype.redraw.call(this, map);   
    },

    _getInperpolatedVector(lat, lng) {
        // https://en.wikipedia.org/wiki/Bilinear_interpolation
        // espacio (0,1)        
        let b = this.box, rowsU = this.rowsU, rowsV = this.rowsV;
        if (lat <= b.lat0 || lat >= b.lat1 || lng <= b.lng0 || lng >= b.lng1) return null;
        let i = parseInt((lng - b.lng0) / b.dLng);
        let j = parseInt((lat - b.lat0) / b.dLat);
        if (i >= (this.nCols - 1) || j >= (this.nRows - 1)) return;
        let x0 = b.lng0 + b.dLng*i;
        let x = (lng - x0) / b.dLng;
        let y0 = b.lat0 + b.dLat*j;
        let y = (lat - y0) / b.dLat;
        let rx = 1 - x, ry = 1 - y;

        let u00 = rowsU[j][i], u10 = rowsU[j][i+1], u01 = rowsU[j+1][i], u11 = rowsU[j+1][i+1];
        if (u00 == null || u10 == null || u01 == null || u11 == null) return null;
        let u = u00*rx*ry + u10*x*ry + u01*rx*y + u11*x*y;

        let v00 = rowsV[j][i], v10 = rowsV[j][i+1], v01 = rowsV[j+1][i], v11 = rowsV[j+1][i+1];
        if (v00 == null || v10 == null || v01 == null || v11 == null) return null;
        let v = v00*rx*ry + v10*x*ry + v01*rx*y + v11*x*y;
        return {u, v};
    },
    _startAnimation() {
        this._callNextFrame.call(this);
    },
    _callNextFrame() {
        this.animTimer = setTimeout(_ => {
            this.animTimer = null;
            this._move();
            this._drawFrame.call(this);
        }, this.options.duration)
    },
    _stopAnimation() {
        if (this.animTimer) {
            clearTimeout(this.animTimer);
            this.animTimer = null;
        }
    },
    _move() {
        this.paths.forEach(p => {
            let scale = this.options.velocityScale * (this.box.lat1 - this.box.lat0);
            if (++p.age > this.options.maxAge || !p.valid ) {
                p.lat = this.box.lat0 + (this.box.lat1 - this.box.lat0) * Math.random();
                p.lng = this.box.lng0 + (this.box.lng1 - this.box.lng0) * Math.random();
                p.age = 0;
                p.p0 = null; 
                p.p1 = null;
                p.valid = true;
            }
            if (!p.p0) p.p0 =  this._map.latLngToContainerPoint([p.lat, p.lng]);
            else p.p0 = p.p1;
            let v = this._getInperpolatedVector.call(this, p.lat, p.lng);
            if (v) {
                p.lat += v.v * scale;
                p.lng += v.u * scale;
                p.p1 =  this._map.latLngToContainerPoint([p.lat, p.lng]);
            } else {
                p.valid = false;
            }
        })
    },
    _resetAnimation(canvas, map) {
        this._stopAnimation.call(this);
        this.paths = [];
        if (!this.box) return;
        for (let i=0; i<this.options.paths; i++) {
            this.paths.push({
                lat: this.box.lat0 + (this.box.lat1 - this.box.lat0) * Math.random(),
                lng: this.box.lng0 + (this.box.lng1 - this.box.lng0) * Math.random(),
                age: Math.floor(Math.random() * this.options.maxAge),
                valid: true
            })
        }
        let ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this._startAnimation.call(this);
    },
    _drawFrame() {
        try {
            //console.time("draw");
            let ctx = this._canvas.getContext("2d");
            let prev = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = 'destination-in';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.globalCompositeOperation = prev;
            
            ctx.fillStyle = `rgba(0, 0, 0, ${this.options.fade})`;
            ctx.lineWidth = this.options.width;
            let [r,g,b,a] = this.options.color;
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
            this.paths.forEach(p => {
                if (p.valid) {
                    ctx.beginPath();
                    ctx.moveTo(p.p0.x, p.p0.y);
                    ctx.lineTo(p.p1.x, p.p1.y);
                    ctx.stroke();
                }
            });
            //console.timeEnd("draw");
        } catch (error) {
            console.error(error);
        } finally {
            this._callNextFrame.call(this);
        }
    }
})

L.particlesOverlay = function(options) {
    return new L.ParticlesOverlay(options);
};