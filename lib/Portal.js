import { ZModule } from "./z-server.js";
import config from "./Config.js";

class Portal extends ZModule {
    static get instance() {
        if (Portal.singleton) return Portal.singleton;
        Portal.singleton = new Portal();
        return Portal.singleton;
    }

    async getConfig() {
        try {
            let cfg = await config.getConfig();
            return cfg;
        } catch (error) {
            throw error;
        }
    }
}

export default Portal.instance;