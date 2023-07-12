L.G4InteractionsOverlay = L.CanvasOverlay.extend({
    options: {                
        zIndex: 99000,
        clearCanvasOnMove: true,
        objectAtPointColor: [255,255,255,255],
        objectAtPointBackColor: [0,0,0,255],
        objectAtPointLabel: null,
        objectAtPointPoint: null, // {lat:, lng:}
        objectAtPointValues: null,
        propertiesPointFillColor: [0,0,0,255],
        propertiesPointBorderColor: [255,255,255,255],
        propertiesPointPoint: null, //{lat:, lng:}
        propertiesPointValues: null
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

    onMoveEnd: function() {
        this.setOpacity(this._oldOpacity);
        L.CanvasOverlay.prototype.onMoveEnd.call(this);
    },
    onMoveStart: function() {
        this._oldOpacity = this.options.opacity;
        this.setOpacity(0);
        L.CanvasOverlay.prototype.onMoveStart.call(this);
    },

    _draw() {
        try {
            let pixelsRatio = this.options.pixelsRatio || window.devicePixelRatio;
            this.setFont(10, "Arial");       
            this.clear(); 
            if (this.options.objectAtPointPoint) {            
                let fillColor = [...this.options.objectAtPointBackColor];
                while(fillColor.length < 4) fillColor.push(255);
                fillColor = `rgba(${fillColor[0]}, ${fillColor[1]}, ${fillColor[2]}, ${fillColor[3] / 255})`;
                let textColor = [...this.options.objectAtPointColor];
                while(textColor.length < 4) textColor.push(255);
                textColor = `rgba(${textColor[0]}, ${textColor[1]}, ${textColor[2]}, ${textColor[3] / 255})`;
                let borderColor = textColor;
                this.drawRoundedRectMultiLabelPointing(this.options.objectAtPointPoint.lat, this.options.objectAtPointPoint.lng, this.options.objectAtPointLabel, borderColor, fillColor, textColor, 5*pixelsRatio);
            }
            if (this.options.propertiesPointPoint) {            
                let fillColor = [...this.options.propertiesPointFillColor];
                while(fillColor.length < 4) fillColor.push(255);
                fillColor = `rgba(${fillColor[0]}, ${fillColor[1]}, ${fillColor[2]}, ${fillColor[3] / 255})`;
                let borderColor = [...this.options.propertiesPointBorderColor];
                while(borderColor.length < 4) borderColor.push(255);
                borderColor = `rgba(${borderColor[0]}, ${borderColor[1]}, ${borderColor[2]}, ${borderColor[3] / 255})`;
                this.drawMarkerCircle(this.options.propertiesPointPoint.lat, this.options.propertiesPointPoint.lng, borderColor, fillColor);
            }
            if (!this.activeScales) this.activeScales = [];
            let maxX;
            if (window.g4.mainController.rightPanelOpened) {
                let w = window.g4.mainController.rightPanel.view.offsetWidth * window.devicePixelRatio;
                maxX = this._canvas.width - w;
            }
            for (let i=0; i<this.activeScales.length; i++) {
                let scale = this.activeScales[i];
                let vObjectAtPoint = (this.options.objectAtPointValues || []).find(v => v.scaleId == scale.id);
                let vPropertiesPoint = (this.options.propertiesPointValues || []).find(v => v.scaleId == scale.id);
                this.drawScale(i, scale, vObjectAtPoint, vPropertiesPoint, maxX);
            }
        } catch (error) {
            console.error(error);
        }
    },    
    setObjectAtPoint(lat, lng, label, values) {
        if (label) {
            this.options.objectAtPointLabel = label;
            this.options.objectAtPointPoint = {lat, lng};
            this.options.objectAtPointValues = values;
            this._draw();
        } else {
            if (this.options.objectAtPointPoint) {
                this.options.objectAtPointLabel = null;
                this.options.objectAtPointPoint = null;
                this.options.objectAtPointValues = null;
                this._draw();
            }
        }
    },
    setPropertiesPoint(lat, lng, values) {
        if (lat !== undefined) {
            this.options.propertiesPointPoint = {lat, lng};
            this.options.propertiesPointValues = values;
            this._draw();
        } else {
            if (this.options.propertiesPointPoint) {
                this.options.propertiesPointPoint = null;
                this.options.propertiesPointValues = null;
                this._draw();
            }
        }
    },
    setActiveScales(scales) {
        this.activeScales = scales;
        this._draw();
    }
})

L.g4InteractionsOverlay = function(options) {
    return new L.G4InteractionsOverlay(options);
};