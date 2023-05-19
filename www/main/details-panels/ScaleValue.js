class ScaleValue extends ZCustomController {
    onThis_init(options) {
        let e = options.element;
        let scale = window.g4.mapController.getActiveScale(e.scaleId);
        if (!scale) return;
        this.lblValue.text = e.label;
        this.drawScale(scale, e.value);
    }

    drawScale(scale, value) {
        let pixelsRatio = window.devicePixelRatio || 1;
        let canvas = this.canvas.view;        
        canvas.width = pixelsRatio * canvas.offsetWidth;
        canvas.height = pixelsRatio * canvas.offsetHeight;        
        let scaleHeight = 35*pixelsRatio, margin = 5*pixelsRatio, innerMargin = 4*pixelsRatio;
        let x0 = margin, x1 = canvas.width - margin;
        let y0 = margin + 15*pixelsRatio, y1 = y0 + scaleHeight;
        let ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x0, y0, (x1 - x0), (y1 - y0), 5*pixelsRatio);
        ctx.stroke();
        ctx.fill();
        // rangos
        let ranges = scale.scale.getPreviewRanges();
        let sMin = scale.scale.min, sMax = scale.scale.max;
        let valueToX = v => (margin + innerMargin + (canvas.width - 2 * margin - 2 * innerMargin) * ((v - sMin) / (sMax - sMin)));
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
        ctx.rect(margin + innerMargin, ry0, canvas.width - 2 * margin - 2 * innerMargin, ry1 - ry0);
        ctx.fill();
        // Min / Max
        let unit = scale.layer.unit;
        let font = "" + pixelsRatio * 10 + "px Arial";
        ctx.font = font
        let stMin = scale.layer.roundValue(scale.scale.min);
        if (unit) stMin += " [" + unit + "]";
        this.drawRoundedRectLabelXY(x0 + 2*innerMargin, y0 + 2*innerMargin, stMin, "rgba(255,255,255,1)", "rgba(0,0,0,1)", "rgba(255,255,255,1)", 5*pixelsRatio, "left", "top");
        let stMax = scale.layer.roundValue(scale.scale.max);
        if (unit) stMax += " [" + unit + "]";
        this.drawRoundedRectLabelXY(x1 - 2*innerMargin, y0 + 2*innerMargin, stMax, "rgba(255,255,255,1)", "rgba(0,0,0,1)", "rgba(255,255,255,1)", 5*pixelsRatio, "right", "top");

        if (value) {
            let x = valueToX(value);
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.strokeStyle = "rgba(255,40,40,1)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 5*pixelsRatio, margin);
            ctx.lineTo(x + 5*pixelsRatio, margin);
            ctx.lineTo(x, margin + 12.5*pixelsRatio);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }        
    }

    drawRoundedRectLabelXY(x, y, text, borderColor, fillColor, textColor, borderRadius, textAlign, baseLine) {
        let canvas = this.canvas.view;
        let ctx = canvas.getContext("2d");
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
    }
}
ZVC.export(ScaleValue);