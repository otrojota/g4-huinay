class StationValues extends ZCustomController {
    onThis_init(options) {
        this.options = options.element;        
        this.repaint();
        this.refresh(); // async
    }

    repaint() {
        if (!this.results || !this.results.length) {
            this.propsContainer.html = "<div><i class='fas fa-spin fa-spinner me-2'></i>Buscando Datos...</div>";
            return;
        }
        let html = this.results.reduce((html, r, idx) => {
            html += `
            <li class="list-group-item ">
                <span class="float-start me-2 mt-1 chart-opener" data-idx="${idx}" style="cursor: pointer;">
                    <i class="fas fa-chart-line fa-lg"></i>
                </span>
                <div class="ms-2 ">
                    <div class="fw-bold">${r.name}</div>
                    ${r.value}
                    <div class="float-end text-end"><small>${r.time}</small></div>
                </div>
            </li>
            `;
            
            return html;
        }, "")
        this.propsContainer.html = "<ul class='list-group'>" + html + "</ul>";
        this.propsContainer.findAll(".chart-opener").forEach(i => {
            i.addEventListener("click", e => {
                let idx = parseInt(i.getAttribute("data-idx"));
                let r = this.results[idx];
                this.showGraph(r);
            });
        })
    }
    async refresh() {
        if (this.controller) this.controller.abort();
        let station = this.options.station;
        let zrepoClient = await window.g4.getZRepoClient(station.group.config.zreposerver);

        let tiempoBase = window.g4.time.valueOf();
        let startTime = tiempoBase - station.group.config.searchPeriod * 60 * 1000;
        let endTime = tiempoBase + station.group.config.searchPeriod * 60 * 1000; 
        let variables = station.variables;
        this.results = [];
        for (let variable of variables) {
            let unit = (variable.options && variable.options.unit)?(" [" + variable.options.unit + "]"):"";
            let filter = {};
            filter[station.group.config.stationField] = station.code;
            let {promise, controller} = zrepoClient.queryTimeSerie(variable.code, startTime, endTime, filter, variable.temporality);
            this.controller = controller;
            try {
                let rows = await promise;
                this.controller = null;
                // Buscar punto más cercano al tiempoBase
                let valor;
                for (let j=0; j<rows.length; j++) {
                    let r = rows[j];                    
                    let lx = luxon.DateTime.fromObject(r.localTime, {zone:station.group.config.timeZone});
                    let time = lx.valueOf()
                    if (valor === undefined) {
                        valor = {value:r.value / r.n, time};
                    } else {
                        if (Math.abs(tiempoBase - time) < Math.abs(tiempoBase - valor.time)) {
                            valor = {value:r.value / r.n, time};
                        }
                    }
                }
                let res = {
                    name:variable.name, 
                    code:variable.code,
                    unit:(variable.options && variable.options.unit)?(variable.options.unit):"",
                    temporality: variable.temporality
                };
                if (valor) {
                    res.value = valor.value.toFixed(2) + unit;
                    res.time = luxon.DateTime.fromMillis(valor.time).toFormat("yyyy-MM-dd HH:mm");
                } else {
                    res.value = "Sin Datos";
                    res.time = "";
                }
                this.results.push(res);
                this.repaint();
            } catch(error) {
                console.error(error);                
            }
        }
    }

    async showGraph(r) {
        await window.g4.analysisController.openAnalysis("time-serie", {
            type: "create-from-station",
            station: this.options.station,
            variable: {code: r.code, name: r.name, unit: r.unit, temporality: r.temporality},
            title: this.options.title + " / " + r.name,
            accum:"avg"
        })
    }
}
ZVC.export(StationValues);