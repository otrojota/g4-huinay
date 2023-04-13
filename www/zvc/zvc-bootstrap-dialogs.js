ZVC.openDialogInPlatform = dialog => {
    let d = dialog.view.firstChild;
    d._modal = new bootstrap.Modal(d, {how:false, keyboard:true, backdrop:"static"});
    d.addEventListener("hidden.bs.modal", () => {
        if (!dialog._closedFromController) {
            dialog.cancel();            
        }
    });
    d._modal.show();
}
ZVC.closeDialogInPlatform = dialog => {
    let d = dialog.view.firstChild;
    d._modal.hide();
}