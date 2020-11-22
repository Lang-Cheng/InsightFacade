import {
    InsightTransformations, InsightData, InsightDatasetKind,
    InsightCourse, InsightSection, InsightRoom, InsightApplyRule, InsightApplyToken, InsightRow
} from "./IInsightFacade";
import { stringify } from "querystring";
import { QueryRunnerHelper } from "./QueryRunnerHelper";
import Log from "../Util";
import Decimal from "decimal.js";

export class QueryTransformations {
    public qrh: QueryRunnerHelper;
    public groupColumnsTypes: string[];
    private dataMap: Map<string, InsightData>;

    constructor(qrh: QueryRunnerHelper) {
        this.qrh = qrh;
    }

    public applyTransfomrations(transformations: InsightTransformations, data: InsightData[]): InsightRow[] {
        this.groupColumnsTypes = [];
        this.dataMap = this.createDataMap(data);

        const groupMap = this.applyGroup(transformations.GROUP);

        const applyNames = this.getApplyNames(transformations.APPLY);
        const result: InsightRow[] = this.applyApply(transformations.APPLY, transformations.GROUP, groupMap);

        return result;
    }

    private applyGroup(groupKeys: string[]): Map<string, string[]> {
        let groupMap: Map<string, string[]> = new Map<string, string[]>();

        for (const row of this.dataMap.values()) {
            const groupId = this.getGroupId(groupKeys, row);
            if (groupMap.has(groupId)) {
                let groupValues: string[] = groupMap.get(groupId);
                groupValues.push(this.qrh.getId(row));
                groupMap.set(groupId, groupValues);
            } else {
                groupMap.set(groupId, [this.qrh.getId(row)]);
            }
        }

        return groupMap;
    }

    private applyApply(
        applies: InsightApplyRule[],
        groupKeys: string[],
        groupMap: Map<string, string[]>
    ): InsightRow[] {
        const rows: InsightRow[] = [];
        for (const groupId of groupMap.keys()) {
            const row: InsightRow = {};
            const datasetIds = groupMap.get(groupId);
            const values: string[] = groupId.split("^");

            for (let i = 0; i < values.length; i++) {
                const key = groupKeys[i];
                let value = values[i];
                const type = this.groupColumnsTypes[i];
                if (type === "number") {
                    row[key] = +value;
                } else {
                    row[key] = value;
                }
            }

            for (const apply of applies) {
                const applyName: string = Object.keys(apply)[0];
                const applyObject: InsightApplyToken = Object.values(apply)[0];
                const type: string = Object.keys(applyObject)[0];
                const key: string = Object.values(applyObject)[0].split("_")[1];
                let applyResult;
                switch (type) {
                    case "MAX":
                        applyResult = this.computeMax(datasetIds, key);
                        break;
                    case "MIN":
                        applyResult = this.computeMin(datasetIds, key);
                        break;
                    case "AVG":
                        applyResult = this.computeAvg(datasetIds, key);
                        break;
                    case "COUNT":
                        applyResult = this.computeCount(datasetIds, key);
                        break;
                    case "SUM":
                        applyResult = this.computeSum(datasetIds, key);
                        break;
                }
                row[applyName] = applyResult;
            }
            rows.push(row);
        }

        return rows;
    }

    private getApplyNames(applies: InsightApplyRule[]): string[] {
        const names: string[] = [];
        for (const a of applies) {
            names.push(Object.keys(a)[0]);
        }
        return names;
    }

    private getGroupId(groupKeys: string[], row: InsightData): string {
        let groupId = "";
        for (const k of groupKeys) {
            let id = this.qrh.getDataProp(k.split("_")[1], row);
            this.groupColumnsTypes.push(typeof id);
            groupId += id.toString() + "^";
        }
        return groupId.slice(0, groupId.length - 1);
    }

    private createDataMap(data: InsightData[]) {
        let map: Map<string, InsightData> = new Map<string, InsightData>();
        for (const d of data) {
            map.set(this.qrh.getId(d), d);
        }
        return map;
    }

    private computeMax(ids: string[], key: string): number {
        let currentMax = null;
        for (const id of ids) {
            const data = this.dataMap.get(id);
            const prop = this.qrh.getDataProp(key, data);
            if (currentMax === null || prop > currentMax) {
                currentMax = +prop;
            }
        }
        return currentMax;
    }

    private computeMin(ids: string[], key: string): number {
        let currentMin = null;
        for (const id of ids) {
            const data = this.dataMap.get(id);
            const prop = this.qrh.getDataProp(key, data);
            if (currentMin === null || prop < currentMin) {
                currentMin = +prop;
            }
        }
        return currentMin;
    }

    private computeAvg(ids: string[], key: string): number {
        let sum = new Decimal(0);
        let num = 0;
        for (const id of ids) {
            const data = this.dataMap.get(id);
            const prop = this.qrh.getDataProp(key, data);
            sum = Decimal.add(sum, new Decimal(prop));
            num++;
        }
        const avg = sum.toNumber() / num;
        return Number(avg.toFixed(2));
    }

    private computeSum(ids: string[], key: string): number {
        let sum = new Decimal(0);
        for (const id of ids) {
            const data = this.dataMap.get(id);
            const prop = this.qrh.getDataProp(key, data);
            sum = Decimal.add(sum, new Decimal(prop));
        }
        return Number(sum.toFixed(2));
    }

    private computeCount(ids: string[], key: string): number {
        let count = 0;
        let checkOccurrence = [];

        for (const id of ids) {
            const data = this.dataMap.get(id);
            const prop = this.qrh.getDataProp(key, data);
            if (checkOccurrence.indexOf(prop) === -1) {
                checkOccurrence.push(prop);
                count++;
            }
        }
        return count;
    }
}
