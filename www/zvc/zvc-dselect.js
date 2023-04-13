class ZDSelect extends ZDynamicSelect {
    onThis_init() {
        super.onThis_init();
        this.maxHeight = this.view.getAttribute("data-z-max-height") || "360";
        this.search = this.view.getAttribute("data-z-search") == "true";
        this.clearable = this.view.getAttribute("data-z-clearable") == "true";
        this.bsSize = this.view.getAttribute("data-z-bs-size") || null; // sm, lg
        let opts = {maxHeight:this.maxHeight + "px"};
        if (this.search) opts.search = true;
        if (this.clearable) opts.clearable = true;
        if (this.bsSize) opts.size = this.bsSize;
        this.options = opts;
        
    }

    setRows(rows, selectedId=null) {
        super.setRows(rows, selectedId);
        dselect(this.view, this.options);
    }
    get value() {
        return super.value;
    }
    get valuesX() {
        let ds = this.view.nextElementSibling;
        console.log("ds", ds);
        let tags = ds.querySelectorAll(".dselect-tag");
        console.log("tags", tags);
        return [];
    }
    set value(v) {
        super.value = v;
        dselect(this.view, this.options);
    }
}

ZVC.registerComponent("SELECT", e => (e.getAttribute("data-z-id-field") && e.getAttribute("data-z-label-field")), ZDSelect);