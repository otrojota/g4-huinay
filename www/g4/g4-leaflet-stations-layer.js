L.G4StationsOverlay = L.CanvasOverlay.extend({
    options: {                
        getStations:null,
        getStationStyle:null
    },
  
    initialize: function (options) {
        L.setOptions(this, options);
    },
  
    onAdd: function(map) {
        this.options.drawCallback = (canvas, map) => this._draw.call(this, canvas, map);
        L.CanvasOverlay.prototype.onAdd.call(this, map);   
    },
    onRemove: function(map) {
        L.CanvasOverlay.prototype.onRemove.call(this, map);        
    },
    redraw() {this._draw()},
    _draw() {
        try {
            this.clear(); 
            let stations = this.options.getStations();
            console.log("drawStations", stations);            
            if (!stations || !stations.length) return;
            let ctx = this.getContext2D();
            for (let s of stations) {
                let center = this.latLngToCanvas(s.lat, s.lng);
                let style = this.options.getStationStyle(s);
                let radius = style.radius || 20;
                let borderColor = style.borderColor;
                while(borderColor && borderColor.length < 4) borderColor.push(255);
                if (borderColor) borderColor = `rgba(${borderColor[0]}, ${borderColor[1]}, ${borderColor[2]}, ${borderColor[3] / 255})`;
                let fillColor = style.fillColor || [255,0,0,255];
                while(fillColor.length < 4) fillColor.push(255);
                fillColor = `rgba(${fillColor[0]}, ${fillColor[1]}, ${fillColor[2]}, ${fillColor[3] / 255})`;
                ctx.fillStyle = fillColor;
                if (borderColor) {
                    ctx.strokeStyle = borderColor;
                    ctx.lineWidth = 2;
                }
                ctx.beginPath();
                ctx.arc(center.x, center.y, radius, 0, 2*Math.PI);
                ctx.fill();
                if (borderColor) ctx.stroke();
            }
        } catch (error) {
            console.error(error);
        }
    },    
})

L.g4StyationsOverlay = function(options) {
    return new L.G4StationsOverlay(options);
};