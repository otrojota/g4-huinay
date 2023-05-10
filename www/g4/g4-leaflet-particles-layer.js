L.ParticlesOverlay = L.CanvasOverlay.extend({
    options: {        
        paths: 800,
        color: [255,0,0,255], // html-color | function colorFor(value) [e.g. chromajs.scale]
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
        return window.g4.interpolateVector(lat, lng, this.box, this.rowsU, this.rowsV, this.nCols, this.nRows);
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
            if (!p.p0) p.p0 =  this.latLngToCanvas(p.lat, p.lng); // this._map.latLngToContainerPoint([p.lat, p.lng]);
            else p.p0 = p.p1;
            let v = this._getInperpolatedVector.call(this, p.lat, p.lng);
            if (v) {
                p.lat += v.v * scale;
                p.lng += v.u * scale;
                p.p1 = this.latLngToCanvas(p.lat, p.lng); // this._map.latLngToContainerPoint([p.lat, p.lng]);
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
            let color = this.options.color;
            while(color.length < 4) color.push(255);
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