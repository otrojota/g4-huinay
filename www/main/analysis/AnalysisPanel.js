const analysysPanels = {
    "time-serie":"./panels/timeSerie/TimeSerie"
}

class AnalysisPanel extends ZCustomController {
    onThis_init() {
        this.areas = [{id:this.uuid(), name:"Análisis", windows:[]}]  
        this.selectedAreaIndex = 0;
        this.windowsListener = {
            close: w => this.closeWindow(w),
            mouseHeaderDown: (w, e) => this.mouseHeaderDown(w, e),
            mouseBorderDown: (w, e, border) => this.mouseBorderDown(w, e, border),
            getMoveInfo: w => {
                let {area, window} = this.getWindowInfo(w.id);
                return {areas: this.areas, idx: this.areas.indexOf(area)};
            },
            moveToArea: (w, idx) => {
                let {area, window} = this.getWindowInfo(w.id);
                area.windows.splice(area.windows.indexOf(window), 1);
                this.areas[idx].windows.push(window);
                this.repositionWindows();
            },
            repositionWindows: _ => this.repositionWindows()
        }
        this.analysisCanvas.view.addEventListener("mousemove", e => this.mouseMove(e))
        this.analysisCanvas.view.addEventListener("mouseup", e => this.mouseUp(e))
        window.g4.on("time-change", _ => this.timeChanged());
    }

    onThis_activated() {
        this.hideContent();
    }

    uuid() {return window.g4.uuidv4()}


    onCmdCloseAnalysis_click() {
        this.hide();
        this.triggerEvent("close");
    }
    onCmdExpandAnalysis_click() {
        this.triggerEvent("toggleExpanded");
    }
    showMaximized(maximized) {
        if (maximized) this.cmdExpandAnalysis.addClass("expanded");
        else this.cmdExpandAnalysis.removeClass("expanded");
    }

    resize() {
        let thisRect = this.view.parentNode.getBoundingClientRect();
        let headerRect = this.header.view.getBoundingClientRect();
        this.analysisContent.view.style.height = (thisRect.height - headerRect.height - 3) + "px";
        this.analysisContent.view.style.width = (thisRect.width - 10) + "px";
        this.analysisContent.view.style.top = (headerRect.height) + "px";
        this.resizeCanvas();
    }
    resizeCanvas() {
        let thisRect = this.view.parentNode.getBoundingClientRect();
        let headerRect = this.header.view.getBoundingClientRect();
        let minWidth = thisRect.width - 20;
        let minHeight = thisRect.height - headerRect.height - 20;
        let area = this.areas[this.selectedAreaIndex];
        let maxX, maxY;
        for (let w of area.windows) {
            if (!maxX || w.rect.left + w.rect.width > maxX) maxX = w.rect.left + w.rect.width;
            if (!maxY || w.rect.top + w.rect.height > maxY) maxY = w.rect.top + w.rect.height;
        }
        maxX += 50;
        maxY += 50;
        let w = Math.max(maxX, minWidth);
        let h = Math.max(maxY, minHeight);
        this.analysisCanvas.view.style.width = w + "px";
        this.analysisCanvas.view.style.height = h + "px";
    }
    showContent() {
        this.show();
        this.paintHeader();
        this.resize();
        this.refreshDirtyWindows();
    }
    hideContent() {
        this.hide();
    }
    paintHeader() {
        let html = this.areas.reduce((html, area, idx) => {
            let canClose = this.areas.length > 1;
            html += `
                <li class="nav-item ${idx > 0?"ms-2":""}">
                    <div class="nav-link ${idx == this.selectedAreaIndex?"active":""}">
                        <a class="tab-folder text-dark" href="#" data-idx="${idx}">
                            ${area.name}
                        </a>
                        <div style="display: inline;">
                            <button id="cmdMenu" class="ms-2 analysis-tab-menu" data-toggle="dropdown" data-bs-toggle="dropdown" type="button"><i class="fas fa-ellipsis-vertical"></i></button>
                            <ul class="dropdown-menu" aria-labelledby="cmdMenu">
                                <li><a class="dropdown-item ${(canClose?"":"disabled")} menu-area" data-idx="${idx}" data-menu="close" href="#">Cerrar esta Área de Trabajo</a></li>
                                <li><a class="dropdown-item ${(canClose?"":"disabled")} menu-area" data-idx="${idx}" data-menu="close-others" href="#">Cerrar las Otras Áreas</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item menu-area" data-idx="${idx}" data-menu="rename" href="#">Cambiar Nombre</a></li>
                            </ul>
                        </div>
                    </div>
                </li>
            `;
            return html;
        }, "");
        html += `
            <li class="nav-item ms-2 pt-2">
                <button id="cmdNewTab" class="ms-2 analysis-tab-menu" data-idx="-1" type="button"><i class="fas fa-plus"></i></button>
            </li>
        `;
        
        this.tabsContainer.html = `<ul class="nav nav-tabs">` + html + `</ul>`;
        this.tabsContainer.find("#cmdNewTab").addEventListener("click", _ => {
            this.areas.push({name:"Area 2", windows:[], id:this.uuid()})
            this.paintHeader();
        })
        this.tabsContainer.findAll(".tab-folder").forEach(a => {
            a.addEventListener("click", _ => {
                this.tabsContainer.find(".tab-folder[data-idx='" + this.selectedAreaIndex + "'").parentNode.classList.remove("active");
                let idx = parseInt(a.getAttribute("data-idx"));
                this.selectedAreaIndex = parseInt(idx);
                this.tabsContainer.find(".tab-folder[data-idx='" + this.selectedAreaIndex + "'").parentNode.classList.add("active");
                this.repositionWindows();
                this.refreshDirtyWindows();
            })
        });
    }

