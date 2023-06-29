class Window extends ZCustomController {
    async onThis_init(options) {
        this.options = options;
        this.listener = options.listener;
        this.title.text = options.panelConfig.title || "Nueva Ventana";
        this.title.view.addEventListener("mousedown", e => this.listener.mouseHeaderDown(this, e));
        this.w.view.addEventListener("mousemove", e => this.mouseMove(e));
        this.w.view.addEventListener("mouseleave", e => this.mouseOut(e));
        this.w.view.addEventListener("mousedown", e => this.mouseDown(e));
        this.inBorder = {top: false, left: false, bottom: false, right: false}
        this.cmdMove.view.addEventListener("show.bs.dropdown", e => this.buildMoveSubmenu())
        this.working.hide();
    }

    buildMoveSubmenu() {
        let {areas, idx} = this.listener.getMoveInfo(this);
        let html = areas.reduce((html, a, i) => {
            return html + `<li><a class="dropdown-item area ${idx == i?"disabled":""}" href="#" data-idx="${i}">${a.name}</a></li>`;

        }, "");
        this.moveMenu.html = html;
        this.moveMenu.findAll(".area").forEach(a => a.addEventListener("click", _ => {
            let idx = parseInt(a.getAttribute("data-idx"));
            this.listener.moveToArea(this, idx);
        }))
    }
    async onThis_activated() {
        console.log("activate window");
        await this.loader.load(this.options.panel, this.options.panelConfig);
        if (!this.loader.content.configure) {
            this.cmdConfigure.view.classList.add("disabled");
        }
    }

    resize() {
        let r = this.view.getBoundingClientRect();
        this.w.view.style.width = r.width + "px"
        this.w.view.style.height = r.height + "px"
        this.title.view.style.width = (r.width - 30) + "px";
        if (this.loader.content.resize) this.loader.content.resize();
    }
    resizing() {        
        let r = this.rect;
        this.view.style.left = r.left + "px";
        this.view.style.top = r.top + "px";
        this.view.style.width = r.width + "px";
        this.view.style.height = r.height + "px";
        this.resize();
        //this.w.view.style.width = r.width + "px";
        //this.w.view.style.height = r.height + "px";
    }

    onCmdClose_click() {
        this.listener.close(this);
    }

    mouseMove(e) {
        this.inBorder = {};
        let x = e.layerX, y = e.layerY;
        this.inBorder.left = x <= 5;
        this.inBorder.right = this.rect.width - x <= 5;
        this.inBorder.top = y <= 5;
        this.inBorder.bottom = this.rect.height - y <= 5;
        //console.log("this.inBorder", this.inBorder);
        let cursor = null;
        this.resizeBorder = null;
        if (this.inBorder.left) {
            if (this.inBorder.top) {cursor = "nw-resize"; this.resizeBorder = "nw"}
            else if (this.inBorder.bottom) {cursor = "sw-resize"; this.resizeBorder = "sw"}
            else {cursor = "w-resize"; this.resizeBorder = "w"}
        } else if (this.inBorder.right) {
            if (this.inBorder.top) {cursor = "ne-resize"; this.resizeBorder = "ne"}
            else if (this.inBorder.bottom) {cursor = "se-resize"; this.resizeBorder = "se"}
            else {cursor = "e-resize"; this.resizeBorder = "e"}
        } else if (this.inBorder.top) {
            cursor = "n-resize"; this.resizeBorder = "n"
        } else if (this.inBorder.bottom) {
            cursor = "s-resize"; this.resizeBorder = "s"
        }
        if (!cursor) this.view.style.removeProperty("cursor");
        else this.view.style.cursor = cursor;
    }
    mouseOut(e) {
        this.resizeBorder = null;
    }
    mouseDown(e) {
        if (this.resizeBorder) {
            this.listener.mouseBorderDown(this, e, this.resizeBorder);
        }
    }

    closeMenu() {
        this.cmdMenu.view.classList.remove("show");
        this.windowMenu.view.classList.remove("show");
    }
    onCmdConfigure_click() {
        this.closeMenu();
        this.loader.content.configure();
    }

    dependsOnTime() {
        if (!this.loader.content.dependsOnTime) return false;
        return this.loader.content.dependsOnTime();
    }
    refresh() {
        if (this.loader.content.callRefresh) {
            this.loader.content.callRefresh();
            return;
        }
        if (this.loader.content.refresh) {
            this.loader.content.refresh();
        }
    }

    onLoader_startWorking() {this.working.show()}
    onLoader_stopWorking() {this.working.hide()}
}
ZVC.export(Window);