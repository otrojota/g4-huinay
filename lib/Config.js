import fs from "fs";
import hjson from "hjson";

class Config {
    static get instance() {
        if (Config.singleton) return Config.singleton;
        Config.singleton = new Config();
        return Config.singleton;
    }

    constructor() {
        this.lastFileTime = 0;
        this.lastCheckedTime = 0;
        this._config = null;
    }

    getConfig() {
        return new Promise((resolve, reject) => {
            if ((Date.now() - this.lastCheckedTime) < 5000) {
                resolve(this._config);
                return;
            }
            fs.stat("/config/portal.hjson", (err, stat) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.lastCheckedTime = Date.now();
                let time = stat.mtime.getTime();
                if (time == this.lastFileTime) {
                    resolve(this._config);
                    return;
                }
                this.lastFileTime = time;
                try {
                    let txt = fs.readFileSync("/config/portal.hjson").toString();
                    this._config = hjson.parse(txt);
                    resolve(this._config);
                } catch(error) {
                    reject(error);
                }
            });
        })
    }
}

export default Config.instance;