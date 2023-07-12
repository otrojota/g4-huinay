class TimeSerie extends ZCustomController {
    async onThis_init(options) {
        this.options = options;
        if (options.type == "create-from-station") this.createNewFromStation();
        else if (options.type == "create-from-raster") await this.createNewFromRaster();
        this.callRefresh();
    }

    resize() {        
        let r = this.view.getBoundingClientRect();
        this.container.view.style.height = (r.height) + "px";        
    }

    serialize() {return JSON.parse(JSON.stringify(this.config))}
    deserialize(config) {
        this.config = JSON.parse(JSON.stringify(config));
        if (this.config.serie1) this.q1 = G4Query.createTimeSerie(this.config.serie1);
        if (this.config.serie2) this.q2 = G4Query.createTimeSerie(this.config.serie2);
        this.callRefresh();
    }

    createNewFromStation() {
        console.log("TimeSerie createNewFromStation", this.options);
        let station = this.options.station;        
        this.config = {
            serie1:{
                type:"station", variable:this.options.variable,
                name:this.options.variable.name,
                station:{code: station.code, name: station.name}, 
                group: {code: station.group.code, dimension: station.group.config.dimension, name:station.group.name}, 
                searchPeriod: station.group.config.searchPeriod,
                stationField: station.group.config.stationField,
                timeZone: station.group.config.timeZone,
                zreposerver: station.group.config.zreposerver,
                accum: this.options.accum
            }            
        }
        let {temporality, timeDef} = G4Query.createDefaultTimeDef(this.options.variable.temporality)
        this.config.serie1.temporality = temporality;
        this.config.serie1.timeDef = timeDef;
        this.q1 = G4Query.createTimeSerie(this.config.serie1);
    }

    async createNewFromRaster() {
        console.log("TimeSerie createNewFromRaster", this.options);
        let rasterMetadata = await window.g4.getGeoserverVariableMetadata(this.options.layer.config.geoserver, this.options.layer.config.dataSet, this.options.layer.config.variable);
        let level = this.options.layer.levelIndex || 0;
        this.config = {
            serie1: {
                type:"raster", 
                geoserver: this.options.layer.config.geoserver,
                dataSet: rasterMetadata.dataSet,
                variable: rasterMetadata.variable,
                name: rasterMetadata.variable.name + (rasterMetadata.variable.levels?(" - " + rasterMetadata.variable.levels[level]):""),
                level,
                point: this.options.point.config
            }
        }
        let {temporality, timeDef} = G4Query.createDefaultTimeDefForRaster(this.options.layer.dataSet.temporality)
        this.config.serie1.temporality = temporality;
        this.config.serie1.timeDef = timeDef;
        this.q1 = G4Query.createTimeSerie(this.config.serie1);
    }

    callRefresh() {
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = setTimeout(_ => {
            this.refreshTimer = null;
            this.refresh();
        }, 100);
    }

    rebuild(config) {
        if (this.chart) this.chart.dispose();
        this.chart = null;
        this.deserialize(config);
        this.q1 = this.config.serie1?(G4Query.createTimeSerie(this.config.serie1)):null;
        this.q2 = this.config.serie2?(G4Query.createTimeSerie(this.config.serie2)):null;
        this.callRefresh();
    }
    async refresh() {
        this.triggerEvent("startWorking");
        try {
            if (this.q1) {
                this.serie1 = await this.q1.execute();
            }
            if (this.q2) {
                this.serie2 = await this.q2.execute();
            }
        } catch(error) {
            console.error(error);
        } finally {
            this.triggerEvent("stopWorking");
        }
        this.repaint();
    }

    async repaint() {
        if (this.q1) {
            if (!this.chart) {
                if (!this.root) {
                    this.root = am5.Root.new("timeSerieContainer" + this.zId);
                    this.root.locale = am5locales_es_ES;
                    //this.root.setThemes([am5themes_Animated.new(this.root), am5themes_Dark.new(this.root)])
                    this.root.setThemes([am5themes_Animated.new(this.root)])
                }
                let chart = this.root.container.children.push(am5xy.XYChart.new(this.root, {
                    panX: true, panY: true, wheelX: "panX", wheelY: "zoomX",
                    //layout: this.root.horizontalLayout
                    layout: this.root.verticalLayout
                }));                
                chart.set("cursor", am5xy.XYCursor.new(this.root, {behavior: "none"}));        
                this.root.dateFormatter.set("dateFormat", "dd/MMM/yyyy HH:mm");
                let dateAxis = chart.xAxes.push(am5xy.DateAxis.new(this.root, {
                    baseInterval: G4Query.baseIntervals[this.config.serie1.temporality], //{"timeUnit": "hour","count": 1},
                    renderer: am5xy.AxisRendererX.new(this.root, {cellStartLocation: 0.1,cellEndLocation: 0.9}),
                    tooltip: am5.Tooltip.new(this.root, {})
                }));
                let valueAxis = chart.yAxes.push(am5xy.ValueAxis.new(this.root, {
                    renderer: am5xy.AxisRendererY.new(this.root, {})            
                }));
                let unit =  this.config.serie1.accum == "n"?"n":this.config.serie1.variable.unit;
                valueAxis.children.moveValue(am5.Label.new(this.root, { text: unit, rotation: -90, y: am5.p50, centerX: am5.p50 }), 0);
                let legend = chart.children.push(am5.Legend.new(this.root, {centerX: 0, x: 50}));
                let serie = chart.series.push(am5xy.LineSeries.new(this.root, {
                    name:this.config.serie1.name, xAxis: dateAxis, yAxis: valueAxis,
                    valueYField: "value", valueXField: "time",
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "[bold]{name}[/]\n{valueX.formatDate()}: {valueY} [" + unit + "]"
                    })
                }));
                serie.data.setAll(this.serie1);
                legend.data.push(serie);
                dateAxis.start = 0.0;
                dateAxis.keepSelection = true;
                this.chart = chart;
            } else {
                console.log("serie0", this.chart.series.getIndex(0));
                this.chart.series.getIndex(0).data.setAll(this.serie1);                
            }
        }
    }

    configure() {
        this.showDialog("./WConfTimeSerie", this.serialize(), config => this.rebuild(config))
    }
    dependsOnTime() {
        if (this.config.serie1.timeDef.t0.type == "relative" || this.config.serie1.timeDef.t1.type == "relative") return true;
        if (!this.config.serie2) return false;
        return this.config.serie2.timeDef.t0.type == "relative" || this.config.serie2.timeDef.t1.type == "relative";
    }

}
ZVC.export(TimeSerie);