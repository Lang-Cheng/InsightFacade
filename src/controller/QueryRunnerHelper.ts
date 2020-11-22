import {
    InsightSection, InsightRoom, InsightData,
    InsightDatasetKind, InsightError, InsightCourse
} from "./IInsightFacade";
import Log from "../Util";

export class QueryRunnerHelper {
    public kind: string;

    public getDataProp(key: string, data: InsightData): string | number {

        if (this.kind === InsightDatasetKind.Courses) {
            const section = data as InsightSection;
            return this.getSectionKey(key, section);
        } else {
            const room = data as InsightRoom;
            return this.getRoomKey(key, room);
        }
    }

    public getId(data: InsightData): string {
        if (this.kind === InsightDatasetKind.Courses) {
            return (data as InsightSection).uuid;
        } else {
            return (data as InsightRoom).name;
        }
    }

    private getSectionKey(key: string, section: InsightSection): string | number {
        switch (key) {
            case "dept":
                return section.dept;
            case "id":
                return section.id;
            case "avg":
                return section.avg;
            case "instructor":
                return section.instructor;
            case "title":
                return section.title;
            case "pass":
                return section.pass;
            case "fail":
                return section.fail;
            case "audit":
                return section.audit;
            case "uuid":
                return section.uuid;
            case "year":
                return section.year;
        }
    }

    private getRoomKey(key: string, room: InsightRoom): string | number {
        switch (key) {
            case "fullname":
                return room.fullname;
            case "shortname":
                return room.shortname;
            case "number":
                return room.number;
            case "name":
                return room.name;
            case "address":
                return room.address;
            case "lat":
                return room.lat;
            case "lon":
                return room.lon;
            case "seats":
                return room.seats;
            case "type":
                return room.type;
            case "furniture":
                return room.furniture;
            case "href":
                return room.href;
        }
    }

    public compareString(key: string, value: string, data: InsightData): InsightData {
        const prop = this.getDataProp(key, data);
        const propString = prop.toString();
        const astIndexes = this.allAsterisks(value);
        if (astIndexes.length === 0) {
            if (prop === value) {
                return data;
            }
        }
        if (astIndexes.length === 1) {
            if (astIndexes[0] === 0) {
                if (propString.slice(propString.length - value.length + 1, propString.length)
                    === value.slice(1, value.length)) {
                    return data;
                }
            } else if (astIndexes[0] === value.length - 1) {
                if (propString.slice(0, value.length - 1) === value.slice(0, value.length - 1)) {
                    return data;
                }
            } else {
                throw new InsightError("Asterisks (*) can only be the first or last characters of input strings");
            }
        }

        if (astIndexes.length === 2) {
            if (astIndexes[0] !== 0 || astIndexes[1] !== value.length - 1) {
                throw new InsightError("Asterisks (*) can only be the first or last characters of input strings");
            } else {
                if (propString.indexOf(value.slice(1, value.length - 1)) !== -1) {
                    return data;
                }
            }
        }

        if (astIndexes.length > 2) {
            throw new InsightError("Asterisks (*) can only be the first or last characters of input strings");
        }
    }

    private allAsterisks(key: string): number[] {
        const result = [];
        let i = key.indexOf("*");
        while (i !== -1) {
            result.push(i);
            i = key.indexOf("*", i + 1);
        }
        return result;
    }
}
