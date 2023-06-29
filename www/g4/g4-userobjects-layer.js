
class G4UserObjectsLayer extends G4Layer {
    get type() {return "user-objects"}
    get dependsOnTime() {return this.config.dependsOnTime?true:false;}

    constructor(name, config) {
        super(null, name);
        config.objectsConfigs = config.objectsConfigs || [];
        this.config = config;
        this.objects = [];
    }

    async g4init() {
        try {
            super.g4init();
            if (this.config.opacity) this._opacity = this.config.opacity;
        } catch(error) {
            console.error(error);
        }
    }
    async g4destroy() {
    }

    async refresh() {
        try {            
            this.redraw();
        } catch(error) {            
            console.error("Refresh error", error);            
        }
    }
    redraw() {        
        if (!this.canvasLayer) {
            this.canvasLayer = new L.CanvasOverlay({
                drawCallback: (canvas, map) => this.drawUserObjects(canvas, map),
                zIndex:(this.getOrder() >= 0)?200 + 10 *this.getOrder():-1,
                opacity: this.getOpacity(),
                clearCanvasOnMove: false
                // pixelsRatio: 1 // forzar a 1 para ver lineas más gruesas (Limitación de WebGL de ancho = 1)
            });
            this.canvasLayer.addTo(window.g4.mapController.map);
        }
        this.canvasLayer.redraw();
    }
    resetOrder() {
        if (this.canvasLayer) this.canvasLayer.setZIndex((this.getOrder() >= 0)?200 + 10 *this.getOrder():-1);
    }
    setOpacity(o) {
        this._opacity = o;
        if (this.canvasLayer) this.canvasLayer.setOpacity(o);
    }
    elementAtPoint(lat, lng) {       
        let canvasPoint = this.canvasLayer.latLngToCanvas(lat, lng); 
        let found = [];
        for (let o of this.objects) {
            if (o.inPoint(lat, lng, canvasPoint)) found.push({type:"user-object", subtype:o.type, name:o.name, object:o, layer:this});
        }
        return found;
    }

    addDefaultPoint(latlng) {
        let config = {id: window.g4.uuidv4(), type:"point", name:"Punto", lat:latlng.lat, lng:latlng.lng};
        let point = this.createUserObject(config);
        this.config.objectsConfigs.push(config);
        this.objects.push(point);
        window.g4.trigger("layer-struct-change", this);
        this.refresh();
    }
    createUserObject(config) {
        if (config.type == "point") {
            return new G4Point(config.id, config);
        } else {
            throw "Tipo de Objeto de Usuario desconocido " + config.type;
        }
    }

    drawUserObjects(canvas, map) {
        this.canvasLayer.clear();
        for (let uo of this.objects) {
            uo.draw(canvas, map, this.canvasLayer);
        }
    }
}

class G4UserObject {
    constructor(id, config) {
        this.id = id || window.g4.uuidv4();
        this.config = config;
    }
    get type() {return this.config.type}
    get name() {return this.config.name}

    draw(canvas, map, canvasLayer) {
        throw "draw() no implementado para " + this.type;
    }
    inPoint(lat, lng, canvasPoint) {return false}
}

class G4CompoundUserObject extends G4UserObject {
    constructor(id, config) {
        super(id, config);
        this.children = [];
    }
}

class G4Point extends G4UserObject {
    constructor(id, config) {
        super(id, config);
        config.borderStyle = config.borderStyle || {
            lineWidth: 2, strokeStyle:"white"
        }
        config.fillStyle = config.fillStyle || "blue";
        config.radius = config.radius || 10;
    }
    get lat() {return this.config.lat}
    get lng() {return this.config.lng}
    get borderStyle() {return this.config.borderStyle}
    get fillStyle() {return this.config.fillStyle}
    get radius() {return this.config.radius}

    inPoint(lat, lng, canvasPoint) {
        return Math.sqrt((canvasPoint.x - this.canvasCenter.x) * (canvasPoint.x - this.canvasCenter.x) + (canvasPoint.y - this.canvasCenter.y) * (canvasPoint.x - this.canvasCenter.x)) <= this.canvasRadius 
    }
    draw(canvas, map, canvasLayer) {
        let pixelsRatio = canvasLayer.options.pixelsRatio || window.devicePixelRatio;   
        let radius = this.radius * pixelsRatio;
        let ctx = canvasLayer.getContext2D();
        let center = canvasLayer.latLngToCanvas(this.lat, this.lng);
        this.canvasCenter = center;
        this.canvasRadius = radius;
        this.pixelsRatio = pixelsRatio;
        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.borderStyle.strokeStyle;
        ctx.lineWidth = pixelsRatio * this.borderStyle.lineWidth;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, 2*Math.PI);
        ctx.fill();
        ctx.stroke();
    }
}