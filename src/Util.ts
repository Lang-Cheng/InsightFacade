import { InsightData, InsightDataset, InsightDatasetKind, InsightError } from "./controller/IInsightFacade";

import fs = require("fs");

/* tslint:disable:no-console */

/**
 * Collection of logging methods. Useful for making the output easier to read and understand.
 */
export default class Log {
    public static trace(...msg: any[]): void {
        console.log(`<T> ${new Date().toLocaleString()}:`, ...msg);
    }

    public static info(...msg: any[]): void {
        console.info(`<I> ${new Date().toLocaleString()}:`, ...msg);
    }

    public static warn(...msg: any[]): void {
        console.warn(`<W> ${new Date().toLocaleString()}:`, ...msg);
    }

    public static error(...msg: any[]): void {
        console.error(`<E> ${new Date().toLocaleString()}:`, ...msg);
    }

    public static test(...msg: any[]): void {
        console.log(`<X> ${new Date().toLocaleString()}:`, ...msg);
    }
}

export function validateNumber(num: any) {
    if (typeof num !== "number") {
        throw new InsightError("Invalid value type, should be number");
    }
}

export function validateString(str: any) {
    if (typeof str !== "string") {
        throw new InsightError("Invalid value type, should be string");
    }
}

export function validateKey(key: string, kind: InsightDatasetKind) {
    let validKeys: string[];
    if (kind === InsightDatasetKind.Courses) {
        validKeys = ["dept", "id", "avg", "instructor", "title", "pass", "fail",
            "audit", "uuid", "year"];
    } else {
        validKeys = ["lat", "lon", "seats", "fullname", "shortname", "number",
            "name", "address", "type", "furniture", "href"];
    }
    if (validKeys.indexOf(key) === -1) {
        throw new InsightError("Invalid key in COLUMNS");
    }
}

export function validateNumberKey(key: string, kind: InsightDatasetKind) {
    let validKeys: string[];
    if (kind === InsightDatasetKind.Courses) {
        validKeys = ["avg", "pass", "fail", "audit", "year"];
    } else {
        validKeys = ["lat", "lon", "seats"];
    }
    if (validKeys.indexOf(key) === -1) {
        throw new InsightError("Invalid key type");
    }

}

export function validateStringKey(key: string, kind: InsightDatasetKind) {
    let validKeys: string[];
    if (kind === InsightDatasetKind.Courses) {
        validKeys = ["dept", "id", "instructor", "title", "uuid"];
    } else {
        validKeys = ["fullname", "shortname", "number", "name", "address",
            "type", "furniture", "href"];
    }
    if (validKeys.indexOf(key) === -1) {
        throw new InsightError("Invalid key type");
    }
}

export function getDatasets(): InsightDataset[] {
    let content: string;
    try {
        content = fs.readFileSync(__dirname + "/../data/map_file", "utf-8");
    } catch (err) {
        return [];
    }
    return JSON.parse(content);
}

export function loadData(id: string): InsightData[] {
    return JSON.parse(fs.readFileSync(__dirname + "/../data/" + id, "utf-8"));
}

// TODO: check if section is already in result
export function intersection(
    data1: Map<string, InsightData>,
    data2: Map<string, InsightData>
): Map<string, InsightData> {

    const resultMap = new Map<string, InsightData>();

    for (const k of [...data1.keys()]) {
        if (data2.has(k)) {
            resultMap.set(k, data1.get(k));
        }
    }
    return resultMap;
}

export function union(
    data1: Map<string, InsightData>,
    data2: Map<string, InsightData>
): Map<string, InsightData> {

    const merged = new Map([...data1, ...data2]);
    return merged;
}

export function subtract(
    data1: Map<string, InsightData>,
    data2: Map<string, InsightData>
): Map<string, InsightData> {

    const resultMap = new Map(data1);

    for (const k of [...data2.keys()]) {
        if (data1.has(k)) {
            resultMap.delete(k);
        }
    }
    return resultMap;
}
