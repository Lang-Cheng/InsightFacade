/**
 * Created by rtholmes on 2016-06-19.
 */

import fs = require("fs");
import restify = require("restify");


import { InsightDatasetKind, InsightError, InsightQuery } from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";
import Log from "../Util";

/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private rest: restify.Server;
    private static insightFacade: InsightFacade;

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
        Server.insightFacade = new InsightFacade();
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        return new Promise(function (fulfill, reject) {
            try {
                Log.info("Server::start() - start");

                that.rest = restify.createServer({
                    name: "insightUBC",
                });
                that.rest.use(restify.bodyParser({ mapFiles: true, mapParams: true }));
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });

                // This is an example endpoint that you can invoke by accessing this URL in your browser:
                // http://localhost:4321/echo/hello
                // that.rest.get("/echo/:msg", Server.echo);
                that.rest.get("/datasets", Server.listDatasets);
                that.rest.put("/dataset/:id/:kind", Server.addDataset);
                that.rest.del("/dataset/:id", Server.removeDataset);
                that.rest.post("/query", Server.query);

                // NOTE: your endpoints should go here

                // This must be the last endpoint!
                that.rest.get("/.*", Server.getStatic);

                that.rest.listen(that.port, function () {
                    Log.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });

                that.rest.on("error", function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal
                    // node not using normal exceptions here
                    Log.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });

            } catch (err) {
                Log.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }

    // // The next two methods handle the echo service.
    // // These are almost certainly not the best place to put these, but are here for your reference.
    // // By updating the Server.echo function pointer above, these methods can be easily moved.
    // private static echo(req: restify.Request, res: restify.Response, next: restify.Next) {
    //     Log.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
    //     try {
    //         const response = Server.performEcho(req.params.msg);
    //         Log.info("Server::echo(..) - responding " + 200);
    //         res.json(200, { result: response });
    //     } catch (err) {
    //         Log.error("Server::echo(..) - responding 400");
    //         res.json(400, { error: err });
    //     }
    //     return next();
    // }

    // private static performEcho(msg: string): string {
    //     if (typeof msg !== "undefined" && msg !== null) {
    //         return `${msg}...${msg}`;
    //     } else {
    //         return "Message not provided";
    //     }
    // }

    private static addDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::addDataset(..) - params: " + JSON.stringify(req.params));
        const id = req.params["id"];
        const kind = req.params["kind"] as InsightDatasetKind;
        const buffer: Buffer = req.body;
        const body = buffer.toString("base64");
        Server.insightFacade.addDataset(id, body, kind).then((response) => {
            Log.info("Server::addDataset(..) - responding 200");
            res.json(200, { result: response });
        }).catch((err: Error) => {
            Log.error("Server::addDataset(..) - responding 400");
            res.json(400, { error: err.message });
        });
        return next();
    }

    private static removeDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::removeDataset(..) - params: " + JSON.stringify(req.params));
        const id = req.params["id"];
        Server.insightFacade.removeDataset(id).then((response) => {
            Log.info("Server::removeDataset(..) - responding 200");
            res.json(200, { result: response });
        }).catch((err: Error) => {
            if (err instanceof InsightError) {
                Log.error("Server::removeDataset(..) - responding 400");
                res.json(400, { error: err.message });
            } else {
                Log.error("Server::removeDataset(..) - responding 404");
                res.json(404, { error: err.message });
            }
        });
        return next();
    }


    private static listDatasets(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::listDataset(..) - params: ");
        Server.insightFacade.listDatasets().then((response) => {
            Log.info("Server::listDataset(..) - responding 200");
            res.json(200, { result: response });
        }).catch((err: Error) => {
            Log.error("Server::listDataset(..) - responding 400");
            res.json(400, { error: err.message });
        });
        return next();
    }


    private static query(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::query(..) - params: " + JSON.stringify(req.body));
        let query: InsightQuery = req.body;
        Server.insightFacade.performQuery(query).then((response) => {
            Log.info("Server::query(..) - responding 200");
            res.json(200, { result: response });
        }).catch((err: Error) => {
            Log.error("Server::query(..) - responding 400");
            Log.error(err.message);
            res.json(400, { error: err.message });
        });
        return next();
    }

    private static getStatic(req: restify.Request, res: restify.Response, next: restify.Next) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

}
