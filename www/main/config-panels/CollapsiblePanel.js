class CollapsiblePanel extends ZCustomController {
    async onThis_init(options) {
        this.title.text = options.title;
        await this.panelLoader.load(options.panel, options.panelOptions);
    }

    onTitleRow_click() {
        this.toggle();
    }
    toggle() {
        if (this.chevron.hasClass("expanded")) {
            this.chevron.removeClass("expanded")
            this.panelLoader.removeClass("expanded");
            setTimeout(_ => this.panelLoader.hide(), 400);
        } else {
            this.chevron.addClass("expanded")
            this.panelLoader.show();
            setTimeout(_ => this.panelLoader.addClass("expanded"), 10);
            
        }
    }
}
ZVC.export(CollapsiblePanel);