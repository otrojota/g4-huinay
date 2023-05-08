class FeatureProperties extends ZCustomController {
    onThis_init(options) {
        let props = options.element.feature.properties || options.element.feature.geometry.properties;
        let names = Object.keys(props).sort();
        let idx = names.indexOf("id");
        if (idx >= 0) {
            names.splice(idx, 1);
            names.splice(0,0,"id")
        }
        let html = names.reduce((html, name) => {
            html += `
            <li class="list-group-item d-flex justify-content-between align-items-start">
                <div class="ms-2 me-auto">
                    <div class="fw-bold">${name}</div>
                    ${props[name]}
                </div>
            </li>
            `;
            
            return html;
        }, "")
        this.propsContainer.html = "<ul class='list-group'>" + html + "</ul>";
    }
}
ZVC.export(FeatureProperties);