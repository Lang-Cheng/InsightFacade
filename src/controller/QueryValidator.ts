import Log, {
    getDatasets, validateKey, validateNumber, validateNumberKey, validateString, validateStringKey
} from "../Util";
import {
    InsightApplyRule, InsightApplyToken, InsightDataset, InsightDatasetKind, InsightError, InsightFilter,
    InsightOptions, InsightQuery, InsightTransformations
} from "./IInsightFacade";
import QueryValidatorHelper from "./QueryValidatorHelper";

export default class QueryValidator {
    public datasets: InsightDataset[] = [];
    public datasetId: string = null;
    public kind: InsightDatasetKind = null;
    public transformationKeys: string[] = [];
    public qvh: QueryValidatorHelper;

    constructor() {
        this.qvh = new QueryValidatorHelper();
    }

    public validateQuery(rawQuery: any): { datasetId: string, kind: InsightDatasetKind } {
        this.datasets = getDatasets();
        this.datasetId = null;
        this.kind = null;
        this.transformationKeys = [];

        if (!rawQuery || typeof rawQuery !== "object") {
            throw new InsightError("Invalid format");
        }

        const query: InsightQuery = rawQuery;
        const length = Object.keys(query).length;

        if (!query.WHERE || !query.OPTIONS) {
            throw new InsightError("Missing WHERE || OPTIONS");
        }
        if (length > 3 || (length === 3 && !query.TRANSFORMATIONS)) {
            throw new InsightError("Excess keys in query");
        }
        if (typeof query.WHERE !== "object") {
            throw new InsightError("WHERE must be object");
        }
        if (typeof query.OPTIONS !== "object") {
            throw new InsightError("OPTIONS must be object");
        }

        if (query.TRANSFORMATIONS && typeof query.TRANSFORMATIONS !== "object") {
            throw new InsightError("TRANSFORMATIONS must be object");
        }

        if (query.TRANSFORMATIONS) {
            this.validateTransformations(query.TRANSFORMATIONS);
        }

        this.validateOptions(query.OPTIONS);
        if (Object.keys(query.WHERE).length === 0) {
            return { datasetId: this.datasetId, kind: this.kind };
        }
        this.validateFilter(query.WHERE);

        return { datasetId: this.datasetId, kind: this.kind };
    }

    private validateTransformations(transformations: InsightTransformations) {
        if (!transformations.APPLY || !transformations.GROUP) {
            throw new InsightError("TRANSFORMATIONS: missing APPLY | GROUP");
        }

        // TODO: maybe should check length since 2 GROUP objects are accepted
        if (Object.keys(transformations).length !== 2) {
            throw new InsightError("TRANSFORMATIONS: Excess keys");
        }

        this.validateGroup(transformations.GROUP);
        this.validateApply(transformations.APPLY);
    }

    private validateGroup(group: string[]) {
        if (!Array.isArray(group) || group.length < 1) {
            throw new InsightError("GROUP must be a non-empty array");
        }

        for (const key of group) {
            this.qvh.validateKeyFormat(key);
            const datasetId = key.split("_")[0];
            this.validateDataset(datasetId);
            this.transformationKeys.push(key);
        }
    }

    private validateApply(applyRules: InsightApplyRule[]) {
        if (!Array.isArray(applyRules)) {
            throw new InsightError("APPLY must be an array");
        }


        for (const applyRule of applyRules) {
            this.validateApplyRule(applyRule);
        }
    }

    private validateApplyRule(applyRule: InsightApplyRule) {
        if (typeof applyRule !== "object") {
            throw new InsightError("APPLY RULE: must be object");
        }
        if (Object.keys(applyRule).length !== 1) {
            throw new InsightError("APPLY RULE: must have 1 object");
        }

        const key = Object.keys(applyRule)[0];
        if (this.transformationKeys.indexOf(key) !== -1) {
            throw new InsightError("APPLY RULE: duplicate key");
        }
        if (key.indexOf("_") !== -1) {
            throw new InsightError("APPLY RULE: key can't have underscore");
        }
        if (key.trim().length === 0) {  // TODO: maybe don't check empty string
            throw new InsightError("APPLY RULE: key can't be empty");
        }
        this.transformationKeys.push(key);

        this.validateApplyToken(Object.values(applyRule)[0]);
    }

