
import JSZip = require("jszip");
import { InsightDatasetKind } from "./IInsightFacade";

export default class DatasetController {

  public parametersValid(id: string, content: string, kind: InsightDatasetKind) {
    return this.isIdValid(id)
      && this.isContentValid(content)
      && this.isKindValid(kind);
  }

  /**
   * Check if dataset ID is valid.
   * Check if it's not null or undefined, has no white spaces, no underscores
   */
  public isIdValid(id: string): boolean {
    return id
      && (id.indexOf(" ") === -1)  // no white spaces
      && (id.indexOf("_") === -1);  // no underscores
  }

  private isKindValid(kind: InsightDatasetKind): boolean {
    return kind === InsightDatasetKind.Courses || kind === InsightDatasetKind.Rooms;
  }

  private isContentValid(content: string): boolean {
    return content  // not null or undefined
      && (content.indexOf(" ") === -1);  // no white spaces
  }
}
