import { expect } from "chai";
import * as fs from "fs-extra";

import InsightFacade from "../src/controller/InsightFacade";
import Server from "../src/rest/Server";
import Log from "../src/Util";

import chai = require("chai");
import chaiHttp = require("chai-http");
import Response = ChaiHttp.Response;

describe("Facade D3", () => {
    let facade: InsightFacade = null;
    let server: Server = null;

    let SERVER_URL: string = "localhost:4321";

    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        rooms: "./test/data/rooms.zip"
    };
    let datasets: { [id: string]: Buffer } = {};

    chai.use(chaiHttp);

    before(function () {
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]);
        }
        server = new Server(4321);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it("PUT courses dataset", function () {
        try {
            return chai.request(SERVER_URL)
                .put("/dataset/courses-server/courses")
                .send(datasets["courses"])
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    Log.test(err);
                    expect.fail();
                });
        } catch (err) {
            Log.test(err);
        }
    });

    it("PUT courses dataset", function () {
        try {
            return chai.request(SERVER_URL)
                .put("/dataset/courses-server/courses")
                .send(datasets["courses"])
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            Log.test(err);
        }
    });

    it("LIST datasets", function () {
        try {
            return chai.request(SERVER_URL)
                .get("/datasets")
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    Log.test(err);
                    expect.fail();
                });
        } catch (err) {
            Log.test(err);
        }
    });

    it("DEL 1 courses dataset", function () {
        try {
            return chai.request(SERVER_URL)
                .del("/dataset/courses-server")
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    Log.test(err);
                    expect.fail();
                });
        } catch (err) {
            Log.test(err);
        }
    });

    it("DEL 2 courses dataset", function () {
        try {
            return chai.request(SERVER_URL)
                .del("/dataset/courses-server")
                .then(function (res: Response) {
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(404);
                });
        } catch (err) {
            Log.test(err);
        }
    });

    it("LIST datasets", function () {
        try {
            return chai.request(SERVER_URL)
                .get("/datasets")
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    Log.test(err);
                    expect.fail();
                });
        } catch (err) {
            Log.test(err);
        }
    });

    it("PUT rooms dataset", function () {
        try {
            return chai.request(SERVER_URL)
                .put("/dataset/rooms-server/rooms")
                .send(datasets["rooms"])
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    Log.test(err);
                    expect.fail();
                });
        } catch (err) {
            Log.test(err);
        }
    });

    it("LIST datasets", function () {
        try {
            return chai.request(SERVER_URL)
                .get("/datasets")
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    Log.test(err);
                    expect.fail();
                });
        } catch (err) {
            Log.test(err);
        }
    });

    it("DEL 1 rooms dataset", function () {
        try {
            return chai.request(SERVER_URL)
                .del("/dataset/rooms-server")
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    Log.test(err);
                    expect.fail();
                });
        } catch (err) {
            Log.test(err);
        }
    });

    it("POST query", function () {
        let query = {
            WHERE: {
                EQ: {
                    courses_fail: 90
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_fail",
                    "courses_pass"
                ]
            }
        };
        try {
            return chai.request(SERVER_URL)
                .post("/query")
                .send(query)
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    Log.test(err);
                    expect.fail();
                });
        } catch (err) {
            Log.test(err);
        }
    });
});
