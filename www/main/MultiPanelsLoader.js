class MultiPanelsLoader extends ZCustomController {
    onThis_init(options) {
        this.panels = options.panels;
        this.rptPanels.refresh();
    }

    onRptPanels_getRows() {
        return this.panels;
    }
}
ZVC.export(MultiPanelsLoader);