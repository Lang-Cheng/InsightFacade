import { InsightError, ResultTooLargeError, InsightDatasetKind } from "./IInsightFacade";
import QueryRunner from "./QueryRunner";
import QueryValidator from "./QueryValidator";

export default class QueryController {
    public qv = new QueryValidator();
    public qr = new QueryRunner();

    public performQuery(rawQuery: any): object[] {
        let result: object[] = [];

        const { datasetId, kind } = this.qv.validateQuery(rawQuery);
        result = this.qr.runQuery(rawQuery, datasetId, kind);

        if (result.length <= 5000) {
            return result;
        } else {
            throw new ResultTooLargeError("Result must be no more than 5000");
        }
    }
}
