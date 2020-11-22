import { InsightCourse, InsightError, InsightFullSection, InsightSection } from "./IInsightFacade";

import JSZip = require("jszip");
export default class CoursesController {

    public sectionsFromZip(zip: JSZip): Promise<InsightSection[]> {
        const promises: any[] = [];
        const sections: InsightSection[] = [];

        const files = Object.keys(zip.folder("courses").files);

        return new Promise((resolve) => {
            for (const file of files) {
                const [folder, courseName] = file.split("/");
                if (folder === "courses" && courseName && this.isCourseNameValid(courseName)) {
                    promises.push(zip.folder("courses").file(courseName).async("text").then((data) => {
                        const sectionsFromData = this.sectionsFromData(data);
                        if (sectionsFromData) {
                            for (const s of sectionsFromData) {
                                sections.push(s);
                            }
                        }
                    }).catch((e) => {
                        throw new InsightError(e);
                    }));
                }
            }
            Promise.all(promises).then(() => {
                resolve(sections);
            });
        });
    }

    private sectionsFromData(courseData: string): InsightSection[] | null {
        try {
            const sections: InsightSection[] = [];
            const courseJson: InsightCourse = JSON.parse(courseData);

            if (!courseJson || !courseJson.result) {
                return null;
            }

            courseJson.result.forEach((section) => {
                if (this.isSectionValid(section)) {
                    sections.push(this.formatSection(section));
                }
            });

            return sections;
        } catch (e) {
            return null;
        }
    }

    private formatSection(s: InsightFullSection): InsightSection {
        const obj = {
            dept: s.Subject,
            id: s.Course,
            avg: s.Avg,
            instructor: s.Professor,
            title: s.Title,
            pass: s.Pass,
            fail: s.Fail,
            audit: s.Audit,
            uuid: s.id.toString(),
            year: typeof s.Year === "string" ? +s.Year : s.Year,
            section: s.Section
        };
        if (s.Section.toLowerCase() === "overall") {
            obj.year = 1900;
        }
        return obj;
    }

    private isCourseNameValid(courseName: string): boolean {
        return courseName
            && (courseName.indexOf(" ") === -1)  // no white spaces
            && (courseName.indexOf(".") === -1)  // no underscores
            && (courseName.indexOf(",") === -1);  // no underscores
    }

    // what the fuck
    private isSectionValid(arg: any): boolean {
        if (!arg
            || typeof arg.tier_eighty_five !== "number"
            || typeof arg.tier_ninety !== "number"
            || typeof arg.Title !== "string"
            || typeof arg.Section !== "string"
            || typeof arg.Detail !== "string"
            || typeof arg.tier_seventy_two !== "number"
            || typeof arg.Other !== "number"
            || typeof arg.Low !== "number"
            || typeof arg.tier_sixty_four !== "number"
            || typeof arg.id !== "number"
            || typeof arg.tier_sixty_eight !== "number"
            || typeof arg.tier_zero !== "number"
            || typeof arg.tier_seventy_six !== "number"
            || typeof arg.tier_thirty !== "number"
            || typeof arg.tier_fifty !== "number"
            || typeof arg.Professor !== "string"
            || typeof arg.Audit !== "number"
            || typeof arg.tier_g_fifty !== "number"
            || typeof arg.tier_forty !== "number"
            || typeof arg.Withdrew !== "number"
            || typeof arg.Year !== "number" && typeof arg.Year !== "string"
            || typeof arg.Year === "string" && isNaN(+arg.Year)
            || typeof arg.tier_twenty !== "number"
            || typeof arg.Stddev !== "number"
            || typeof arg.Enrolled !== "number"
            || typeof arg.tier_fifty_five !== "number"
            || typeof arg.tier_eighty !== "number"
            || typeof arg.tier_sixty !== "number"
            || typeof arg.tier_ten !== "number"
            || typeof arg.High !== "number"
            || typeof arg.Course !== "string"
            || typeof arg.Session !== "string"
            || typeof arg.Pass !== "number"
            || typeof arg.Fail !== "number"
            || typeof arg.Avg !== "number"
            || typeof arg.Campus !== "string"
            || typeof arg.Subject !== "string"
            || arg.length > 36) {
            return false;
        }
        return true;
    }
}