    repositionWindows() {
        this.resizeCanvas();
        let idAreaActiva = this.areas[this.selectedAreaIndex].id;
        for (let a of this.areas) {
            for (let w of a.windows) {
                w.view.remove();
                console.log("w removed");
                if (a.id == idAreaActiva) {
                    this.analysisCanvas.view.appendChild(w.view);
                    w.view.style.left = w.rect.left + "px";
                    w.view.style.top = w.rect.top + "px";
                    w.view.style.width = w.rect.width + "px";
                    w.view.style.height = w.rect.height + "px";
                    w.resize();
                }
            }
        }
        this.resizeCanvas();
    }
    async openAnalysis(type, config) {
        let panel = analysysPanels[type];
        if (!panel) throw "No se reconoce el tipo de análisis '" + type + "'";
        let newWindowContainer = document.createElement("div");
        newWindowContainer.style.position = "absolute";
        let newId = this.uuid();
        newWindowContainer.id = newId;
        let newWindow = await ZVC.loadComponent(newWindowContainer, this, "./Window");
        newWindow.rect = {left: 200, top:50, width: 500, height:200}
        await newWindow.init({panel, panelConfig:config, listener: this.windowsListener});
        await newWindow.activate();
        await window.g4.mainController.openBottomPanel();
        this.areas[this.selectedAreaIndex].windows.push(newWindow);
        this.repositionWindows();
    }

    getWindowInfo(id) {
        for (let a of this.areas) {
            for (let w of a.windows) {
                if (w.id == id) {
                    return {area: a, window: w}
                }
            }
        }
        return {area:null, window: null}
    }
    closeWindow(w) {
        let {area, window} = this.getWindowInfo(w.id);
        let idx = area.windows.findIndex(w2 => w2.id == w.id);
        area.windows.splice(idx, 1);
        window.view.remove();
        this.repositionWindows();
    }
    mouseMove(e) {
        console.log("canvas move", e);
    }
    mouseHeaderDown(w, e) {
        // send to top
        let {area, window} = this.getWindowInfo(w.id);
        let idx = area.windows.findIndex(w2 => w2.id == w.id);
        area.windows.splice(idx, 1);
        area.windows.push(window);
        let oldDX = this.dragInfo?this.dragInfo.dx:null;
        let oldDY = this.dragInfo?this.dragInfo.dy:null;
        this.dragInfo = {target: "header", window:w, x0: e.clientX, y0: e.clientY, dx:oldDX, dy:oldDY}
    }
    mouseBorderDown(w, e, border) {
        // send to top
        let {area, window} = this.getWindowInfo(w.id);
        let idx = area.windows.findIndex(w2 => w2.id == w.id);
        area.windows.splice(idx, 1);
        area.windows.push(window);
        this.dragInfo = {target: border, window:w, x0: e.clientX, y0: e.clientY, rect0: w.rect}
    }
    mouseMove(e) {
        if (!this.dragInfo) return;
        let dx = e.clientX - this.dragInfo.x0;
        let dy = e.clientY - this.dragInfo.y0;
        if (isNaN(dx) || isNaN(dy)) return;
        if (this.dragInfo.target == "header") {
            this.dragInfo.window.view.style.translate = dx + "px " + dy + "px";
        } else {
            let r = JSON.parse(JSON.stringify(this.dragInfo.rect0));
            if (this.dragInfo.target.indexOf("e") >= 0) {
                r.width = Math.max(this.dragInfo.rect0.width + dx, 50);
            }
            if (this.dragInfo.target.indexOf("w") >= 0) {                
                r.left += dx;
                r.width -= dx;
                if (r.width < 50) {
                    r.left = this.dragInfo.rect0.left + this.dragInfo.rect0.width - 50;
                    r.width = 50;
                }
            }
            if (this.dragInfo.target.indexOf("s") >= 0) {
                r.height = Math.max(this.dragInfo.rect0.height + dy, 70);
            }
            if (this.dragInfo.target.indexOf("n") >= 0) {
                r.top += dy;
                r.height -= dy;
                if (r.height < 70) {
                    r.top = this.dragInfo.rect0.top + this.dragInfo.rect0.height - 70;
                    r.height = 70;
                }
            }
            this.dragInfo.window.rect = r;
            this.dragInfo.window.resizing();
        }
        this.dragInfo.dx = dx;
        this.dragInfo.dy = dy;
    }
    mouseUp(e) {
        if (!this.dragInfo) return;
        if (this.dragInfo.target == "header") {
            this.dragInfo.window.view.style.removeProperty("translate");
            this.dragInfo.window.rect.left += this.dragInfo.dx;
            if (this.dragInfo.window.rect.left < 0) this.dragInfo.window.rect.left = 0;
            this.dragInfo.window.rect.top += this.dragInfo.dy;
            if (this.dragInfo.window.rect.top < 0) this.dragInfo.window.rect.top = 0;
        }
        this.dragInfo = null;
        this.repositionWindows();        
    }

    refreshDirtyWindows() {
        for (let w of this.areas[this.selectedAreaIndex].windows) {
            if (w.dirty) {
                w.refresh();
                w.dirty = false;
            }
        }
    }
    timeChanged() {
        for (let i=0; i<this.areas.length; i++) {
            let active = (i == this.selectedAreaIndex);
            for (let w of this.areas[i].windows) {
                if (w.dependsOnTime()) {
                    if (active && window.g4.mainController.bottomPanelOpened) w.refresh();
                    else w.dirty = true;
                }
            }
        }
    }
}
ZVC.export(AnalysisPanel);