    private validateApplyToken(applyToken: InsightApplyToken) {
        if (typeof applyToken !== "object") {
            throw new InsightError("APPLY TOKEN: must be object");
        }
        if (Object.keys(applyToken).length !== 1) {
            throw new InsightError("APPLY TOKEN: must contain exactly 1 key");
        }
        if (!applyToken.MAX && !applyToken.AVG && !applyToken.SUM && !applyToken.MIN && !applyToken.COUNT) {
            throw new InsightError("APPLY TOKEN: invalid transformation operator");
        }

        // TODO: maybe handle courses_id_key_smth_large_many_underscores
        // const operator = Object.keys(applyToken)[0];
        const value = Object.values(applyToken)[0];
        this.qvh.validateKeyFormat(value);
        const datasetId = value.split("_")[0];
        const key = value.split("_")[1];
        this.validateDataset(datasetId);

        if (applyToken.COUNT) {
            validateKey(key, this.kind);
        } else {
            validateNumberKey(key, this.kind);
        }
    }

    private validateLogic(filters: InsightFilter[], name: string) {
        if (!Array.isArray(filters) || filters.length < 1) {
            throw new InsightError(name + " must be a non-empty array");
        }
        filters.forEach((f) => {
            if (typeof f !== "object") {
                throw new InsightError(name + "'s children must be object");
            }
            this.validateFilter(f);
        });
    }

    private validateFilter(filter: InsightFilter) {
        if (Object.keys(filter).length !== 1) {
            throw new InsightError("WHERE should only have 1 key");
        }
        switch (Object.keys(filter)[0]) {
            case "AND":
                this.validateLogic(filter.AND, "AND");
                break;
            case "OR":
                this.validateLogic(filter.OR, "OR");
                break;
            case "LT":
                const lt = filter.LT;
                this.validateComparison(lt, "LT");
                break;
            case "GT":
                const gt = filter.GT;
                this.validateComparison(gt, "GT");
                break;
            case "EQ":
                const eq = filter.EQ;
                this.validateComparison(eq, "EQ");
                break;
            case "IS":
                const is = filter.IS;
                this.validateComparison(is, "IS", false);
                break;
            case "NOT":
                const not = filter.NOT;
                if (typeof not !== "object") {
                    throw new InsightError("NOT must be object");
                }
                this.validateFilter(not);
                break;
            default:
                throw new InsightError("Invalid filter key");
        }
    }

    private validateComparison(op: object, name: string, numberCheck: boolean = true) {
        if (typeof op !== "object") {
            throw new InsightError(name + " must be object");
        }
        const entries = Object.entries(op);
        if (entries.length !== 1) {
            throw new InsightError(name + " must contain one entry");
        }
        const entry = entries[0];
        const datasetId = entry[0].split("_")[0];
        const key = entry[0].split("_")[1];
        const value = entry[1];
        this.validateDataset(datasetId);
        if (numberCheck) {
            validateNumberKey(key, this.kind);
            validateNumber(value);
        } else {
            validateStringKey(key, this.kind);
            validateString(value);
        }
    }

    private validateOptions(options: InsightOptions) {
        if (Object.keys(options).length === 1) {
            if (!options.COLUMNS) {
                throw new InsightError("OPTIONS missing COLUMNS");
            }
        } else if (Object.keys(options).length === 2) {
            if (!options.COLUMNS || !options.ORDER) {
                throw new InsightError("Invalid keys in OPTIONS");
            }
        } else {
            throw new InsightError("Invalid keys in OPTIONS");
        }

        this.validateColumns(options.COLUMNS);
        this.qvh.validateOrder(options.ORDER, options.COLUMNS);
    }

    private validateColumns(columns: string[]) {
        if (Array.isArray(columns) && columns.length === 0) {
            throw new InsightError("COLUMNS must be a non-empty array");
        }
        for (const c of columns) {
            if (typeof c !== "string") {
                throw new InsightError("Invalid type of COLUMN key");
            }
            if (this.transformationKeys.length === 0) {
                this.qvh.validateKeyFormat(c);
                const [datasetId, key] = c.split("_");
                this.validateDataset(datasetId);
                validateKey(key, this.kind);
            } else {
                if (this.transformationKeys.indexOf(c) === -1) {
                    throw new InsightError("Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present");
                }
            }
        }
    }

    private validateDataset(id: string) {
        const datasetIds = this.datasets.map((d) => d.id);
        const kinds = this.datasets.map((d) => d.kind);
        if (!this.datasetId) {  // if it's the first id encountered
            const i = datasetIds.indexOf(id);
            if (i === -1) {
                throw new InsightError("Query referenced dataset not added yet");
            }
            this.datasetId = id;
            this.kind = kinds[i];
        } else {
            if (this.datasetId !== id) {
                throw new InsightError("Cannot query more than one dataset");
            }
        }
    }
}
