import zServer from "./lib/z-server.js";
import express from "express"
import bodyParser from "body-parser";
import http from "http";
import fs from "fs";
import portal from "./lib/Portal.js";

async function createHTTPServer() {
    try {
        zServer.registerModule("portal", portal);

        const app = express();
        app.use("/", express.static("www"));
        app.use(bodyParser.urlencoded({limit: '50mb', extended:true}));
        app.use(bodyParser.json({limit: '50mb', extended: true}));

        app.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
            next();
        });
        
        app.post("/*.*", (req, res) => zServer.resolve(req, res));
        let version = "?";
        try {
            let txt = fs.readFileSync("./build.sh").toString();
            txt = txt.split("\n")[0];
            let p = txt.indexOf("=");
            version = txt.substring(p+1);
        } catch(error) {
            console.error(error);
        }

        const port = process.env.HTTP_PORT || 8094;
        const httpServer = http.createServer(app);
        httpServer.listen(port, "::", async _ => {
            console.log("[g4-huinay Portal] [" + version + "]. Servidor HTTP Iniciado en Puerto " + port);
        });
    } catch(error) {
        console.error("No se puede iniciar servicio Portal", error);
        console.error("Exit (-1)")
        process.exit(-1);
    }
}

createHTTPServer();