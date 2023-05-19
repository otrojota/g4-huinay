class BarbValue extends ZCustomController {
    onThis_init(options) {
        let e = options.element;
        this.lblMagnitude.text = e.formattedMagnitude;
        if (e.unit) this.lblUnit.text = "[" + e.unit + "]";
        this.drawBarb(e.value, e.magnitude, e.lat);
    }

    drawBarb(value, magnitude, lat) {
        let pixelsRatio = window.devicePixelRatio || 1;
        let canvas = this.canvas.view;        
        canvas.width = pixelsRatio * canvas.offsetWidth;
        canvas.height = pixelsRatio * canvas.offsetHeight;        
        let ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let w = canvas.width, h = canvas.height;
        let len = 20 * pixelsRatio;
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = pixelsRatio;

        let angle = Math.atan2(value.u, value.v) - Math.PI / 2;
        ctx.translate(w/2, h/2);
        ctx.rotate(angle);
        ctx.translate(-w/2, -h/2);       

        ctx.beginPath();
        ctx.moveTo(w/2 - len, h/2);
        ctx.lineTo(w/2 + len, h/2);
        ctx.stroke();

        let m = magnitude;
        m = 5 * Math.round(m/5);
        // Calcular segmentos
        let segments = [], rest = m;
        while (rest >= 5) {
            if (rest >= 50) {
                segments.push({type: "50"});
                rest -= 50;
            } else if (rest >= 10) {
                segments.push({type: "10"});
                rest -= 10;
            } else {
                segments.push({type: "5"});
                rest -= 5;
            }
        }
        let step = len / 3;
        let lSum = w/2 - len, barDirection = Math.sign(lat), y0 = h/2;
        segments.forEach((s, idx) => {
            if (s.type == "50") {
                if (idx > 0) lSum += step;
                let s0 = {x:lSum, y:y0};
                let s1 = {x:lSum - step, y:y0 - 2*step*barDirection};
                let s2 = {x:lSum - step, y:y0};
                ctx.beginPath();
                ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y);
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
            } else if (s.type == "10") {
                if (idx > 0) lSum += step / 2;
                let s0 = {x:lSum, y:y0};
                let s1 = {x:lSum - step, y:y0 - 2*step*barDirection};
                ctx.beginPath();
                ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y);
                ctx.stroke();
            } else if (s.type == "5") {
                if (idx > 0) lSum += step / 2;
                let s0 = {x:lSum, y:y0};
                let s1 = {x:lSum - step/2, y:y0 - step*barDirection};
                ctx.beginPath();
                ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y);
                ctx.stroke();
            }
        });
    }
    
}
ZVC.export(BarbValue);