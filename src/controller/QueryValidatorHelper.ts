
import {
    InsightError, InsightOrder
} from "./IInsightFacade";

export default class QueryValidatorHelper {

    public validateOrder(order: string | InsightOrder, columns: string[]) {
        if (typeof order === "string") {
            if (typeof order !== "string") {
                throw new InsightError("Invalid ORDER type");
            }
            if (columns.indexOf(order) === -1) {
                throw new InsightError("ORDER key must be in COLUMNS");
            }
        } else if (typeof order === "object") {
            if (!order.dir || !order.keys) {
                throw new InsightError("ORDER missing dir/keys key");
            }
            if (Object.keys(order).length !== 2) {
                throw new InsightError("Extra keys in ORDER");
            }
            this.validateDir(order.dir);
            this.validateOrderKeys(order.keys, columns);
        }
    }

    public validateKeyFormat(key: string) {
        const splitted = key.split("_");
        if (splitted.length !== 2) {
            throw new InsightError("Invalid COLUMNS value format");
        }
    }

    private validateDir(dir: string) {
        if (dir !== "UP" && dir !== "DOWN") {
            throw new InsightError("ORDER: wrong dir direction. Must be UP or DONW");
        }
    }

    private validateOrderKeys(keys: string[], columns: string[]) {
        if (!Array.isArray(keys) || keys.length === 0) {
            throw new InsightError("ORDER keys must be a non-empty array");
        }
        for (const key of keys) {
            if (typeof key !== "string") {
                throw new InsightError("Invalid ORDER type");
            }
            if (columns.indexOf(key) === -1) {
                throw new InsightError("ORDER key must be in COLUMNS");
            }
        }
    }
}
