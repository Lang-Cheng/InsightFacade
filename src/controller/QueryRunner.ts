import Log, { intersection, loadData, subtract, union } from "../Util";
import {
    InsightError, InsightFilter, InsightOptions,
    InsightQuery, InsightSection, InsightDatasetKind, InsightData, InsightCourse, InsightRoom, InsightOrder, InsightRow
} from "./IInsightFacade";

import { QueryRunnerHelper } from "./QueryRunnerHelper";
import { QueryTransformations } from "./QueryTransformations";

export default class QueryRunner {
    public datasetId: string;
    public kind: InsightDatasetKind;
    public data: InsightData[];
    public dataMap: Map<string, InsightData> = new Map<string, InsightData>();
    public qrh: QueryRunnerHelper;
    public qt: QueryTransformations;
    public query: InsightQuery;

    constructor() {
        this.qrh = new QueryRunnerHelper();
        this.qt = new QueryTransformations(this.qrh);
    }

    public runQuery(rawQuery: any, datasetId: string, kind: InsightDatasetKind): object[] {
        this.datasetId = datasetId;
        this.kind = kind;
        this.data = [];
        this.dataMap = new Map<string, InsightData>();
        this.query = rawQuery;
        this.qrh.kind = kind;

        if (this.kind === InsightDatasetKind.Courses) {
            this.data = loadData(datasetId);
            for (const section of this.data as InsightSection[]) {
                this.dataMap.set(section.uuid, section);
            }
        } else {
            this.data = loadData(datasetId);
            for (const room of this.data as InsightRoom[]) {
                this.dataMap.set(room.name, room);
            }
        }

        this.datasetId = datasetId;
        const query: InsightQuery = rawQuery;
        let result;
        if (Object.keys(query.WHERE).length === 0) {
            result = this.data;
        } else {
            result = [...this.run(query.WHERE).values()];
        }

        if (query.TRANSFORMATIONS) {
            result = this.qt.applyTransfomrations(query.TRANSFORMATIONS, result);
        }

        result = this.applyOptions(query.OPTIONS, result as InsightRow[]);

        return result;
    }

    private run(filter: InsightFilter): Map<string, InsightData> {
        const operator = Object.keys(filter)[0];
        let result = new Map<string, InsightData>();
        switch (operator) {
            case "AND":
                const and = filter.AND;
                result = this.run(and[0]);
                and.splice(0, 1);
                for (const f of and) {
                    result = intersection(result, this.run(f));
                }
                break;
            case "OR":
                const or = filter.OR;
                result = this.run(or[0]);
                or.splice(0, 1);
                for (const f of or) {
                    result = union(result, this.run(f));
                }
                break;
            case "LT":
                const lt = filter.LT;
                result = this.performComparison(lt, "lt");
                break;
            case "GT":
                const gt = filter.GT;
                result = this.performComparison(gt, "gt");
                break;
            case "EQ":
                const eq = filter.EQ;
                result = this.performComparison(eq, "eq");
                break;
            case "IS":
                const is = filter.IS;
                result = this.performComparison(is, "is");
                break;
            case "NOT":
                const not = filter.NOT;
                result = subtract(this.dataMap, this.run(not));
                break;
            default:
                throw new InsightError("Invalid filter key");
        }
        return result;
    }

    private performComparison(
        object: { [property: string]: number | string },
        type: "lt" | "gt" | "eq" | "is"
    ): Map<string, InsightData> {
        const entry = Object.entries(object)[0];
        const key = entry[0].split("_")[1];
        const value = entry[1];
        const dataMap: Map<string, InsightData> = new Map<string, InsightData>();
        for (const d of this.data) {
            switch (type) {
                case "lt":
                    if (this.qrh.getDataProp(key, d) < value) {
                        this.setMap(d, dataMap);
                    }
                    break;
                case "gt":
                    if (this.qrh.getDataProp(key, d) > value) {
                        this.setMap(d, dataMap);
                    }
                    break;
                case "eq":
                    if (this.qrh.getDataProp(key, d) === value) {
                        this.setMap(d, dataMap);
                    }
                    break;
                case "is":
                    const r = this.qrh.compareString(key, value as string, d);
                    if (r) {
                        this.setMap(d, dataMap);
                    }
            }
        }
        return dataMap;
    }

    private setMap(d: InsightData, dataMap: Map<string, InsightData>) {
        if (this.kind === InsightDatasetKind.Courses) {
            dataMap.set((d as InsightSection).uuid, d);
        } else {
            dataMap.set((d as InsightRoom).name, d);

        }
    }

    private applyOptions(options: InsightOptions, data: InsightRow[]): InsightRow[] {
        if (options.ORDER) {
            if (typeof options.ORDER === "string") {
                let order = options.ORDER as string;
                if (!this.query.TRANSFORMATIONS) {
                    order = order.split("_")[1];
                }
                data = this.sortOrderString(data, order);
            } else {
                let order = options.ORDER as InsightOrder;
                const orderKeys: string[] = [];
                const dirUp = order.dir === "UP";
                for (const k of order.keys) {
                    let type: string = k;
                    if (!this.query.TRANSFORMATIONS) {
                        type = type.split("_")[1];
                    }
                    orderKeys.push(type);
                }
                data = this.sortOrderObject(data, orderKeys, dirUp);
            }
        }

        const result: InsightRow[] = [];
        const cols = options.COLUMNS;
        for (const d of data) {
            let obj: InsightRow = {};
            for (const c of cols) {
                if (this.query.TRANSFORMATIONS) {
                    obj[c] = d[c];
                } else {
                    obj[c] = d[c.split("_")[1]];
                }
            }
            result.push(obj);
        }

        return result;
    }

    private sortOrderString(data: InsightRow[], order: string): InsightRow[] {
        data.sort((d1, d2) => {
            const prop1 = d1[order];
            const prop2 = d2[order];
            return (prop1 > prop2) ? 1 : ((prop2 > prop1) ? -1 : 0);
        });
        return data;
    }

    private sortOrderObject(data: InsightRow[], orderKeys: string[], dirUp: boolean): InsightRow[] {
        data.sort((d1, d2) => {
            let prop1 = d1[orderKeys[0]];
            let prop2 = d2[orderKeys[0]];
            const restOrderKeys = orderKeys.slice(1, orderKeys.length);

            if (!dirUp) {
                const temp = prop2;
                prop2 = prop1;
                prop1 = temp;
            }

            return (prop1 > prop2) ? 1 : ((prop2 > prop1) ? -1 : this.resolveTie(d1, d2, restOrderKeys, dirUp));
        });
        return data;
    }

    private resolveTie(d1: InsightRow, d2: InsightRow, orderKeys: string[], dirUp: boolean): -1 | 1 | 0 {
        if (orderKeys.length < 1) {
            return 0;
        }

        let prop1 = d1[orderKeys[0]];
        let prop2 = d2[orderKeys[0]];
        const restOrderKeys = orderKeys.slice(1, orderKeys.length);

        if (!dirUp) {
            const temp = prop2;
            prop2 = prop1;
            prop1 = temp;
        }

        return (prop1 > prop2) ? 1 : ((prop2 > prop1) ? -1 : this.resolveTie(d1, d2, restOrderKeys, dirUp));
    }
}
