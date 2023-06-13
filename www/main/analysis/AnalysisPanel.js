class AnalysisPanel extends ZCustomController {
    onThis_init() {
        this.areas = [{name:"Análisis", windows:[]}]  
        this.selectedAreaIndex = 0;
    }

    onThis_activated() {
        this.hideContent();
    }

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
        this.analysisContent.view.style.top = (headerRect.height) + "px";

    }
    showContent() {
        this.show();
        this.paintHeader();
        this.resize();
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
                        <a class="text-dark" href="#">
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
            this.areas.push({name:"Area 2", windows:[]})
            this.paintHeader();
        })
        this.tabsContainer.findAll(".analysis-tab-menu").forEach(button => {
            button.addEventListener("click", _ => {
                let idx = parseInt(button.getAttribute("data-idx"));
                if (idx >= 0) {
                    this.showTabContextMenu(button, idx);
                }
            })
        });
    }

    showTabContextMenu(button, index) {

    }
}
ZVC.export(AnalysisPanel);