// Datepicker para:
//   https://mymth.github.io/vanillajs-datepicker
//   Requiere luxon. Usa window.TZ o data-tz o adivina


class ZDatePicker extends ZController {
    onThis_init() {
        this.tz = this.view.getAttribute("data-tz") || window.TZ || luxon.DateTime.local().zoneName;
        this.format = this.view.getAttribute("data-format") || "dd/mm/yyyy";
        this.buttonClass = this.view.getAttribute("data-button-class") || "btn";
        this.title = this.view.getAttribute("data-title") || "Fecha";
        this.datepicker = new Datepicker(this.view, {
            format:this.format, buttonClass:this.buttonClass, title:this.title, autohide: true, language:"es"
        });
        this.view.addEventListener("changeDate", _ => {
            this.isNull = false;
            this.triggerEvent("change")
        });
        this.isNull = true;
    }
    
    get value() {
        if (this.isNull) return null;
        let dt = this.datepicker.getDate();
        return {year:dt.getFullYear(), month:dt.getMonth() + 1, day:dt.getDate()};
    }
    set value(v) {
        if (!v) {
            this.clear();
            return;
        }
        if (isNaN(v.year)) throw "Se esperaba un objeto (year, month(1-12), day)"
        this.isNull = false;
        let dt = new Date(v.year, v.month - 1, v.day);
        this.datepicker.setDate(dt);
    }

    clear() {
        this.isNull = true;
        this.view.value="";
    }
}

Datepicker.locales.es = {
    days: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
    daysShort: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
    daysMin: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"],
    months: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
    monthsShort: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    today: "Hoy",
    clear: "Limpiar",
    titleFormat: "MM y",
    format: "dd/mm/yyyy",
    weekStart: 1
}

ZVC.registerComponent("INPUT", e => (e.classList.contains("date")), ZDatePicker);