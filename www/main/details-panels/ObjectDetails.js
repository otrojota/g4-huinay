class ObjectDetails extends ZCustomController {
    onThis_init(options) {
        let e = options.element;
        console.log("element", e);
    }
}
ZVC.export(ObjectDetails);