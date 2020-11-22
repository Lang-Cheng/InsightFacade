import CoursesController from "./CoursesController";
import DatasetController from "./DatasetController";
import {
    IInsightFacade, InsightData, InsightDataset, InsightDatasetKind, InsightError, NotFoundError
} from "./IInsightFacade";
import QueryController from "./QueryController";
import RoomsController from "./RoomsController";

import JSZip = require("jszip");
import fs = require("fs");
/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    public datasets: InsightDataset[];
    public dc: DatasetController;
    public cc: CoursesController;
    public rc: RoomsController;
    public qc: QueryController;

    constructor() {
        this.datasets = [];
        this.dc = new DatasetController();
        this.cc = new CoursesController();
        this.rc = new RoomsController();
        this.qc = new QueryController();
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return new Promise((resolve, reject) => {
            if (!this.dc.parametersValid(id, content, kind)) {
                return reject(new InsightError("Invalid argument"));
            }
            if (this.datasets.find((d) => {
                return d.id === id;
            })) {
                return reject(new InsightError("Dataset with provided ID already exists"));
            }
            let jszip = new JSZip();
            jszip.loadAsync(content, { base64: true }).then((zip) => {
                if (kind === InsightDatasetKind.Courses) {
                    this.cc.sectionsFromZip(zip).then((data) => {
                        try {
                            const result = this.writeToDisk(id, data, InsightDatasetKind.Courses);
                            resolve(result);
                        } catch (e) {
                            reject(new InsightError(e));
                        }
                    });
                } else if (kind === InsightDatasetKind.Rooms) {
                    this.rc.roomsFromZip(zip).then((data) => {
                        try {
                            const result = this.writeToDisk(id, data, InsightDatasetKind.Rooms);
                            resolve(result);
                        } catch (e) {
                            reject(new InsightError(e));
                        }
                    }).catch((e) => {
                        reject(new InsightError(e));
                    });
                } else {
                    reject(new InsightError("invalid kind"));
                }
            }).catch((e) => {
                reject(new InsightError(e));
            });
        });
    }

    private writeToDisk(id: string, data: InsightData[], kind: InsightDatasetKind): Promise<string[]> {
        return new Promise((resolve) => {
            this.addNewDataset(id, data, kind);
            const path = __dirname + "/../../data/" + id;
            fs.writeFile(path, JSON.stringify(data), async (err) => {
                if (err) {
                    throw new InsightError(err);
                }
                const result: string[] = (this.datasets.map((d) => {
                    return d.id;
                }));

                const mapPath = __dirname + "/../../data/map_file";
                let map = await this.listDatasets();
                fs.writeFile(mapPath, JSON.stringify(map), (errmap) => {
                    if (errmap) {
                        throw new InsightError("Can't Write Map");
                    }
                    resolve(result);
                });
            });
        });
    }

    private addNewDataset(id: string, data: InsightData[], kind: InsightDatasetKind) {
        let numRows = data.length;
        if (numRows > 0) {
            this.datasets.push({
                id,
                kind,
                numRows
            });
        } else {
            throw new InsightError("No valid Data");
        }
    }

    public removeDataset(id: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.dc.isIdValid(id)) {
                reject(new InsightError("Invalid ID"));
                return;
            }
            this.datasets = this.datasets.filter((d) => {
                return d.id !== id;
            });
            const path = __dirname + "/../../data/" + id;
            fs.unlink(path, (error) => {
                if (error) {
                    reject(new NotFoundError("Not found error"));
                }
                resolve(id);
            });
        });
    }

    public performQuery(query: any): Promise<any[]> {
        return new Promise((resolve, reject) => {
            try {
                const result = this.qc.performQuery(query);
                resolve(result);
            } catch (e) {
                reject(e);
            }
        });
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return new Promise((resolve) => {
            resolve(this.datasets);
        });
    }
}
