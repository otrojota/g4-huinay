class VectorValue extends ZCustomController {
    onThis_init(options) {
        let e = options.element;
        this.lblMagnitude.text = e.formattedMagnitude;
        if (e.unit) this.lblUnit.text = "[" + e.unit + "]";
        this.drawVector(e.value);
    }

    drawVector(value) {
        let pixelsRatio = window.devicePixelRatio || 1;
        let canvas = this.canvas.view;        
        canvas.width = pixelsRatio * canvas.offsetWidth;
        canvas.height = pixelsRatio * canvas.offsetHeight;        
        let ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let w = canvas.width, h = canvas.height;
        let l = 15*pixelsRatio;
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = pixelsRatio;

        let angle = Math.atan2(value.u, value.v);
        ctx.translate(w/2, h/2);
        ctx.rotate(angle);
        ctx.translate(-w/2, -h/2);

        ctx.beginPath();
        ctx.moveTo(w/2, h/2 + l);
        ctx.lineTo(w/2, h/2 - l);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(w/2 - l/2, h/2 -l + l/2);
        ctx.lineTo(w/2, h/2 -l);
        ctx.lineTo(w/2 + l/2, h/2 -l + l/2);
        ctx.stroke();
    }
    
}
ZVC.export(VectorValue);