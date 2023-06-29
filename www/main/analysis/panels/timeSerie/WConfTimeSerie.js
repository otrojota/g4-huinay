class WConfTimeSerie extends ZDialog {
    async onThis_init(config) {
        this.config = config;
        await this.serie1Loader.content.refresh(this.config.serie1);
        await this.serie2Loader.content.refresh(this.config.serie2);
    }
    onCmdCloseDialog_click() {this.cancel()}

    onCmdOk_click() {
        try {            
            try {
                this.config.serie1 = this.serie1Loader.content.fetch();
            } catch (error) {
                throw "Error en Serie 1: " + error;
            }
            try {
                this.config.serie2 = this.serie2Loader.content.fetch();
            } catch (error) {
                throw "Error en Serie 2: " + error;
            }
            this.close(this.config);
        } catch(error) {
            this.showDialog("common/WError", {message:error});
        }
    }
    onCmdCancel_click() {this.cancel()}
}
ZVC.export(WConfTimeSerie);